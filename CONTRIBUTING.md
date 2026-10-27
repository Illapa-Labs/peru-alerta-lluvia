**Español** | [English](CONTRIBUTING.en.md)

# Cómo colaborar

Gracias por querer ayudar. Este es un proyecto comunitario de código abierto: no tiene anuncios, no se monetiza y busca ser útil para quien vive o viaja por zonas de lluvias fuertes en el Perú.

Al participar aceptas el [Código de Conducta](CODE_OF_CONDUCT.md).

## Qué ayuda más

- Avisar de errores o datos que se ven mal, con una captura y el lugar o distrito.
- Mejorar la claridad de los textos: el aviso lo lee gente con prisa y con conexión lenta.
- Accesibilidad, rendimiento en celulares y en 3G.
- Revisar y documentar las licencias y la atribución de las fuentes de datos.
- Código: pequeñas mejoras y correcciones.

## Antes de empezar

1. Busca si ya existe un *issue* sobre lo mismo.
2. Si es un cambio grande, abre un *issue* primero para conversarlo y no perder trabajo.
3. Haz un *fork*, crea una rama con un nombre corto (`arregla-lista-distritos`) y envía un *pull request*.

## Ramas y flujo de trabajo

Usamos [GitHub Flow](https://docs.github.com/es/get-started/using-github/github-flow): una sola rama principal y ramas cortas por cambio.

- `main` es la rama de producción: siempre debe compilar y poder desplegarse. Está protegida y no se escribe en ella directamente.
- No hay rama `develop`. Cada cambio va en una rama creada desde `main`, con un nombre del tipo `tipo/descripcion-corta`: `feat/district-list`, `fix/search-accents`, `docs/readme-update`.
- Si no formas parte del equipo, trabaja desde tu *fork* y envía el *pull request* a `main`.
- Las ramas viven días, no semanas, y los *pull requests* son pequeños y con un solo propósito.
- Para fusionar, un *pull request* necesita al menos una aprobación y que la revisión automática (tipos y *build*) pase. Se fusiona con *squash merge*, así que el título del *pull request* debe seguir Conventional Commits en inglés: será el mensaje del commit en `main`.
- Cuando esté configurado, cada *pull request* tendrá una dirección de vista previa para probar el cambio en un sitio real antes de fusionarlo.

## Licencia de tus aportes

El proyecto se distribuye bajo la [AGPL-3.0-or-later](LICENSE). Al enviar un aporte aceptas que se publique bajo esa misma licencia. No pedimos cesión de derechos: sigues siendo la persona autora de lo que escribes.

No incluyas código ni datos que no puedas publicar bajo la AGPL (por ejemplo, copiado de un proyecto con otra licencia incompatible o con datos sin permiso de redistribución). Si dudas, pregunta en el *issue*.

## Datos y fuentes

- No añadas datos sin indicar su fuente y su licencia.
- Los avisos son del SENAMHI y se muestran tal como los publica. No los reinterpretamos como si fueran oficiales ni cambiamos su nivel.
- Los datos personales de nadie van en este repositorio.

## Estilo de código

- Los mensajes de commit siguen [Conventional Commits](https://www.conventionalcommits.org) y se escriben en inglés, por ejemplo `feat(panel): add the district list`.
- Los nombres en el código y los comentarios técnicos van en inglés. Un comentario puede ir en español cuando explica una regla local (niveles del SENAMHI, códigos de ubigeo).
- Los textos que se muestran a las personas usan `textContent`: los datos externos nunca se interpretan como HTML.
- Antes de enviar, comprueba que el proyecto compila y pasa la revisión de tipos (los comandos exactos estarán aquí cuando el código esté migrado).

## Seguridad

Si encuentras un problema de seguridad, no lo publiques en un *issue*: escribe a contacto@illapalabs.org.
