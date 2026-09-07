# automatia-agency.com

Sitio de negocio de **Automatia Agency**, la actividad de Alexander Rosales como
empresario individual. Se usa además para la verificación de negocio de Payoneer,
por eso lleva términos, privacidad, reembolsos y datos de contacto completos.

## Qué hay aquí

| Archivo | Para qué |
|---|---|
| `index.html` | Qué hace el negocio, servicios, precios, trabajo hecho, datos del negocio |
| `contact.html` | Correo, dirección postal, horario, idiomas, procedimiento de quejas |
| `terms.html` | Términos de servicio |
| `privacy.html` | Política de privacidad |
| `refunds.html` | Política de reembolsos y cancelación |
| `style.css` | Estilos. Sin fuentes externas, sin analítica, sin peticiones a terceros |

Sitio estático puro. No hay build, no hay dependencias, no hay JavaScript.
Pesa unos 28 KB en total.

## Cómo se publica

El servidor es el VPS propio (107.174.96.104), no Netlify.

- Los archivos viven en el VPS en `/opt/automatia/site`
- Los sirve un contenedor nginx, servicio Docker Swarm `automatia-web`
- Traefik enruta `automatia-agency.com` y `www.automatia-agency.com` con HTTPS
  de Let's Encrypt, definido en `/etc/easypanel/traefik/config/automatia.yaml`

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
  Si cambia uno, cambian los dos, y aparecen en las cinco páginas.
- `alexander@automatia-agency.com` tiene que seguir recibiendo correo. El MX
  apunta a Namecheap PrivateEmail; tocar el registro A no lo afecta, pero
  borrar el MX sí.
- No meter analítica ni fuentes externas sin revisar la política de privacidad,
  que hoy dice que no hay ninguna.
