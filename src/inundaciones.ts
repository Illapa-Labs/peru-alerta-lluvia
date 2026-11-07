// SPDX-License-Identifier: AGPL-3.0-or-later
// Los avisos de inundación de ríos del SENAMHI (SONICS-PBI): las subcuencas donde un río puede desbordarse o subir
// mucho, en tres niveles, para el estado actual y los 7 días siguientes. Vienen de la API de Illapa (/v1/inundaciones),
// que se los pide al SENAMHI una vez por corrida. Es una capa a pedido: el aviso de lluvia sigue siendo lo principal, así
// que va debajo de él y rayada, para no confundirse con sus colores llenos.

import type { GeoJSONSource, Map as GlMap } from 'maplibre-gl'
import { api } from './api'

/** Un nivel como lo describe el SENAMHI: 1 amarillo, 2 naranja, 3 rojo */
export interface FloodLevel {
  nivel: number
  nombre: string
  color: string
  peligro: string
  recomendacion: string
}

export interface FloodDay {
  /** 0 es el estado actual (lo observado hasta el día anterior a la emisión); 1 a 7, el pronóstico */
  dia: number
  /** AAAA-MM-DD */
  fecha: string | null
  pronostico: boolean
  /** Por nivel: [nivel 1, nivel 2, nivel 3] */
  subcuencas: number[]
}

/** Lo que tiene un distrito en las subcuencas con aviso, un día */
export interface FloodDistrictDay {
  dia: number
  /** El nivel más alto, de 1 a 3 */
  nivel: number
  centros_poblados: number[]
  instituciones_educativas: number[]
  establecimientos_salud: number[]
}

export interface Floods {
  observado_hasta: string | null
  niveles: FloodLevel[]
  dias: FloodDay[]
  distritos: Record<string, FloodDistrictDay[]>
}

let summary: Promise<Floods | null> | undefined

/** El resumen (unos 14 KB comprimido), una sola vez. `null` si la API todavía no lo tiene. */
export function loadFloods(): Promise<Floods | null> {
  summary ??= fetch(api('/v1/inundaciones'), { signal: AbortSignal.timeout(10_000) })
    .then((response) => (response.ok ? response.json() : null))
    .then((json) => (json && Array.isArray(json.dias) && Array.isArray(json.niveles) ? (json as Floods) : null))
    .catch(() => null)
  return summary
}

/** La fecha de hoy en Lima (UTC−5, sin horario de verano), AAAA-MM-DD */
export function limaToday(now = Date.now()): string {
  return new Date(now - 5 * 3_600_000).toISOString().slice(0, 10)
}

/** Los días que vale la pena mostrar: el estado actual y el pronóstico desde hoy (los días ya pasados no). */
export function visibleDays(floods: Floods, today = limaToday()): FloodDay[] {
  return floods.dias.filter((day) => day.dia === 0 || (day.fecha !== null && day.fecha >= today))
}

/** El día que se muestra al abrir: hoy, si está; si no, el primero del pronóstico que quede; si no, el estado actual. */
export function defaultDay(floods: Floods, today = limaToday()): number {
  const days = visibleDays(floods, today)
  return (days.find((day) => day.fecha === today) ?? days.find((day) => day.dia > 0) ?? days[0])?.dia ?? 0
}

/** El aviso de inundación de un distrito: el de hoy o, si hoy no tiene, el próximo día que tenga. */
export function districtFlood(floods: Floods, ubigeo: string, today = limaToday()): { day: FloodDay; entry: FloodDistrictDay } | undefined {
  const entries = floods.distritos[ubigeo] ?? []
  const shown = defaultDay(floods, today)
  const dayOf = (dia: number) => floods.dias.find((day) => day.dia === dia)
  const candidates = entries
    .filter((entry) => entry.dia >= shown && entry.dia > 0 && entry.nivel > 0)
    .sort((a, b) => a.dia - b.dia)
  const entry = candidates[0]
  const day = entry && dayOf(entry.dia)
  return entry && day ? { day, entry } : undefined
}

const MONTHS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'set.', 'oct.', 'nov.', 'dic.']
const WEEKDAYS = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.']

function shortDate(fecha: string) {
  const date = new Date(`${fecha}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? fecha : `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}

/** «Hoy, sáb. 7 nov.», «Mañana, dom. 8 nov.» o «lun. 9 nov.»; el estado actual dice hasta cuándo se observó. */
export function dayLabel(day: FloodDay, today = limaToday()): string {
  if (day.dia === 0) return day.fecha ? `Estado actual (hasta el ${shortDate(day.fecha)})` : 'Estado actual'
  if (!day.fecha) return `Día ${day.dia}`
  const tomorrow = new Date(`${today}T12:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  if (day.fecha === today) return `Hoy, ${shortDate(day.fecha)}`
  if (day.fecha === tomorrow.toISOString().slice(0, 10)) return `Mañana, ${shortDate(day.fecha)}`
  return shortDate(day.fecha)
}

const EMPTY = { type: 'FeatureCollection' as const, features: [] }

/** Un mosaico de rayas diagonales del color del nivel, para rellenar sin tapar el mapa ni parecerse al aviso de lluvia */
function stripes(color: string, size = 12): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')!
  context.strokeStyle = color
  context.lineWidth = 3
  context.lineCap = 'square'
  // Tres trazos para que las rayas sigan de un mosaico al otro
  for (const offset of [-size, 0, size]) {
    context.beginPath()
    context.moveTo(offset, size)
    context.lineTo(offset + size, 0)
    context.stroke()
  }
  return context.getImageData(0, 0, size, size)
}

/**
 * La capa en el mapa y su parte de la leyenda: un botón la enciende, y una lista elige el día. No baja nada hasta que
 * se enciende; cada día (unos 95 KB comprimido) se baja una vez.
 */
export function setupFloods(map: GlMap, floods: Floods) {
  const toggle = document.getElementById('inundacion-abrir') as HTMLButtonElement | null
  const legend = document.getElementById('inundacion-leyenda')
  const select = document.getElementById('inundacion-dia') as HTMLSelectElement | null
  if (!toggle || !legend || !select) return

  const colors: any[] = floods.niveles.flatMap((level) => [level.nivel, level.color])
  for (const level of floods.niveles) map.addImage(`inundacion-${level.nivel}`, stripes(level.color), { pixelRatio: 2 })
  map.addSource('inundacion', { type: 'geojson', data: EMPTY, attribution: 'Inundación de ríos: SENAMHI (SONICS-PBI)' })
  // Debajo del aviso de lluvia, que sigue siendo lo principal
  map.addLayer(
    {
      id: 'inundacion-relleno',
      type: 'fill',
      source: 'inundacion',
      layout: { visibility: 'none' },
      paint: { 'fill-pattern': ['concat', 'inundacion-', ['to-string', ['get', 'nivel']]] as any, 'fill-opacity': 0.9 },
    },
    'aviso-relleno',
  )
  map.addLayer(
    {
      id: 'inundacion-linea',
      type: 'line',
      source: 'inundacion',
      layout: { visibility: 'none', 'line-join': 'round' },
      paint: { 'line-color': ['match', ['get', 'nivel'], ...colors, '#9AA5B1'] as any, 'line-width': 1, 'line-opacity': 0.9 },
    },
    'aviso-relleno',
  )

  const today = limaToday()
  for (const day of visibleDays(floods, today)) {
    const option = document.createElement('option')
    option.value = String(day.dia)
    const total = day.subcuencas.reduce((a, b) => a + b, 0)
    option.textContent = total > 0 ? dayLabel(day, today) : `${dayLabel(day, today)} · sin aviso`
    select.append(option)
  }
  select.value = String(defaultDay(floods, today))

  const cache = new Map<number, Promise<any>>()
  const getDay = (dia: number) => {
    if (!cache.has(dia)) {
      const request = fetch(api(`/v1/inundaciones/${dia}`), { signal: AbortSignal.timeout(20_000) })
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null)
      cache.set(dia, request)
      // Si falló, se vuelve a intentar la próxima vez
      void request.then((json) => json || cache.delete(dia))
    }
    return cache.get(dia)!
  }

  let on = false
  let request = 0
  const show = async () => {
    const mine = ++request
    const dia = Number(select.value)
    select.setAttribute('aria-busy', 'true')
    const geojson = await getDay(dia)
    if (mine !== request) return
    select.removeAttribute('aria-busy')
    ;(map.getSource('inundacion') as GeoJSONSource | undefined)?.setData(geojson ?? EMPTY)
  }
  const setOn = (value: boolean) => {
    on = value
    toggle.setAttribute('aria-pressed', String(on))
    toggle.textContent = on ? '× Inundación de ríos' : '+ Inundación de ríos'
    legend.hidden = !on
    for (const id of ['inundacion-relleno', 'inundacion-linea']) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
    if (on) void show()
  }
  toggle.addEventListener('click', () => setOn(!on))
  select.addEventListener('change', () => void show())
  toggle.hidden = false
}
