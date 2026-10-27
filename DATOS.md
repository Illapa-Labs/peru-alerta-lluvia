**Español** | [English](DATOS.en.md)

# Datos y atribución

La licencia AGPL de este repositorio cubre el **código**, no los datos. Esta página lista de dónde viene cada dato, qué licencia o términos tiene según lo que se pudo comprobar, y qué falta confirmar. La revisión es del 26 de octubre de 2026. Si encuentras un error o una condición más reciente, abre un *issue*.

Este proyecto no es el dueño de estos datos ni los garantiza.

| Dato | Fuente | Licencia o términos | Atribución y estado |
|---|---|---|---|
| Avisos de lluvia, activación de quebradas y límites de distritos | [SENAMHI](https://www.senamhi.gob.pe) | No se encontró una licencia de reutilización publicada | **Pendiente:** se pedirá autorización por escrito a SENAMHI antes de redistribuir sus datos |
| Población de distritos y departamentos (Censo 2017) | INEI | No verificado | Se cita la fuente. **Pendiente:** verificar las condiciones de reutilización |
| Lluvia estimada por satélite (GOES-19) | NOAA, vía AWS Open Data | Datos públicos de NOAA (se pueden usar libremente) | Se pide atribución; no se debe sugerir respaldo de NOAA ni presentar datos modificados como originales. No se verificaron los términos específicos de este conjunto de datos |
| Lluvia de respaldo (IMERG) | NASA, vía GIBS | Los datos de NASA son CC0 por defecto | Se pide citar la fuente. No se leyeron los términos propios de GIBS |
| Pronóstico | [Open-Meteo](https://open-meteo.com) | CC BY 4.0; la API gratuita es solo para uso no comercial | Atribución obligatoria. El uso actual (sin anuncios ni suscripciones) cumple la condición no comercial |
| Contorno de los departamentos | Natural Earth | Dominio público | No se exige atribución |
| Mapa base (calles) | OpenFreeMap, con datos de OpenStreetMap y OpenMapTiles | Sus términos no dan una licencia clara ni piden atribución, y el servicio puede suspenderse | La atribución se muestra en el mapa. **Pendiente:** verificar la licencia de los datos y planear alojar mosaicos propios |
| Relieve | Mapzen / AWS Terrain Tiles | La atribución está en un documento del proyecto Joerd que no se leyó | Se muestra "Mapzen / AWS Terrain Tiles" en el mapa. **Pendiente** |

## Dependencias de software

Las bibliotecas usadas por el prototipo (MapLibre GL JS y otras) tienen licencias permisivas (BSD, MIT, ISC, Apache-2.0) o de dominio público, compatibles con la AGPL. Se volverán a revisar al migrar el código.

## Reconocimientos

Gracias al SENAMHI por publicar los avisos, y a los proyectos MapLibre, Open-Meteo, OpenStreetMap y Natural Earth, y a NOAA y NASA por abrir sus datos.
