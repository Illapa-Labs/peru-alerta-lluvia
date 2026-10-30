**Español** | [English](README.en.md)

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="branding/chakana-mark-for-dark-backgrounds.svg">
    <img alt="Illapa Labs" src="branding/chakana-mark-for-light-backgrounds.svg" width="96">
  </picture>
</p>

# Perú Alerta Lluvia

[![Sitio](https://img.shields.io/badge/sitio-alerta.illapalabs.org-1F5FA8.svg)](https://alerta.illapalabs.org)
[![Licencia: AGPL v3](https://img.shields.io/badge/licencia-AGPL%20v3-blue.svg)](LICENSE)

**Sitio: [alerta.illapalabs.org](https://alerta.illapalabs.org)**

Mapa de las zonas del Perú con aviso de lluvias fuertes, con la información del SENAMHI. Muestra el aviso por departamento, provincia y distrito, cuánta gente vive en las zonas con aviso de activación de quebradas, la lluvia de las últimas horas y el pronóstico.

> **No es un sitio oficial.** La fuente de los avisos es el [SENAMHI](https://www.senamhi.gob.pe). Ante una emergencia llama al 115 (INDECI) o al 116 (Bomberos).

![El Perú con las zonas del aviso de lluvia del SENAMHI y la lluvia de las últimas horas sobre el mapa con relieve](docs/capturas/inicio.jpg)

Un proyecto de [Illapa Labs](https://github.com/Illapa-Labs): proyecto comunitario de código abierto, sin anuncios y sin fines de lucro.

## Qué muestra

### El aviso de tu departamento

Elige un departamento en el buscador o tocándolo en el mapa: el panel dice el nivel más alto del aviso, qué parte del departamento cubre cada nivel, qué hacer, y la lista de distritos con aviso con su población y cuánta gente vive en zonas donde pueden activarse las quebradas.

![Piura con aviso rojo: el nivel, qué parte del departamento cubre cada nivel, qué hacer y los distritos con aviso](docs/capturas/departamento.jpg)

### Hasta tu distrito

Tocando el mapa se baja de a un escalón: del departamento a la provincia, y de la provincia al distrito. Cada distrito muestra su aviso y qué hacer, y las migas de arriba llevan de vuelta.

![Tambo Grande (Piura) elegido: su aviso, qué hacer y los otros distritos de la provincia](docs/capturas/distrito.jpg)

### La lluvia: lo que cayó y lo que viene

Una barra recorre las últimas 24 horas de lluvia vista por satélite (NASA) y las próximas 24 del pronóstico (Open-Meteo), hora por hora, debajo de las zonas del aviso.

![La lluvia pronosticada para las próximas horas sobre las zonas del aviso](docs/capturas/lluvia.jpg)

### En el celular

Pensada para leerse rápido y con conexión lenta: el panel se muestra antes que el mapa, que es lo más pesado.

<p align="center"><img alt="La web en un celular: el mapa arriba y el aviso de Lima abajo" src="docs/capturas/celular.jpg" width="300"></p>

## Estado y hoja de ruta

En construcción. La web es un sitio estático y ligero: el aviso, los distritos y el pronóstico los pide a la [API de Illapa](https://github.com/Illapa-Labs/illapa-engine), y en el sitio solo quedan los límites de los departamentos y las formas de los distritos, que casi no cambian.

| Etapa | Estado |
|---|---|
| Repositorio con licencia AGPL, guías y flujo de ramas | Hecho |
| Documentar las fuentes de datos y su licencia ([DATOS.md](DATOS.md)) | En curso |
| Migrar el código del prototipo y leer los datos de la API | Hecho |
| API de Illapa (`illapa-engine`): aviso, distritos y pronóstico | Hecho |
| Lluvia del satélite GOES-19 desde la API (por ahora se usa la de la NASA) | Pendiente |
| Publicar la API (`api.illapalabs.org`) y la web (`alerta.illapalabs.org`) | Hecho; falta retirar el prototipo anterior |
| Kit de investigación (`illapa-research`) | Pendiente |

## Correr en local

Necesitas [Bun](https://bun.sh) y la [API de Illapa](https://github.com/Illapa-Labs/illapa-engine) corriendo en `http://127.0.0.1:8080` (ver su README).

```bash
bun install
bun run start
```

La dirección de la API está en `.env.development` (en local) y `.env.production` (al construir el sitio). Antes de enviar cambios: `bun run typecheck` y `bun run build`.

## Publicar

El sitio está en https://alerta.illapalabs.org: son archivos estáticos en Cloudflare (`wrangler.jsonc`), sin código en el servidor.

Se publica solo: Cloudflare (Workers Builds) construye y publica cada cambio que llega a `main`, y cada *pull request* recibe una dirección de vista previa, sin tocar la versión pública. Para publicar a mano, por ejemplo si Workers Builds falla:

```bash
bun run build
npx wrangler deploy
```

## Datos y atribución

Los avisos, la población, la lluvia de satélite, el pronóstico y el mapa base vienen de fuentes de terceros, cada una con sus propios términos. Están listadas, con su estado, en [DATOS.md](DATOS.md). Este proyecto no es el dueño de esos datos ni los garantiza.

## Licencia

Este programa es software libre: se distribuye bajo la [GNU Affero General Public License, versión 3 o posterior](LICENSE) (`AGPL-3.0-or-later`).

Si usas este código, o una versión modificada, para ofrecer un servicio por red, debes ofrecer su código fuente completo a los usuarios de ese servicio, también bajo la AGPL.

La licencia cubre el código de este repositorio, **no los datos**. Los datos tienen la licencia de cada fuente.

## Cómo colaborar

Lee [CONTRIBUTING.md](CONTRIBUTING.md): explica qué ayuda más, cómo enviar cambios y el flujo de ramas. Todas las personas que participan se comprometen a respetar el [Código de Conducta](CODE_OF_CONDUCT.md).

## Contacto

contacto@illapalabs.org
