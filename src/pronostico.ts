// El pronóstico de lluvia de las próximas horas (del modelo que elige la API de Illapa, en una malla de unos 22 km)
// dibujado como imágenes suaves: entre punto y punto se interpola, y se recorta al contorno del Perú.

import { api } from './api'
import type { Ring } from './data'
import { PALETTE, colorIndex } from './escala'

interface Pronostico {
  inicio: string
  horas: number
  oeste: number
  norte: number
  paso: number
  columnas: number
  filas: number
  valores: number[][]
  /** El crédito y la licencia de los datos, que hay que mostrar (los da la API según el modelo que usa) */
  fuente?: string
  licencia?: string
}

/** El crédito del último pronóstico bajado. Si la API no lo dice, el de Open-Meteo. */
let credit = 'pronóstico de Open-Meteo.com (CC BY 4.0)'
export const forecastCredit = () => credit

export interface ForecastFrame {
  time: Date
  /** La imagen de esa hora (PNG en data URL). Se dibuja la primera vez que se pide: unos 50 ms cada una. */
  url(): string
  coordinates: [[number, number], [number, number], [number, number], [number, number]]
}

/** El rectángulo y el ancho de cada imagen: todas iguales, así el mapa usa una sola textura y solo le cambia el
 * contenido */
const BOUNDS = [-82, -19, -68, 1] as const
const WIDTH = 768
const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
const latitudeOf = (y: number) => (360 / Math.PI) * Math.atan(Math.exp(y)) - 90

/** Las horas del pronóstico desde `after` hasta 24 horas después de ahora. Solo se baja el pronóstico (unos 22 KB):
 * cada imagen se dibuja recién cuando se muestra. */
export async function forecastFrames(peru: Ring[], after: number): Promise<ForecastFrame[]> {
  let data: Pronostico
  try {
    const response = await fetch(api('/v1/pronostico'), { signal: AbortSignal.timeout(6000) })
    if (!response.ok) return []
    data = await response.json()
  } catch {
    return []
  }
  if (data.fuente) {
    // «Pronóstico: UK Met Office…» → «pronóstico de UK Met Office…», para que la nota se lea de corrido
    const source = data.fuente.replace(/^pronóstico:\s*/i, 'pronóstico de ')
    credit = data.licencia ? `${source} (${data.licencia})` : source
  }
  const { oeste: gridWest, norte: gridNorth, paso: step, columnas: cols, filas: rows } = data
  const [west, south, east, north] = BOUNDS
  const width = WIDTH
  const height = Math.round((width * (mercatorY(north) - mercatorY(south))) / (((east - west) * Math.PI) / 180))

  // Para cada fila y columna de la imagen, dónde cae en la malla (las filas van en Mercator, como el mapa)
  const gridRow = Float32Array.from({ length: height }, (_, y) => {
    const lat = latitudeOf(mercatorY(north) - ((y + 0.5) / height) * (mercatorY(north) - mercatorY(south)))
    return (gridNorth - lat) / step
  })
  const gridCol = Float32Array.from({ length: width }, (_, x) => (west + ((x + 0.5) / width) * (east - west) - gridWest) / step)

  // El contorno del Perú, para recortar (se calcula una vez, con la primera imagen)
  let inside: Uint8ClampedArray | undefined
  const insideMask = () => {
    if (inside) return inside
    const mask = document.createElement('canvas')
    mask.width = width
    mask.height = height
    const maskContext = mask.getContext('2d')!
    maskContext.beginPath()
    for (const ring of peru) {
      ring.forEach(([lon, lat], i) => {
        const x = ((lon - west) / (east - west)) * width
        const y = ((mercatorY(north) - mercatorY(lat)) / (mercatorY(north) - mercatorY(south))) * height
        if (i === 0) maskContext.moveTo(x, y)
        else maskContext.lineTo(x, y)
      })
      maskContext.closePath()
    }
    maskContext.fill('evenodd')
    inside = maskContext.getImageData(0, 0, width, height).data
    return inside
  }

  const end = Date.now() + 24 * 3_600_000
  const start = Date.parse(data.inicio)
  const frames: ForecastFrame[] = []
  let canvas: HTMLCanvasElement | undefined
  const draw = (hour: number): string => {
    canvas ??= Object.assign(document.createElement('canvas'), { width, height })
    const context = canvas.getContext('2d')!
    const values = data.valores[hour]!
    const mask = insideMask()
    const at = (row: number, col: number) => Math.max(0, values[Math.min(rows - 1, row) * cols + Math.min(cols - 1, col)]!) / 10
    const image = context.createImageData(width, height)
    for (let y = 0; y < height; y++) {
      const gy = gridRow[y]!
      const r0 = Math.floor(gy)
      const fy = gy - r0
      for (let x = 0; x < width; x++) {
        const p = y * width + x
        if (!mask[p * 4 + 3]) continue
        const gx = gridCol[x]!
        if (gx < 0 || gy < 0 || gx > cols - 1 || gy > rows - 1) continue
        const c0 = Math.floor(gx)
        const fx = gx - c0
        // Interpolación bilineal entre los cuatro puntos de alrededor
        const mm = (at(r0, c0) * (1 - fx) + at(r0, c0 + 1) * fx) * (1 - fy) + (at(r0 + 1, c0) * (1 - fx) + at(r0 + 1, c0 + 1) * fx) * fy
        if (mm < 0.1) continue
        const [red, green, blue] = PALETTE[colorIndex(mm)]!
        image.data[p * 4] = red
        image.data[p * 4 + 1] = green
        image.data[p * 4 + 2] = blue
        // El borde de la lluvia se desvanece en vez de cortarse
        image.data[p * 4 + 3] = Math.min(255, Math.round(((mm - 0.1) / 0.3) * 255))
      }
    }
    context.putImageData(image, 0, 0)
    return canvas.toDataURL('image/png')
  }
  for (let hour = 0; hour < data.horas; hour++) {
    const time = start + hour * 3_600_000
    if (time <= after || time > end) continue
    let url: string | undefined
    frames.push({ time: new Date(time), url: () => (url ??= draw(hour)), coordinates: [[west, north], [east, north], [east, south], [west, south]] })
  }
  return frames
}
