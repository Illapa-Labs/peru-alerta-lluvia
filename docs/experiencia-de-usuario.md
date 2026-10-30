**Español** | [English](experiencia-de-usuario.en.md)

# Experiencia de usuario: quién la usa y qué necesita

Este documento define para quién es Perú Alerta Lluvia y qué tiene que poder hacer cada persona, antes de decidir cómo se ve. Cada cambio de diseño debería poder explicarse con alguno de los recorridos de aquí.

## Cómo se hizo

Se sigue el método de Google con **recorridos críticos del usuario** (*critical user journeys*, CUJ): un usuario, que tiene una meta, y las tareas que hace para llegar a ella, contado desde su lado («Como vecina de una quebrada quiero saber si hoy hay peligro»). Se escogen entre cinco y siete, de dos tipos:

- **Frecuentes** (*toothbrush*, «como lavarse los dientes»): los que se hacen seguido y tienen que ser rapidísimos.
- **Cruciales** (*pivotal*): los que se hacen pocas veces, pero cuando se hacen importan mucho.

Con los recorridos se decide qué va primero en la pantalla, qué se prueba antes de publicar y qué se mide después. Para medir se usa una versión de **HEART** (el marco del equipo de experiencia de usuario de Google: satisfacción, participación, adopción, retención y tarea cumplida), recortada a lo que se puede saber sin cookies ni datos personales.

Esto es una definición de trabajo, hecha desde lo que se sabe del aviso y de quienes lo leen. Hay que probarla con personas reales (ver [Cómo validar](#cómo-validar)).

## El contexto

- El aviso del SENAMHI es **para las próximas 24 horas** y tiene tres niveles: amarillo (lluvia moderada, 10 mm o más), naranja (fuerte, 40 mm o más) y rojo (muy fuerte, 80 mm o más). El peligro real para la gente son las **quebradas que se activan** (huaicos) y los ríos que crecen.
- Casi todos llegan **desde el celular**, muchas veces por un enlace de **WhatsApp**, con **datos prepago** y a veces con 3G. Muchos teléfonos son de gama baja.
- Los **milímetros** no le dicen nada a la mayoría. «Lluvia muy fuerte» y «aléjate de las quebradas» sí.
- Se mira **al aire libre, con apuro o con miedo**: tiene que entenderse de un vistazo, con una mano.

## Las personas

**Rosa, 42 años. Vive en Chosica, a una cuadra de una quebrada.**
Tiene un Android sencillo y datos prepago. Le llega el enlace por el grupo de WhatsApp del barrio. No sabe qué es un milímetro de lluvia, pero recuerda el huaico de 2017.
*Quiere saber*: si hoy hay peligro donde vive y qué tiene que hacer.
*Le molesta*: el texto largo, los números sin explicación, que la página tarde.

**Javier, 35 años. Chofer de una empresa de transporte Lima–Huancayo.**
Revisa antes de salir, en el celular, a veces desde la sierra con poca señal.
*Quiere saber*: si en las provincias por donde pasa hay aviso hoy y si está lloviendo ahora.
*Le molesta*: tener que entrar distrito por distrito.

**Carmen, 30 años. Vive en Lima; sus padres viven en Tambo Grande (Piura).**
*Quiere saber*: si sus padres están en zona de aviso, y mandarles el enlace con lo que tienen que hacer.
*Le molesta*: no poder compartir justo ese lugar.

**Luis, 45 años. Trabaja en la oficina de gestión de riesgo de una municipalidad (o es periodista local).**
Usa la computadora en la oficina y el celular en campo.
*Quiere saber*: qué distritos de su provincia o departamento tienen aviso, cuánta gente vive en las zonas de quebradas, y tener la fuente oficial a la mano.
*Le molesta*: que no se pueda citar el dato ni saber de cuándo es.

## Los recorridos críticos

| # | Recorrido | Persona | Tipo |
|---|---|---|---|
| 1 | Saber si hoy hay aviso donde vivo y qué hacer | Rosa | Frecuente |
| 2 | Abrir el enlace de un lugar que me mandaron | Rosa, Carmen | Frecuente |
| 3 | Ver dónde está lloviendo ahora y qué viene | Javier | Frecuente |
| 4 | Revisar los avisos de una ruta antes de viajar | Javier | Crucial |
| 5 | Mandar a alguien el aviso de su lugar | Carmen | Crucial |
| 6 | Saber qué distritos y cuánta gente están en zona de aviso | Luis | Crucial |

### 1. Saber si hoy hay aviso donde vivo y qué hacer (el principal)

Camino feliz, en el celular:

1. Abre la web. Ve el mapa del Perú con las zonas de aviso pintadas, y abajo una hoja que dice el aviso del lugar que se muestra.
2. Toca su zona en el mapa (o la busca por su nombre).
3. La hoja dice, sin abrir nada más: **el lugar, el nivel con su color y palabra («Aviso rojo · Lluvia muy fuerte»), y qué hacer** («Aléjate de quebradas y ríos…»).

Éxito: llega a «qué hacer» en **dos toques o menos y en menos de 10 segundos con 3G**. Si no hay aviso, lo dice igual de claro («Sin aviso de lluvia hoy»).

### 2. Abrir el enlace de un lugar que me mandaron

1. Toca el enlace en WhatsApp (por ejemplo `alerta.illapalabs.org/piura/piura/tambo-grande`). La vista previa ya dice qué es.
2. La web abre directamente en ese distrito, con el mapa encuadrado y la hoja con su aviso y qué hacer. **Cero toques.**

### 3. Ver dónde está lloviendo ahora y qué viene

1. Sobre el mapa ya está la lluvia de ahora.
2. Con el pulgar, toca ▶ o mueve la barra: atrás, lo que cayó en las últimas horas; adelante, el pronóstico.
3. La escala dice la intensidad con palabras (llovizna, moderada, fuerte) y, para quien lo quiera, en milímetros por hora.

### 4. Revisar los avisos de una ruta antes de viajar

1. Mueve y acerca el mapa a lo largo de su ruta; las zonas de aviso se ven por color.
2. Toca las provincias por donde pasa; la hoja dice el aviso más alto de cada una.

### 5. Mandar a alguien el aviso de su lugar

1. Elige el distrito (recorrido 1).
2. Comparte la dirección de la página: el enlace lleva a ese lugar (recorrido 2).

### 6. Saber qué distritos y cuánta gente están en zona de aviso

1. Elige el departamento o la provincia.
2. Abre la hoja (en el celular) o mira el panel (en la computadora): la lista de distritos con aviso, ordenada por nivel; cuánta gente vive en centros poblados dentro de las zonas de quebradas; la fuente y la fecha del aviso.

## Requisitos

### Funcionales

Prioridad: **Debe** (sin esto no sirve), **Debería** (importante, puede esperar un poco), **Puede** (si hay tiempo).

| Requisito | Prioridad | Recorrido | Hoy |
|---|---|---|---|
| El mapa es lo primero: las zonas de aviso se ven al abrir | Debe | 1, 3, 4 | Sí |
| Tocar un lugar en el mapa dice su nivel y qué hacer, sin abrir nada más | Debe | 1 | Sí (hoja cerrada) |
| Cada lugar tiene su dirección, y el enlace abre ese lugar | Debe | 2, 5 | Sí |
| Decir de qué fecha es el aviso y que es para 24 horas | Debe | 1, 6 | Solo en la computadora |
| Buscar un **distrito** o una provincia por su nombre, no solo un departamento | Debe | 1, 5 | No: solo departamentos |
| La fuente (SENAMHI), que no es un sitio oficial y los teléfonos de emergencia (115, 116) | Debe | 6 | Sí (al abrir la hoja) |
| La lluvia de las últimas horas y el pronóstico, con los controles al alcance del pulgar | Debería | 3 | Sí |
| Un botón de compartir (el menú del teléfono) con el texto del aviso | Debería | 5 | No |
| «Mi ubicación»: ir al distrito donde estoy, con permiso | Debería | 1 | No |
| La lista de distritos con aviso y la población en zonas de quebradas | Debería | 6 | Sí |
| Arrastrar la hoja con el dedo para abrirla o cerrarla | Puede | 1 | No: se abre con un toque |
| Guardar mis lugares | Puede | 1 | No |
| Avisarme cuando cambie el aviso de mi lugar (notificaciones) | Puede | 1 | No |
| Quechua y otras lenguas | Puede | 1 | No |

### No funcionales

- **Rápido con mala señal**: el aviso (texto) aparece antes que el mapa; la primera vista en menos de 2,5 segundos con 4G; lo pesado (formas de los distritos, lluvia) se baja después.
- **Claro**: palabras antes que números; los números se quedan, pero como detalle.
- **Accesible**: el color nunca va solo (siempre con palabra); contraste AA; lo que se toca mide al menos 44 px; se puede usar con lector de pantalla.
- **Con una mano**: lo que se toca va abajo; arriba, lo que solo se lee (leyenda, buscador).
- **Confiable**: si la fuente falla, se muestra el último aviso con su fecha, y se dice.
- **Privado**: sin cookies ni datos personales; las visitas se cuentan de forma anónima.
- **Libre y con créditos**: se cita al SENAMHI, a la NASA, al UK Met Office y a OpenStreetMap.

## Principios para el diseño

1. **El mapa primero.** Es lo que la gente viene a ver.
2. **Una respuesta, después el detalle.** La hoja cerrada responde «¿hay peligro y qué hago?»; el resto está a un toque.
3. **Qué hacer antes que por qué.** La explicación va después de la acción.
4. **Palabras antes que números.** «Lluvia muy fuerte», y debajo «80 mm o más en 24 h».
5. **El color nunca solo.** La leyenda dice qué significa cada color.
6. **Al alcance del pulgar.** Controles abajo; arriba, solo lo que se lee.

## Cómo medir (HEART, sin cookies)

| Señal | Qué se mira | De dónde |
|---|---|---|
| Tarea cumplida (recorridos 1 y 2) | Visitas que llegan a la dirección de un distrito | Analíticas anónimas por ruta |
| Adopción (recorridos 2 y 5) | Visitas que llegan desde WhatsApp u otras apps | El origen de la visita |
| Participación (recorrido 3) | Veces que se abre la lluvia | Por definir, sin datos personales |
| Retención | Visitas en días con aviso naranja o rojo | Analíticas anónimas por día |
| Satisfacción | Una pregunta opcional, «¿Te sirvió?» | Por definir |

## Cómo validar

Antes de dar por buenos estos recorridos, probarlos con **cinco personas** como las de arriba (vecinos de zonas de quebradas, choferes, familiares a distancia), en su propio celular:

- Pedirles el recorrido 1 sin explicar nada y medir toques y segundos.
- Preguntarles qué entienden de la leyenda y de la escala de lluvia.
- Anotar dónde dudan. Cada duda es un cambio de diseño o un requisito nuevo.

## Fuentes

- [Critical User Journeys: The Key UX Technique From Google](https://blog.uxtweak.com/critical-user-journey/) (UXtweak)
- [Unlocking the secrets of UX](https://www.mindtheproduct.com/product-development-and-ux-critical-user-journeys/), Javier Bargas-Avila (Google), en Mind the Product
- [How to Map a Critical User Journey](https://productschool.com/blog/user-experience/critical-user-journey) (Product School)
- [What is the HEART framework?](https://ixdf.org/literature/topics/heart-framework) (Interaction Design Foundation); el artículo original es *Measuring the user experience on a large scale* (Rodden, Hutchinson y Fu, CHI 2010)
