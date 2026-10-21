# automatia-agency.com

Sitio de negocio de **Automatia Agency**, la actividad de Alexander Rosales como
empresario individual. Vende entregabilidad de correo en frío, montaje de
infraestructura y campañas hechas por el cliente. Se usa además para la
verificación de negocio de Payoneer, por eso lleva términos, privacidad,
reembolsos y datos de contacto completos.

## Qué hay aquí

| Archivo | Para qué |
|---|---|
| `index.html` | Portada en inglés: revisión de dominio, campañas hechas por ti, resultados, caso, precios, formulario |
| `es/index.html` | La misma portada en español |
| `contact.html` | Correo, dirección postal, horario, idiomas, procedimiento de quejas |
| `terms.html` | Términos de servicio |
| `privacy.html` | Política de privacidad (menciona la revisión de dominio y el formulario) |
| `refunds.html` | Política de reembolsos y cancelación |
| `style.css` | Estilos, línea visual tipo Apple. Inter servida desde `assets/fonts` |
| `assets/js/site.js` | Revisión de dominio por DNS (dns.google), formulario y animaciones, en los dos idiomas |
| `assets/og.png`, `assets/og-es.png` | Imágenes de vista previa para LinkedIn y otras redes |

Sin build ni dependencias. Las únicas peticiones a terceros son las de la
revisión de dominio, que van a Google Public DNS desde el navegador del visitante
y solo cuando pulsa el botón. Está explicado en la política de privacidad.

`?d=empresa.com` al final de la dirección abre la página con ese dominio ya
revisado: sirve para mandarle a un prospecto el chequeo de su propio dominio.

## Formulario de contacto

El formulario manda un POST a `/api/contact`. Traefik envía esa ruta, y solo esa,
al servicio Docker `automatia-contacto` (Node 20, sin dependencias):

- Código en el VPS: `/opt/automatia/contacto/server.js` (no está en este repositorio
  a propósito: todo lo que hay aquí se publica en nginx)
- Avisa por Telegram (@VigiWork_bot) y por correo vía ColdReach a alexrosales056@gmail.com
- Filtros: campo oculto contra robots, mínimo 3 segundos en la página, solo acepta
  envíos desde este dominio, 5 envíos por hora por conexión
- No guarda nada en disco

Ver los últimos envíos: `ssh root@107.174.96.104 'docker service logs --tail 20 automatia-contacto'`

## Cómo se publica

El servidor es el VPS propio (107.174.96.104), no Netlify.

- Los archivos viven en el VPS en `/opt/automatia/site`
- Los sirve un contenedor nginx, servicio Docker Swarm `automatia-web`
- Traefik enruta `automatia-agency.com` y `www.automatia-agency.com` con HTTPS
  de Let's Encrypt, definido en `/etc/easypanel/traefik/config/automatia.yaml`
  (la versión anterior al formulario quedó en `/opt/automatia/automatia.yaml.antes-contacto`)

Ese fichero de Traefik está **aparte de `main.yaml` a propósito**: EasyPanel
regenera `main.yaml` y se llevaría la ruta por delante. Traefik vigila el
directorio entero, así que un fichero propio se carga solo y sobrevive.

## Publicar un cambio

1. Editar el archivo aquí
2. Confirmar y subir con GitHub Desktop
3. El VPS trae los cambios solo (cron cada 5 minutos, `refrescar.sh`)

Para forzarlo sin esperar:

```
ssh root@107.174.96.104 '/opt/automatia/refrescar.sh'
```

## Cosas que no hay que romper

- **La dirección y el nombre tienen que coincidir con la cuenta de Payoneer.**
  Si cambia uno, cambian los dos, y aparecen en las cinco páginas y en `es/`.
- `alexander@automatia-agency.com` tiene que seguir recibiendo correo. El MX
  apunta a Namecheap PrivateEmail; tocar el registro A no lo afecta, pero
  borrar el MX sí.
- No meter analítica ni fuentes de otros servidores sin actualizar antes la
  política de privacidad.
- Las cifras de la portada son medidas reales. Si una cambia, se cambia en las
  dos versiones (`index.html` y `es/index.html`).
