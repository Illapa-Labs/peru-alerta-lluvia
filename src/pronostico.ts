// El pronóstico de lluvia de las próximas horas (del modelo que elige la API de Illapa, en una malla de unos 22 km)
// dibujado como imágenes suaves: entre punto y punto se interpola, y se recorta al contorno del Perú. En las zonas con
// quebradas (Lima Este, la costa norte, Huaylas, Cusco, Arequipa) la API trae además mallas de 0,1° (unos 11 km, la
// resolución real del modelo): dentro de ellas la imagen usa esa malla, y en su borde se funde con la nacional.

import { api } from './api'
import type { Ring } from './data'
import { PALETTE, colorIndex } from './escala'

/** Una malla: la nacional o la de una zona. Los valores van por hora, fila tras fila, en décimas de mm; -1 donde no
 * se pidió */
interface Malla {
  oeste: number
  norte: number
  paso: number
  columnas: number
  filas: number
  valores: number[][]
}

interface Zona extends Malla {
  id: string
  nombre: string
}

interface Pronostico extends Malla {
  inicio: string
  horas: number
  /** Las mallas finas de las zonas con quebradas (la API las agrega desde la versión con zonas) */
  zonas?: Zona[]
  /** El crédito y la licencia de los datos, que hay que mostrar (los da la API según el modelo que usa) */
  fuente?: string
  licencia?: string
}

/** El crédito del último pronóstico bajado. Si la API no lo dice, el de Open-Meteo. */
let credit = 'pronóstico de Open-Meteo.com (CC BY 4.0)'
export const forecastCredit = () => credit

/** Los nombres de las zonas con el pronóstico más fino, para decirlo en la nota de la lluvia */
let fineZones: string[] = []
export const forecastFineZones = () => fineZones

/** En cuántas celdas de la zona se pasa de la malla nacional a la fina, desde su borde */
const FADE_CELLS = 3

/** Cuánto pesa la malla fina en cada celda de una zona: 0 donde no hay valores (fuera de la zona o en el mar), y sube
 * hasta 1 a FADE_CELLS celdas de ahí, para que el cambio de malla no se vea */
function fadeWeights(zone: Zona): Float32Array {
  const { columnas: cols, filas: rows } = zone
  const valid = zone.valores[0]!
  const distance = new Float32Array(cols * rows).fill(FADE_CELLS)
  // Distancia (en celdas, la mayor de fila o columna) a la celda sin valor o al borde más cercanos
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let nearest = Math.min(FADE_CELLS, row + 1, col + 1, rows - row, cols - col)
      for (let dr = -FADE_CELLS; dr <= FADE_CELLS && nearest > 0; dr++) {
        for (let dc = -FADE_CELLS; dc <= FADE_CELLS; dc++) {
          const r = row + dr
          const c = col + dc
          if (r < 0 || c < 0 || r >= rows || c >= cols) continue
          if (valid[r * cols + c]! < 0) nearest = Math.min(nearest, Math.max(Math.abs(dr), Math.abs(dc)))
        }
      }
      distance[row * cols + col] = nearest
    }
  }
  return distance.map((d) => d / FADE_CELLS)
}

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

  // Lo que cubre cada zona en la imagen, y el peso de su malla en cada celda (se calcula una vez)
  const zones = (data.zonas ?? []).map((zone) => {
    const xFrom = Math.max(0, Math.floor(((zone.oeste - west) / (east - west)) * width))
    const xTo = Math.min(width, Math.ceil(((zone.oeste + (zone.columnas - 1) * zone.paso - west) / (east - west)) * width))
    const zoneSouth = zone.norte - (zone.filas - 1) * zone.paso
    const yOf = (lat: number) => ((mercatorY(north) - mercatorY(lat)) / (mercatorY(north) - mercatorY(south))) * height
    return { zone, xFrom, xTo, yFrom: Math.max(0, Math.floor(yOf(zone.norte))), yTo: Math.min(height, Math.ceil(yOf(zoneSouth))), weight: fadeWeights(zone) }
  })
  // «Lima Este: cuencas del Rímac…» → «Lima Este»
  fineZones = zones.map(({ zone }) => zone.nombre.split(':')[0]!.trim())

  /** La lluvia en un punto de una malla (fila y columna con decimales), entre los cuatro puntos de alrededor */
  const bilinear = (get: (row: number, col: number) => number, gy: number, gx: number) => {
    const r0 = Math.floor(gy)
    const c0 = Math.floor(gx)
    const fy = gy - r0
    const fx = gx - c0
    return (get(r0, c0) * (1 - fx) + get(r0, c0 + 1) * fx) * (1 - fy) + (get(r0 + 1, c0) * (1 - fx) + get(r0 + 1, c0 + 1) * fx) * fy
  }

  const end = Date.now() + 24 * 3_600_000
  const start = Date.parse(data.inicio)
  const frames: ForecastFrame[] = []
  let canvas: HTMLCanvasElement | undefined
  let rain: Float32Array | undefined
  const draw = (hour: number): string => {
    canvas ??= Object.assign(document.createElement('canvas'), { width, height })
    rain ??= new Float32Array(width * height)
    rain.fill(0)
    const context = canvas.getContext('2d')!
    const values = data.valores[hour]!
    const mask = insideMask()
    const at = (row: number, col: number) => Math.max(0, values[Math.min(rows - 1, row) * cols + Math.min(cols - 1, col)]!) / 10
    // La lluvia de la malla nacional en un lugar
    const national = (lon: number, lat: number) => {
      const gy = (gridNorth - lat) / step
      const gx = (lon - gridWest) / step
      if (gx < 0 || gy < 0 || gx > cols - 1 || gy > rows - 1) return 0
      return bilinear(at, gy, gx)
    }

    // 1. La malla nacional, en mm/h por píxel
    for (let y = 0; y < height; y++) {
      const gy = gridRow[y]!
      if (gy < 0 || gy > rows - 1) continue
      for (let x = 0; x < width; x++) {
        const p = y * width + x
        if (!mask[p * 4 + 3]) continue
        const gx = gridCol[x]!
        if (gx < 0 || gx > cols - 1) continue
        rain[p] = bilinear(at, gy, gx)
      }
    }

    // 2. Las zonas: su malla fina, fundida con la nacional cerca de su borde. Donde la zona no tiene valor (el mar, o
    // fuera de su contorno) se usa el nacional, para que la interpolación no baje a cero en el borde
    for (const { zone, xFrom, xTo, yFrom, yTo, weight } of zones) {
      const { oeste: zWest, norte: zNorth, paso: zStep, columnas: zCols, filas: zRows } = zone
      const raw = zone.valores[hour]
      if (!raw) continue
      const filled = new Float32Array(zCols * zRows)
      for (let row = 0; row < zRows; row++) {
        for (let col = 0; col < zCols; col++) {
          const v = raw[row * zCols + col]!
          filled[row * zCols + col] = v >= 0 ? v / 10 : national(zWest + col * zStep, zNorth - row * zStep)
        }
      }
      const zAt = (row: number, col: number) => filled[Math.min(zRows - 1, row) * zCols + Math.min(zCols - 1, col)]!
      const wAt = (row: number, col: number) => weight[Math.min(zRows - 1, row) * zCols + Math.min(zCols - 1, col)]!
      for (let y = yFrom; y < yTo; y++) {
        const lat = latitudeOf(mercatorY(north) - ((y + 0.5) / height) * (mercatorY(north) - mercatorY(south)))
        const gy = (zNorth - lat) / zStep
        if (gy < 0 || gy > zRows - 1) continue
        for (let x = xFrom; x < xTo; x++) {
          const p = y * width + x
          if (!mask[p * 4 + 3]) continue
          const gx = (west + ((x + 0.5) / width) * (east - west) - zWest) / zStep
          if (gx < 0 || gx > zCols - 1) continue
          const w = bilinear(wAt, gy, gx)
          if (w <= 0) continue
          rain[p] = w * bilinear(zAt, gy, gx) + (1 - w) * rain[p]!
        }
      }
    }

    // 3. Los colores, con la escala de la web; el borde de la lluvia se desvanece en vez de cortarse
    const image = context.createImageData(width, height)
    for (let p = 0; p < width * height; p++) {
      const mm = rain[p]!
      if (mm < 0.1) continue
      const [red, green, blue] = PALETTE[colorIndex(mm)]!
      image.data[p * 4] = red
      image.data[p * 4 + 1] = green
      image.data[p * 4 + 2] = blue
      image.data[p * 4 + 3] = Math.min(255, Math.round(((mm - 0.1) / 0.3) * 255))
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
