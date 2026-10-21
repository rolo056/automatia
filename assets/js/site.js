// Comprobador de dominio, formulario de contacto y animaciones. Funciona en ingles y en espanol
// segun <html lang>. El comprobador lee DNS publico con Google Public DNS (dns.google) desde el
// navegador; el formulario envia a /api/contact en este mismo sitio. Todo texto externo va con textContent.
(function () {
  "use strict";

  var ES = (document.documentElement.lang || "en").slice(0, 2) === "es";
  var DOH = "https://dns.google/resolve";
  var CONTACT = "alexander@automatia-agency.com";
  var MAX_QUERIES = 50;
  var queries = 0;
  var loadedAt = Date.now();

  var T = ES ? {
    stamp: { pass: "Bien", warn: "Revisar", fail: "Roto", info: "Info" },
    spfMissing: ["SPF no existe", "No hay registro SPF, así que nadie puede saber qué servidores pueden enviar por este dominio."],
    spfTwo: function (n) { return ["Dos registros SPF", "Hay " + n + " registros SPF. Los servidores lo toman como error, que es igual a no tener ninguno. Hay que unirlos en uno."]; },
    spfOver: function (n) { return ["SPF pasado del límite", "Tu SPF necesita " + n + " consultas DNS. Por encima de 10 falla, en silencio, en cada correo que envías."]; },
    spfOk: function (n, plus) { return ["SPF encontrado", "Un solo registro SPF, bien escrito." + (n == null ? "" : " Usa " + n + " de las 10 consultas permitidas.") + (plus ? " Termina en \"+all\", que deja a cualquier servidor enviar como tú. Hay que corregirlo." : "")]; },
    dkimBroken: function (s, start) { return ["La clave DKIM parece rota", "La clave de \"" + s + "\" empieza con \"" + start + "\" en lugar de v=DKIM1. Casi siempre se pegó algo de más. Los servidores la leen como una firma rota."]; },
    dkimRevoked: function (s) { return ["Clave DKIM revocada", "La clave de \"" + s + "\" está vacía, o sea, revocada. Si todavía envías con ese servicio, firma con nada."]; },
    dkimOk: function (list) { return ["Clave DKIM encontrada", "Está en: " + list + ". Si de verdad firma tus correos solo se ve en los encabezados de un correo real."]; },
    dkimNone: ["Sin DKIM en los nombres comunes", "No encontré una clave DKIM con los nombres habituales. Tu proveedor puede usar uno propio, pero conviene confirmar que todo lo que envía por ti firme con DKIM."],
    dmarcMissing: ["DMARC no existe", "No hay registro DMARC. Gmail y Yahoo lo exigen a quien envía mucho, y sin él nadie te avisa cuando alguien falla la autenticación en tu nombre."],
    dmarcTwo: ["Dos registros DMARC", "Más de un registro DMARC hace que los servidores los ignoren todos. Deja uno."],
    dmarcNoRua: function (p, via) { return ["Los informes DMARC no llegan a nadie", "DMARC está en p=" + p + via + ", pero no tiene dirección rua, así que nunca ves quién falla en tu nombre."]; },
    dmarcNone: function (via) { return ["DMARC solo está mirando", "DMARC está en p=none" + via + ": informa problemas pero no protege nada. Está bien para empezar; conviene endurecerlo cuando los informes salgan limpios."]; },
    dmarcOk: function (p, via) { return ["DMARC aplicándose", "DMARC está en p=" + p + via + " y manda informes. Es la configuración fuerte."]; },
    via: function (d) { return " (heredado de " + d + ")"; },
    noMx: ["Sin bandeja de entrada", "Este dominio no recibe correo. Es normal en un dominio solo para enviar, pero las respuestas necesitan llegar a algún lado."],
    mx: function (prov, host) { return ["Correo manejado por " + (prov || "tu propio servidor"), "El correo que entra a este dominio va a " + host + "."]; },
    allGood: "Desde afuera el sobre se ve bien. Cuando el DNS está limpio y el correo igual cae en spam, la causa suele ser la lista o la forma de enviar: rebotes, quejas, volumen por bandeja. Eso se ve adentro de tu herramienta de envío.",
    h: { domain: "Dominio", inbox: "Correo", none: "ninguno", missing: "no existe", found: "encontrado", two: "2+ registros", lookups: "/10 consultas", noSel: "no está en los nombres comunes", rep: " · con informes", norep: " · sin informes" },
    firstFix: "Lo primero que arreglaría",
    emailMe: "Mándame este resultado",
    again: "Revisar otro dominio",
    limits: "Esto lee solo el DNS público. No ve tu historial de envíos, listas negras, quejas ni dónde caen de verdad tus correos. Eso necesita una prueba real, y es lo que cubre la auditoría.",
    badDomain: "Eso no parece un dominio. Prueba con algo como tuempresa.com.",
    dnsDown: "No pude conectar con el servicio de DNS. Prueba en un momento, o mándame el dominio y lo reviso a mano.",
    busy: "Revisando…",
    subj: function (d) { return "Revisión de dominio: " + d; },
    bodyHead: function (d) { return "Revisión del dominio " + d; },
    bodyFix: "Lo primero a arreglar: ",
    bodyAsk: "En qué necesito ayuda:\n",
    f: { sending: "Enviando…", ok: "Listo. Te respondo por escrito en un día hábil.", rate: "Llegaron muchos mensajes desde tu conexión. Prueba más tarde o escríbeme a " + CONTACT + ".", err: "No se pudo enviar. Escríbeme directo a " + CONTACT + ".", invalid: "Revisa tu correo y cuéntame un poco más en el mensaje." }
  } : {
    stamp: { pass: "Looks right", warn: "Check this", fail: "Broken", info: "Info" },
    spfMissing: ["SPF missing", "There's no SPF record, so receivers can't tell which servers may send for this domain."],
    spfTwo: function (n) { return ["Two SPF records", "There are " + n + " SPF records. Receivers treat that as an error, which is the same as having none. Merge them into one."]; },
    spfOver: function (n) { return ["SPF over the limit", "Your SPF needs " + n + " DNS lookups. Above 10 it fails, silently, for every email you send."]; },
    spfOk: function (n, plus) { return ["SPF found", "One SPF record, written correctly." + (n == null ? "" : " It uses " + n + " of the 10 DNS lookups allowed.") + (plus ? " It ends in \"+all\", which lets any server send as you. That needs fixing." : "")]; },
    dkimBroken: function (s, start) { return ["DKIM key looks broken", "The key at \"" + s + "\" starts with \"" + start + "\" instead of v=DKIM1. Usually something extra was pasted in. Receivers read it as a broken signature."]; },
    dkimRevoked: function (s) { return ["DKIM key revoked", "The key at \"" + s + "\" is empty, which means revoked. If you still send through that service, it signs with nothing."]; },
    dkimOk: function (list) { return ["DKIM key found", "Found at: " + list + ". Whether it actually signs your mail shows up only in a real email's headers."]; },
    dkimNone: ["No DKIM at common names", "I couldn't find a DKIM key under the usual selector names. Your provider may use a custom one, but it's worth confirming every tool that sends for you signs with DKIM."],
    dmarcMissing: ["DMARC missing", "No DMARC record. Gmail and Yahoo require one from bulk senders, and without it nobody tells you when someone fails authentication as you."],
    dmarcTwo: ["Two DMARC records", "More than one DMARC record means receivers ignore all of them. Keep one."],
    dmarcNoRua: function (p, via) { return ["DMARC reports go nowhere", "DMARC is set to p=" + p + via + ", but there's no rua address, so you never see who is failing as you."]; },
    dmarcNone: function (via) { return ["DMARC is only watching", "DMARC is set to p=none" + via + ": it reports problems but protects nothing. Fine to start; worth tightening once the reports are clean."]; },
    dmarcOk: function (p, via) { return ["DMARC enforcing", "DMARC is set to p=" + p + via + " and sends reports. That's the strong setting."]; },
    via: function (d) { return " (inherited from " + d + ")"; },
    noMx: ["No inbox here", "This domain doesn't receive email. That's normal for a pure sending domain, but replies need somewhere to land."],
    mx: function (prov, host) { return ["Mail handled by " + (prov || "your own server"), "Inbound mail for this domain goes to " + host + "."]; },
    allGood: "Your envelope looks right from the outside. When the DNS is clean and mail still lands in spam, the cause is usually the list or the sending pattern: bounces, complaints, volume per inbox. Those need a look inside your sending tool.",
    h: { domain: "Domain", inbox: "Inbox", none: "none", missing: "missing", found: "found", two: "2+ records", lookups: "/10 lookups", noSel: "not at common selectors", rep: " · reports on", norep: " · no reports" },
    firstFix: "First thing I'd fix",
    emailMe: "Email me this result",
    again: "Check another domain",
    limits: "This reads public DNS only. It can't see your sending history, blocklists, complaint rate or where your mail actually lands. That part needs a real test, and it's what the audit covers.",
    badDomain: "That doesn't look like a domain. Try something like yourcompany.com.",
    dnsDown: "I couldn't reach the DNS service just now. Try again in a moment, or email me the domain and I'll check it by hand.",
    busy: "Checking…",
    subj: function (d) { return "Domain check: " + d; },
    bodyHead: function (d) { return "Domain check for " + d; },
    bodyFix: "First thing to fix: ",
    bodyAsk: "What I'd like help with:\n",
    f: { sending: "Sending…", ok: "Got it. You'll have a written answer within one business day.", rate: "Too many messages from your connection. Try again later or write to " + CONTACT + ".", err: "That didn't go through. Please write to " + CONTACT + " directly.", invalid: "Check your email address and tell me a little more in the message." }
  };

  // Selectores DKIM habituales: Google, Microsoft 365, Mailchimp/Mailgun, SendGrid, Zoho y genericos.
  var SELECTORS = ["google", "selector1", "selector2", "k1", "k2", "s1", "s2", "smtp", "mail",
    "dkim", "default", "zoho", "zmail", "mailjet", "mandrill", "hs1", "hs2", "pm", "mxvault", "everlytickey1"];

  var PROVIDERS = [
    [/google\.com\.?$|googlemail\.com\.?$/i, "Google Workspace"],
    [/mail\.protection\.outlook\.com\.?$/i, "Microsoft 365"],
    [/zoho\.(com|eu|in)\.?$/i, "Zoho Mail"],
    [/pphosted\.com\.?$/i, "Proofpoint"],
    [/mimecast\.com\.?$/i, "Mimecast"],
    [/privateemail\.com\.?$/i, "Namecheap Private Email"],
    [/secureserver\.net\.?$/i, "GoDaddy"],
    [/hostinger\.com\.?$/i, "Hostinger"],
    [/yahoodns\.net\.?$/i, "Yahoo"],
    [/mailgun\.org\.?$/i, "Mailgun"],
    [/icloud\.com\.?$/i, "iCloud"],
    [/messagingengine\.com\.?$/i, "Fastmail"]
  ];

  function q(name, type) {
    queries += 1;
    if (queries > MAX_QUERIES) return Promise.reject(new Error("limit"));
    var url = DOH + "?name=" + encodeURIComponent(name) + "&type=" + type;
    return fetch(url, { headers: { accept: "application/dns-json" } }).then(function (r) {
      if (!r.ok) throw new Error("dns");
      return r.json();
    });
  }

  // TXT puede venir partido en varios trozos entre comillas; se unen.
  function txts(json) {
    return (json.Answer || []).filter(function (a) { return a.type === 16; }).map(function (a) {
      var d = String(a.data || "").trim();
      if (d.charAt(0) === '"') d = d.replace(/"\s*"/g, "").replace(/^"|"$/g, "");
      return d;
    });
  }

  function cleanDomain(raw) {
    var d = String(raw || "").trim().toLowerCase();
    d = d.replace(/^[a-z]+:\/\//, "").replace(/^[^@\/]*@/, "").split(/[\/?#:]/)[0].replace(/^www\./, "").replace(/\.$/, "");
    return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(d) ? d : null;
  }

  // Cuenta las busquedas DNS de SPF siguiendo include y redirect. El limite del estandar es 10.
  function spfCount(domain, depth, seen) {
    if (depth > 8 || seen[domain]) return Promise.resolve(0);
    seen[domain] = true;
    return q(domain, "TXT").then(function (j) {
      var rec = txts(j).filter(function (t) { return /^v=spf1(\s|$)/i.test(t); })[0];
      if (!rec) return 0;
      var count = 0, subs = [];
      rec.split(/\s+/).slice(1).forEach(function (term) {
        var t = term.replace(/^[+\-~?]/, "").toLowerCase();
        if (t.indexOf("include:") === 0) { count += 1; subs.push(t.slice(8)); }
        else if (t.indexOf("redirect=") === 0) { count += 1; subs.push(t.slice(9)); }
        else if (/^(a|mx|ptr)([:\/]|$)/.test(t) || t.indexOf("exists:") === 0) { count += 1; }
      });
      return Promise.all(subs.map(function (s) { return spfCount(s, depth + 1, seen).catch(function () { return 0; }); }))
        .then(function (n) { return n.reduce(function (a, b) { return a + b; }, count); });
    });
  }

  function tags(rec) {
    var out = {};
    rec.split(";").forEach(function (p) {
      var i = p.indexOf("=");
      if (i > 0) out[p.slice(0, i).trim().toLowerCase()] = p.slice(i + 1).trim();
    });
    return out;
  }

  function checkDomain(domain) {
    queries = 0;
    var r = { domain: domain };

    var mx = q(domain, "MX").then(function (j) {
      var hosts = (j.Answer || []).filter(function (a) { return a.type === 15; })
        .map(function (a) { return String(a.data).split(/\s+/).pop(); });
      r.mxHosts = hosts;
      r.provider = null;
      hosts.some(function (h) {
        return PROVIDERS.some(function (p) { if (p[0].test(h)) { r.provider = p[1]; return true; } return false; });
      });
    });

    var spf = q(domain, "TXT").then(function (j) {
      var recs = txts(j).filter(function (t) { return /^v=spf1(\s|$)/i.test(t); });
      r.spfRecords = recs;
      if (recs.length === 1) {
        r.spfAll = (recs[0].match(/[+\-~?]?all\b/i) || [""])[0];
        return spfCount(domain, 0, {}).then(function (n) { r.spfLookups = n; }).catch(function () { r.spfLookups = null; });
      }
    });

    var dmarc = q("_dmarc." + domain, "TXT").then(function (j) {
      var recs = txts(j).filter(function (t) { return /^v=DMARC1/i.test(t); });
      if (!recs.length && domain.split(".").length > 2) {
        var parent = domain.split(".").slice(1).join(".");
        return q("_dmarc." + parent, "TXT").then(function (j2) {
          r.dmarcRecords = txts(j2).filter(function (t) { return /^v=DMARC1/i.test(t); });
          r.dmarcFrom = parent;
        });
      }
      r.dmarcRecords = recs;
    });

    var dkim = Promise.all(SELECTORS.map(function (s) {
      return q(s + "._domainkey." + domain, "TXT").then(function (j) {
        var t = txts(j).filter(function (x) { return /p=|v=DKIM1/i.test(x); })[0];
        return t ? { selector: s, text: t } : null;
      }).catch(function () { return null; });
    })).then(function (list) { r.dkim = list.filter(Boolean); });

    return Promise.all([mx, spf, dmarc, dkim]).then(function () { return r; });
  }

  function item(s, pair, w) { return { s: s, t: pair[0], p: pair[1], w: w }; }

  // Convierte lo que dice el DNS en veredictos legibles. "Encontrado" no es "aprobado": eso solo se ve en un correo real.
  function judge(r) {
    var out = [];
    if (!r.spfRecords.length) out.push(item("fail", T.spfMissing, 100));
    else if (r.spfRecords.length > 1) out.push(item("fail", T.spfTwo(r.spfRecords.length), 95));
    else if (r.spfLookups != null && r.spfLookups > 10) out.push(item("fail", T.spfOver(r.spfLookups), 90));
    else {
      var plus = /^\+?all$/i.test(r.spfAll);
      out.push(item(plus ? "fail" : "pass", T.spfOk(r.spfLookups, plus), plus ? 92 : 0));
    }

    var broken = r.dkim.filter(function (k) { return !/^\s*(v=DKIM1|k=|p=|t=|h=|s=|n=)/i.test(k.text); });
    var revoked = r.dkim.filter(function (k) { return /(^|;)\s*p=\s*(;|$)/i.test(k.text); });
    if (broken.length) out.push(item("fail", T.dkimBroken(broken[0].selector, broken[0].text.slice(0, 14)), 88));
    else if (revoked.length && revoked.length === r.dkim.length) out.push(item("warn", T.dkimRevoked(revoked[0].selector), 70));
    else if (r.dkim.length) out.push(item("pass", T.dkimOk(r.dkim.map(function (k) { return "\"" + k.selector + "\""; }).join(", ")), 0));
    else out.push(item("warn", T.dkimNone, 60));

    var dm = r.dmarcRecords || [];
    if (!dm.length) out.push(item("fail", T.dmarcMissing, 85));
    else if (dm.length > 1) out.push(item("fail", T.dmarcTwo, 84));
    else {
      var tg = tags(dm[0]);
      var pol = (tg.p || "").toLowerCase();
      var via = r.dmarcFrom ? T.via(r.dmarcFrom) : "";
      if (!tg.rua) out.push(item("warn", T.dmarcNoRua(pol || "?", via), pol === "none" ? 55 : 45));
      else if (pol === "none") out.push(item("warn", T.dmarcNone(via), 40));
      else out.push(item("pass", T.dmarcOk(pol, via), 0));
    }

    if (!r.mxHosts || !r.mxHosts.length) out.push(item("info", T.noMx, 0));
    else out.push(item("info", T.mx(r.provider, r.mxHosts[0].replace(/\.$/, "")), 0));
    return out;
  }

  function firstFix(list) {
    var worst = list.slice().sort(function (a, b) { return b.w - a.w; })[0];
    return (!worst || worst.w === 0) ? T.allGood : worst.t + ". " + worst.p;
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function line(box, k, v) {
    var row = document.createElement("div");
    row.appendChild(el("span", "k", (k + ":").padEnd(10, " ")));
    row.appendChild(document.createTextNode(" " + v));
    box.appendChild(row);
  }

  function render(r, list) {
    var box = document.getElementById("result");
    box.textContent = "";
    var H = T.h;

    var head = el("div", "headers");
    line(head, H.domain, r.domain);
    line(head, H.inbox, r.provider || (r.mxHosts && r.mxHosts.length ? r.mxHosts[0].replace(/\.$/, "") : H.none));
    line(head, "SPF", r.spfRecords.length ? (r.spfRecords.length > 1 ? H.two : H.found + (r.spfLookups != null ? " · " + r.spfLookups + H.lookups : "")) : H.missing);
    line(head, "DKIM", r.dkim.length ? r.dkim.map(function (k) { return k.selector; }).join(", ") : H.noSel);
    var dm = r.dmarcRecords && r.dmarcRecords.length ? tags(r.dmarcRecords[0]) : null;
    line(head, "DMARC", dm ? "p=" + (dm.p || "?") + (dm.rua ? H.rep : H.norep) : H.missing);
    box.appendChild(head);

    var ul = el("ul", "checks");
    list.forEach(function (c) {
      var li = document.createElement("li");
      var stampWrap = document.createElement("div");
      stampWrap.appendChild(el("span", "rubber " + c.s, T.stamp[c.s]));
      var body = document.createElement("div");
      body.appendChild(el("h4", null, c.t));
      body.appendChild(el("p", null, c.p));
      li.appendChild(stampWrap); li.appendChild(body);
      ul.appendChild(li);
    });
    box.appendChild(ul);

    var ff = firstFix(list);
    var fix = el("div", "first-fix");
    fix.appendChild(el("span", "tag", T.firstFix));
    fix.appendChild(el("p", null, ff));
    box.appendChild(fix);

    var summary = T.bodyHead(r.domain) + "\n\n" + list.map(function (c) { return "- " + c.t + ": " + c.p; }).join("\n") +
      "\n\n" + T.bodyFix + ff + "\n\n" + T.bodyAsk;
    var actions = el("div", "result-actions");
    var mail = el("a", "btn", T.emailMe);
    mail.href = "mailto:" + CONTACT + "?subject=" + encodeURIComponent(T.subj(r.domain)) + "&body=" + encodeURIComponent(summary);
    var again = el("button", "btn btn-ghost", T.again);
    again.type = "button";
    again.addEventListener("click", function () {
      box.classList.remove("on"); box.textContent = "";
      var i = document.getElementById("domain"); i.value = ""; i.focus();
    });
    actions.appendChild(mail); actions.appendChild(again);
    box.appendChild(actions);

    box.appendChild(el("p", "limits", T.limits));
    box.classList.add("on");

    // Si el visitante usa el formulario despues, se lleva el dominio ya escrito.
    var fd = document.getElementById("f-domain");
    if (fd && !fd.value) fd.value = r.domain;
  }

  function fail(msg) {
    var box = document.getElementById("result");
    box.textContent = "";
    box.appendChild(el("p", "err", msg));
    box.classList.add("on");
  }

  var form = document.getElementById("check-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("domain");
      var btn = document.getElementById("check-btn");
      var d = cleanDomain(input.value);
      if (!d) { fail(T.badDomain); input.focus(); return; }
      input.value = d;
      btn.disabled = true;
      var label = btn.firstChild.nodeValue;
      btn.firstChild.nodeValue = T.busy;
      checkDomain(d).then(function (r) { render(r, judge(r)); })
        .catch(function () { fail(T.dnsDown); })
        .then(function () { btn.disabled = false; btn.firstChild.nodeValue = label; });
    });
  }

  // Enlace con el dominio ya cargado (?d=empresa.com): sirve para mandarle a un prospecto su propio chequeo.
  var pre = cleanDomain(new URLSearchParams(location.search).get("d"));
  if (pre && form) {
    document.getElementById("domain").value = pre;
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true }));
  }

  // Formulario de contacto: envia a /api/contact en este mismo dominio.
  var cf = document.getElementById("contact-form");
  if (cf) {
    cf.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = document.getElementById("f-status");
      var btn = cf.querySelector("button[type=submit]");
      var data = {
        name: cf.elements.name.value, email: cf.elements.email.value, domain: cf.elements.domain.value,
        need: cf.elements.need.value, message: cf.elements.message.value, website: cf.elements.website.value,
        lang: ES ? "es" : "en", t: Date.now() - loadedAt
      };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || data.message.trim().length < 10) {
        msg.className = "f-status err"; msg.textContent = T.f.invalid; return;
      }
      btn.disabled = true; msg.className = "f-status"; msg.textContent = T.f.sending;
      fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) })
        .then(function (r) {
          if (r.ok) { msg.className = "f-status ok"; msg.textContent = T.f.ok; cf.reset(); return; }
          msg.className = "f-status err"; msg.textContent = r.status === 429 ? T.f.rate : (r.status === 400 ? T.f.invalid : T.f.err);
        })
        .catch(function () { msg.className = "f-status err"; msg.textContent = T.f.err; })
        .then(function () { btn.disabled = false; });
    });
  }

  // Entrada suave de secciones; sin efecto si el visitante pidio menos movimiento.
  var items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach(function (n) { n.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    items.forEach(function (n) { io.observe(n); });
  }
})();
