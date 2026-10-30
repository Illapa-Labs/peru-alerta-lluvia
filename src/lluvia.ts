// La lluvia de las últimas 24 horas y la pronosticada para las próximas 24, hora por hora, sobre el mapa.
// - Lo que ya cayó: la de la NASA (GPM IMERG), unos 10 km, cada 30 minutos, con unas 6 horas de retraso, en mosaicos
//   de NASA GIBS. (La del satélite GOES-19, más fina y casi al momento, volverá cuando la sirva la API de Illapa.)
// - Después de ahora, el pronóstico de Open-Meteo, que sirve la API (src/pronostico.ts).
// Al abrir el mapa se muestra la lluvia de ahora (una sola imagen). El resto se baja recién cuando se toca el «play»
// o la barra: entonces se piden todas las horas a la vez, para que la reproducción no espere.

import { addProtocol, type Map as GlMap } from 'maplibre-gl'
import type { Ring } from './data'
import { PALETTE, colorIndex } from './escala'
import { NASA_RAIN_COLORS } from './lluvia-nasa-colores'
import { forecastFrames } from './pronostico'

const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best'
/** Los mosaicos de la NASA se piden con este protocolo, que los vuelve a pintar (ver `recolor`) */
const NASA_PROTOCOL = 'lluvia-nasa'

/** Del color de la NASA (0xRRGGBB) a los mm/h que representa */
const NASA_RAIN = new Map(NASA_RAIN_COLORS)

/**
 * La NASA pinta la lluvia de verde a rojo, que se confunde con los colores del aviso del SENAMHI. Cada píxel se
 * traduce a mm/h con su tabla de colores y se vuelve a pintar con la escala de la web (la de la leyenda y del
 * pronóstico), con el mismo borde suave que el pronóstico.
 */
async function recolor(url: string, signal: AbortSignal): Promise<ArrayBuffer> {
  const response = await fetch(url.replace(`${NASA_PROTOCOL}://`, 'https://'), { signal })
  if (!response.ok) throw new Error(`NASA GIBS: ${response.status}`)
  const bitmap = await createImageBitmap(await response.blob())
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.drawImage(bitmap, 0, 0)
  const image = context.getImageData(0, 0, bitmap.width, bitmap.height)
  const pixels = image.data
  for (let p = 0; p < pixels.length; p += 4) {
    if (pixels[p + 3] === 0) continue
    const mm = NASA_RAIN.get((pixels[p]! << 16) | (pixels[p + 1]! << 8) | pixels[p + 2]!)
    if (mm === undefined || mm < 0.1) {
      pixels[p + 3] = 0
      continue
    }
    const [red, green, blue] = PALETTE[colorIndex(mm)]!
    pixels[p] = red
    pixels[p + 1] = green
    pixels[p + 2] = blue
    pixels[p + 3] = Math.min(255, Math.round(((mm - 0.1) / 0.3) * 255))
  }
  context.putImageData(image, 0, 0)
  return (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer()
}

addProtocol(NASA_PROTOCOL, async (params, abortController) => ({ data: await recolor(params.url, abortController.signal) }))
const LAYER = 'IMERG_Precipitation_Rate_30min'
const MATRIX = 'GoogleMapsCompatible_Level6'
const HOURS = 24
/** Solo se piden mosaicos que tocan el Perú */
const PERU: [number, number, number, number] = [-82, -19, -68, 1]
const OPACITY = 0.85
/** El pronóstico es del modelo global del UK Met Office, servido por Open-Meteo (ver illapa-engine, src/forecast.rs) */
const FORECAST_CREDIT = 'UK Met Office vía Open-Meteo.com (CC BY-SA 4.0)'
/** Al reproducir, cada hora de lluvia dura esto en pantalla */
const HOUR_MS = 800

const hourFormat = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

interface Frame {
  time: Date
  /** Lo que ya llovió (satélite) o lo que se espera (pronóstico) */
  forecast?: boolean
  source: { type: 'image'; url: string | (() => string); coordinates: [[number, number], [number, number], [number, number], [number, number]] } | { type: 'raster'; tiles: string[]; tileSize: number; maxzoom: number; bounds: [number, number, number, number] }
}

/** La hora más reciente que GIBS ya tiene (llega con unas 6 horas de retraso). Si GIBS tarda en decirlo, se calcula. */
async function imergFrames(): Promise<Frame[]> {
  const now = Date.now()
  const day = (ms: number) => new Date(ms).toISOString().slice(0, 10)
  let last: Date | undefined
  try {
    const response = await fetch(`${GIBS}/1.0.0/${LAYER}/default/${MATRIX}/all/${day(now - 2 * 86_400_000)}--${day(now + 86_400_000)}.xml`, { signal: AbortSignal.timeout(4000) })
    const times = response.ok ? ((await response.text()).match(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ/g) ?? []) : []
    if (times.length) last = new Date(times.sort().at(-1)!)
  } catch {}
  // Si no, siete horas atrás, en la media hora: casi siempre ya está
  const halfHour = 30 * 60_000
  last ??= new Date(Math.floor((now - 7 * 3_600_000) / halfHour) * halfHour)
  return Array.from({ length: HOURS }, (_, i) => {
    const time = new Date(last.getTime() - (HOURS - 1 - i) * 3_600_000)
    const tiles = `${GIBS}/${LAYER}/default/${time.toISOString().replace('.000', '')}/${MATRIX}/{z}/{y}/{x}.png`.replace('https://', `${NASA_PROTOCOL}://`)
    return { time, source: { type: 'raster', tiles: [tiles], tileSize: 256, maxzoom: 6, bounds: PERU } }
  })
}

/** `peru`: los anillos de los departamentos, para recortar el pronóstico al país */
export function setupRain(map: GlMap, peru: Ring[]) {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
  const open = $<HTMLButtonElement>('lluvia-abrir')
  const controls = $('lluvia-controles')
  const play = $<HTMLButtonElement>('lluvia-play')
  const slider = $<HTMLInputElement>('lluvia-hora')
  const label = $('lluvia-etiqueta')
  const kind = $('lluvia-fuente')
  const note = $('lluvia-nota')
  const close = $<HTMLButtonElement>('lluvia-cerrar')

  let frames: Frame[] = []
  /** Las capas visibles ahora y su opacidad, para tocar solo las que cambian */
  let visible = new Map<string, number>()
  /** El momento que se muestra (ms), entre la primera y la última imagen */
  let now = 0
  let playing = false
  let lastTick = 0

  // Las imágenes del pronóstico no van en una capa cada una: con decenas de imágenes de ese tamaño la tarjeta de
  // video de un celular se puede quedar sin memoria. Van en solo dos capas, una para las imágenes pares y otra para
  // las impares, a las que se les cambia la imagen (todas tienen el mismo tamaño y lugar); así el fundido entre una y
  // la siguiente usa siempre las dos. Mientras se ve la lluvia el relieve 3D se apaga: el mapa en 3D guarda lo
  // dibujado y no se enteraba del cambio de imagen.
  // Los mosaicos de la NASA sí van en una capa cada uno: son chicos.
  const SLOTS = ['lluvia-par', 'lluvia-impar']
  const slotImage = new Map<string, number>()
  const layerId = (i: number) => `lluvia-${i}`
  const first = () => frames[0]!.time.getTime()
  const last = () => frames.at(-1)!.time.getTime()
  const removeLayer = (id: string) => {
    if (map.getLayer(id)) map.removeLayer(id)
    if (map.getSource(id)) map.removeSource(id)
  }
  let terrain: ReturnType<GlMap['getTerrain']> = null
  const urlOf = (source: { url: string | (() => string) }) => (typeof source.url === 'string' ? source.url : source.url())
  let warmed = false
  /** La primera vez que se toca el «play» o la barra: se bajan todas las imágenes y se apaga el relieve 3D */
  const warm = () => {
    if (warmed) return
    warmed = true
    for (const frame of frames) if (frame.source.type === 'image' && typeof frame.source.url === 'string') new Image().src = frame.source.url
    terrain = map.getTerrain()
    if (terrain) map.setTerrain(null)
  }

  /** La capa que muestra la imagen i (si es una imagen, se la pone a la capa que le toca) */
  const layerFor = (i: number) => {
    const source = frames[i]!.source
    if (source.type === 'raster') return layerId(i)
    const slot = SLOTS[i % 2]!
    if (slotImage.get(slot) !== i) {
      ;(map.getSource(slot) as any).updateImage({ url: urlOf(source), coordinates: source.coordinates })
      slotImage.set(slot, i)
    }
    return slot
  }

  /** Muestra un momento cualquiera: entre dos imágenes, la de antes se desvanece y la de después aparece. */
  const showAt = (time: number) => {
    now = Math.min(last(), Math.max(first(), time))
    const i = frames.findIndex((_, k) => k === frames.length - 1 || frames[k + 1]!.time.getTime() > now)
    const t0 = frames[i]!.time.getTime()
    const t1 = frames[i + 1]?.time.getTime() ?? t0
    const f = t1 > t0 ? (now - t0) / (t1 - t0) : 0
    const next = new Map<string, number>([[layerFor(i), OPACITY * (1 - f)]])
    if (f > 0) next.set(layerFor(i + 1), OPACITY * f)
    for (const [layer] of visible) if (!next.has(layer)) map.setPaintProperty(layer, 'raster-opacity', 0)
    for (const [layer, opacity] of next) if (visible.get(layer) !== opacity) map.setPaintProperty(layer, 'raster-opacity', opacity)
    visible = next
    slider.value = String(Math.round((now - first()) / 60_000))
    // La hora, a los 10 minutos
    label.textContent = hourFormat.format(new Date(Math.round(now / 600_000) * 600_000))
    kind.textContent = frames[f > 0.5 ? i + 1 : i]!.forecast ? 'Pronóstico · hora de Lima' : 'Ya cayó · hora de Lima'
  }

  const tick = (stamp: number) => {
    if (!playing) return
    showAt(now + ((stamp - lastTick) / HOUR_MS) * 3_600_000)
    lastTick = stamp
    if (now >= last()) pause()
    else requestAnimationFrame(tick)
  }
  const pause = () => {
    playing = false
    play.textContent = '▶'
    play.setAttribute('aria-label', 'Reproducir')
  }
  const start = () => {
    warm()
    // Si está en la última hora, vuelve a empezar
    if (now >= last()) showAt(first())
    playing = true
    lastTick = performance.now()
    requestAnimationFrame(tick)
    play.textContent = '❚❚'
    play.setAttribute('aria-label', 'Pausar')
  }


  const openRain = async () => {
    open.disabled = true
    open.textContent = 'Cargando la lluvia…'
    const past = await imergFrames()
    const future = await forecastFrames(peru, past.at(-1)!.time.getTime())
    frames = [...past, ...future.map(({ time, url, coordinates }) => ({ time, forecast: true, source: { type: 'image' as const, url, coordinates } }))]
    note.textContent = [
      'Lo que ya cayó: satélite de la NASA, con unas 6 horas de retraso.',
      future.length ? `Lo que viene: ${FORECAST_CREDIT}, unos 22 km, por hora.` : '',
    ].join(' ')
    // El crédito va en la atribución del mapa (en el celular la nota no se ve). El del pronóstico va con el de la NASA:
    // una fuente de imagen no lleva atribución.
    const attribution = ['Lluvia: NASA GPM IMERG (GIBS)', future.length ? `Pronóstico: ${FORECAST_CREDIT}` : ''].filter(Boolean).join(' · ')
    frames.forEach((frame, i) => {
      // Los mosaicos de la NASA van en una capa cada uno
      if (frame.source.type !== 'raster') return
      map.addSource(layerId(i), { ...frame.source, ...(i === 0 ? { attribution } : {}) })
      // Debajo del aviso (que tiene prioridad), encima del relieve. Todas a la vez (invisibles) para que ya estén bajadas.
      map.addLayer({ id: layerId(i), type: 'raster', source: layerId(i), paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 } }, 'aviso-relleno')
    })
    // Empieza en ahora: hacia atrás, lo que cayó; hacia adelante, el pronóstico. Las dos capas de imagen hacen falta
    // en cuanto haya alguna imagen (aunque ahora se vea un mosaico de la NASA): empiezan con la imagen de ahora si lo
    // es, o con la primera del pronóstico, que es la única que se dibuja hasta que se toque algo.
    const nowIndex = past.length - 1
    const current = frames[nowIndex]!.source
    const firstImage = current.type === 'image' ? current : frames.find((frame) => frame.source.type === 'image')?.source
    if (firstImage?.type === 'image') {
      for (const slot of SLOTS) {
        map.addSource(slot, { type: 'image', url: urlOf(firstImage), coordinates: firstImage.coordinates })
        map.addLayer({ id: slot, type: 'raster', source: slot, paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 } }, 'aviso-relleno')
      }
      if (current.type === 'image') slotImage.set(SLOTS[nowIndex % 2]!, nowIndex)
    }
    slider.max = String(Math.round((last() - first()) / 60_000))
    slider.step = '10'
    open.hidden = true
    controls.hidden = false
    showAt(past.at(-1)!.time.getTime())
  }

  open.addEventListener('click', () => void openRain())
  play.addEventListener('click', () => (playing ? pause() : start()))
  slider.addEventListener('input', () => {
    pause()
    warm()
    showAt(first() + Number(slider.value) * 60_000)
  })
  close.addEventListener('click', () => {
    pause()
    for (const id of [...frames.map((_, i) => layerId(i)), ...SLOTS]) removeLayer(id)
    if (terrain) map.setTerrain(terrain)
    terrain = null
    warmed = false
    slotImage.clear()
    frames = []
    visible = new Map()
    controls.hidden = true
    open.hidden = false
    open.disabled = false
    open.textContent = '▶ Lluvia: últimas 24 h y próximas 24 h'
  })

  // La vista por defecto: la lluvia de ahora sobre el mapa, sin tocar nada
  void openRain()
}
