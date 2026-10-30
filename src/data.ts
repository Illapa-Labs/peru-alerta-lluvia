// Los datos del aviso de lluvia del SENAMHI y de los departamentos del Perú, y lo que se calcula con
// ellos. Nada de esto necesita el mapa: el panel se puede mostrar antes de que el mapa cargue.

import { api } from './api'

/** Un nivel del aviso. El SENAMHI tiene tres: amarillo, naranja y rojo. */
export interface Level {
  n: number
  /** Cómo lo nombran los datos (su Nivel 1 no es un aviso y se deja fuera) */
  nivel: string
  short: string
  name: string
  color: string
  strong: string
  soft: string
  border: string
  ink: string
  mm: string
  rain: string
  means: string
  todo: string
  here: string
  hereTodo: string
}

export const LEVELS: Level[] = [
  {
    n: 1, nivel: 'Nivel 2', short: 'Amarillo', name: 'Aviso amarillo',
    color: '#F4C430', strong: '#B08A10', soft: '#FDF6DC', border: '#EBD58A', ink: '#4A3A06',
    mm: '10 mm o más', rain: 'Lluvia moderada · 10 mm o más en 24 h',
    means: 'Lluvia de intensidad moderada. Algunas quebradas pueden llevar más agua de lo normal.',
    todo: 'Mantente informado y ten a la mano tu mochila de emergencia.',
    here: 'Se espera lluvia de intensidad moderada en esta zona.',
    hereTodo: 'Mantente informado y revisa el aviso otra vez mañana.',
  },
  {
    n: 2, nivel: 'Nivel 3', short: 'Naranja', name: 'Aviso naranja',
    color: '#EE7D2B', strong: '#B5571A', soft: '#FDEDE1', border: '#F0C09A', ink: '#5A2A0A',
    mm: '40 mm o más', rain: 'Lluvia fuerte · 40 mm o más en 24 h',
    means: 'Lluvia de intensidad fuerte. Las quebradas pueden activarse en las zonas expuestas.',
    todo: 'Evita cruzar quebradas y cauces secos, y reprograma los viajes por carretera en zonas expuestas.',
    here: 'Se espera lluvia fuerte en esta zona; las quebradas cercanas pueden activarse.',
    hereTodo: 'Evita cruzar quebradas y cauces secos. Reprograma tus viajes por carretera si es posible.',
  },
  {
    n: 3, nivel: 'Nivel 4', short: 'Rojo', name: 'Aviso rojo',
    color: '#C3262F', strong: '#A3222C', soft: '#FBECEC', border: '#EBC3C5', ink: '#5E1218',
    mm: '80 mm o más', rain: 'Lluvia muy fuerte · 80 mm o más en 24 h',
    means: 'Lluvia de intensidad muy fuerte. Las quebradas pueden activarse y llegar a zonas pobladas.',
    todo: 'Aléjate de quebradas y ríos, y sigue las indicaciones de las autoridades.',
    here: 'Se espera lluvia muy fuerte en esta zona; las quebradas cercanas pueden activarse.',
    hereTodo: 'Aléjate de quebradas y ríos. Sigue las indicaciones de las autoridades.',
  },
]

export type Ring = number[][]

/** Un área del aviso: un polígono (con sus huecos) de un nivel. */
export interface Area {
  /** Índice en `LEVELS` */
  level: number
  rings: Ring[]
  /** [oeste, sur, este, norte], para descartar rápido los puntos que no están cerca */
  bounds: [number, number, number, number]
  fecha: string
  respons: string
  descripcio: string
  recomendac: string
}

export interface Department {
  name: string
  /** Todos los anillos de todas las piezas, que no se superponen (regla par-impar) */
  rings: Ring[]
  /** [oeste, sur, este, norte] */
  bounds: [number, number, number, number]
}

/** Qué tan afectado está un departamento: cuánto de él está bajo cada nivel. */
export interface Home {
  name: string
  bounds: [number, number, number, number]
  /** La parte (de 0 a 1) del departamento cuyo nivel más alto es cada uno */
  share: number[]
  /** La parte sin aviso */
  none: number
  highest: number | undefined
}

/** Un distrito con aviso de activación de quebradas, y los centros poblados que hay en esas zonas. */
export interface District {
  ubigeo: string
  /** Habitantes del distrito (INEI, Censo 2017); 0 si no se pudo cruzar */
  poblacion: number
  dep: string
  prov: string
  dist: string
  /** El nivel más alto: 2 amarillo, 3 naranja, 4 rojo */
  nivel: number
  /** Centros poblados por nivel (2, 3, 4) */
  poblados: [number, number, number]
  /** Habitantes de esos centros poblados por nivel (2, 3, 4) */
  personas: [number, number, number]
}

export interface AppData {
  /** Los distritos con aviso, con su población */
  districts: District[]
  /** Habitantes de cada departamento (INEI, Censo 2017), por nombre sin tildes y en minúsculas */
  departmentPopulation: Record<string, number>
  /** El aviso en GeoJSON, sin el Nivel 1, para el mapa */
  avisoGeoJson: any | null
  areas: Area[]
  departments: Department[]
  /** Cuándo se bajaron los datos del SENAMHI (ISO), si se sabe */
  updated: string | undefined
  /** Los datos tienen varias horas: puede haber un aviso nuevo que todavía no se ve */
  stale: boolean
}

/** Regla par-impar, así que los huecos funcionan. */
export function contains(rings: Ring[], longitude: number, latitude: number): boolean {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]!
      const [xj, yj] = ring[j]!
      if (yi! > latitude !== yj! > latitude && longitude < ((xj! - xi!) * (latitude - yi!)) / (yj! - yi!) + xi!) {
        inside = !inside
      }
    }
  }
  return inside
}

function boundsOf(rings: Ring[]): [number, number, number, number] {
  const bounds: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const ring of rings) {
    for (const [x, y] of ring) {
      bounds[0] = Math.min(bounds[0], x!)
      bounds[1] = Math.min(bounds[1], y!)
      bounds[2] = Math.max(bounds[2], x!)
      bounds[3] = Math.max(bounds[3], y!)
    }
  }
  return bounds
}

const polygonsOf = (geometry: any): Ring[][] =>
  geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : []

const getJson = (url: string) =>
  fetch(url, { signal: AbortSignal.timeout(6000) })
    .then((response) => (response.ok && !response.headers.get('content-type')?.includes('html') ? response.json() : null))
    .catch(() => null)

export function parseAreas(geojson: any): Area[] {
  const areas: Area[] = []
  for (const feature of geojson?.features ?? []) {
    const properties = feature.properties ?? {}
    const level = LEVELS.findIndex((candidate) => candidate.nivel === properties.nivel)
    if (level < 0) continue // No es un aviso
    for (const rings of polygonsOf(feature.geometry)) {
      areas.push({
        level,
        rings,
        bounds: boundsOf(rings),
        fecha: properties.fecha ?? '',
        respons: properties.respons ?? '',
        descripcio: properties.descripcio ?? '',
        recomendac: properties.recomendac ?? '',
      })
    }
  }
  return areas
}

export function parseDepartments(geojson: any): Department[] {
  const departments: Department[] = []
  for (const feature of geojson?.features ?? []) {
    const name: string = feature.properties?.name ?? ''
    let department = departments.find((candidate) => candidate.name === name)
    if (!department) {
      department = { name, rings: [], bounds: [Infinity, Infinity, -Infinity, -Infinity] }
      departments.push(department)
    }
    for (const polygon of polygonsOf(feature.geometry)) {
      for (const ring of polygon) {
        department.rings.push(ring)
        for (const [x, y] of ring) {
          const b = department.bounds
          department.bounds = [Math.min(b[0], x!), Math.min(b[1], y!), Math.max(b[2], x!), Math.max(b[3], y!)]
        }
      }
    }
  }
  return departments
}

export function departmentAt(departments: Department[], longitude: number, latitude: number): Department | undefined {
  return departments.find((department) => {
    const [west, south, east, north] = department.bounds
    return longitude >= west && longitude <= east && latitude >= south && latitude <= north && contains(department.rings, longitude, latitude)
  })
}

/** Una cuadrícula de puntos sobre el departamento dice qué parte está bajo cada nivel. */
export function overview(department: Department, areas: Area[], steps = 70): Home {
  const [west, south, east, north] = department.bounds
  const counts = LEVELS.map(() => 0)
  let none = 0
  let total = 0
  for (let row = 0; row < steps; row++) {
    for (let column = 0; column < steps; column++) {
      const longitude = west + ((east - west) * (column + 0.5)) / steps
      const latitude = south + ((north - south) * (row + 0.5)) / steps
      if (!contains(department.rings, longitude, latitude)) continue
      total++
      let highest = -1
      for (const area of areas) {
        const [aw, as, ae, an] = area.bounds
        if (area.level > highest && longitude >= aw && longitude <= ae && latitude >= as && latitude <= an && contains(area.rings, longitude, latitude)) highest = area.level
      }
      if (highest < 0) none++
      else counts[highest]!++
    }
  }
  total = Math.max(total, 1)
  const highest = [...counts.keys()].reverse().find((level) => counts[level]! > 0)
  return { name: department.name, bounds: department.bounds, share: counts.map((count) => count / total), none: none / total, highest }
}

/** Más que esto sin actualizarse, y se avisa de que los datos pueden estar atrasados. */
const STALE_AFTER_HOURS = 8

/** Centros poblados o personas por nivel, como los da la API */
interface ByLevel {
  amarillo: number
  naranja: number
  rojo: number
}

/**
 * El aviso, los distritos con aviso y la población de los departamentos vienen de la API de Illapa, que
 * le pregunta al SENAMHI cada media hora: así el SENAMHI no recibe una consulta por cada visitante. Los
 * límites de los departamentos son un archivo del propio sitio, porque casi no cambian.
 */
export async function loadData(): Promise<AppData> {
  const [raw, departmentsJson, districtsJson, populationJson] = await Promise.all([
    getJson(api('/v1/aviso')),
    getJson('/data/peru-departamentos.geojson'),
    getJson(api('/v1/distritos?solo_avisos=true')),
    getJson(api('/v1/departamentos')),
  ])
  const avisoGeoJson = raw && {
    ...raw,
    // El SENAMHI no avisa nada en el Nivel 1, solo en el 2 (amarillo), 3 (naranja) y 4 (rojo)
    features: raw.features.filter((feature: any) => feature.properties?.nivel !== 'Nivel 1'),
  }
  const updated: string | undefined = raw?.generated_at ?? districtsJson?.actualizado ?? undefined
  const age = updated ? (Date.now() - new Date(updated).getTime()) / 3_600_000 : Infinity
  const levels = (counts: ByLevel | undefined): [number, number, number] => [counts?.amarillo ?? 0, counts?.naranja ?? 0, counts?.rojo ?? 0]
  return {
    avisoGeoJson,
    districts: (districtsJson?.distritos ?? []).map((district: any) => ({
      dep: district.departamento.nombre,
      prov: district.provincia.nombre,
      dist: district.nombre,
      nivel: district.nivel,
      poblados: levels(district.centros_poblados_en_zona),
      personas: levels(district.personas_en_zona),
      poblacion: district.poblacion ?? 0,
      ubigeo: district.ubigeo ?? '',
    })),
    departmentPopulation: Object.fromEntries((populationJson?.departamentos ?? []).map((department: any) => [normalize(department.nombre), department.poblacion as number])),
    areas: parseAreas(avisoGeoJson),
    departments: parseDepartments(departmentsJson),
    updated,
    stale: age > STALE_AFTER_HOURS,
  }
}

/** Los departamentos que tocan o están a pocos kilómetros de otro. */
export function neighborsOf(department: Department, departments: Department[], margin = 0.12): Department[] {
  const [w, s, e, n] = department.bounds
  const limit = margin * margin
  return departments.filter((other) => {
    if (other === department) return false
    const [ow, os, oe, on] = other.bounds
    if (ow > e + margin || oe < w - margin || os > n + margin || on < s - margin) return false
    // Algún punto de un contorno está cerca del otro
    for (const ring of department.rings) {
      for (const [x, y] of ring) {
        if (x! < ow - margin || x! > oe + margin || y! < os - margin || y! > on + margin) continue
        for (const otherRing of other.rings) {
          for (const [ox, oy] of otherRing) {
            const dx = x! - ox!
            const dy = y! - oy!
            if (dx * dx + dy * dy <= limit) return true
          }
        }
      }
    }
    return false
  })
}

const cache = new Map<string, Home>()

/** El resumen de un departamento, que se guarda: calcularlo cuesta y se vuelve a pedir al ir y venir. */
export function homeOf(department: Department, areas: Area[], steps: number): Home {
  const key = `${department.name}:${steps}:${areas.length}`
  let home = cache.get(key)
  if (!home) {
    home = overview(department, areas, steps)
    cache.set(key, home)
  }
  return home
}

/** Sin tildes ni mayúsculas, para que "ancash" encuentre "Áncash". */
export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/** Los departamentos de mayor a menor aviso: primero el nivel más alto y, a igual nivel, el que tiene más territorio con aviso. */
export function ranked(departments: Department[], areas: Area[], districts: District[] = []): Home[] {
  // El nivel de un departamento cuenta también los distritos con aviso de activación de quebradas
  const homes = departments.map((department) => withDistricts(homeOf(department, areas, 28), districts))
  const covered = (home: Home) => 1 - home.none
  return homes.sort(
    (a, b) =>
      (b.highest ?? -1) - (a.highest ?? -1) ||
      (b.highest === undefined ? 0 : b.share[b.highest]! - a.share[a.highest!]!) ||
      covered(b) - covered(a) ||
      a.name.localeCompare(b.name, 'es'),
  )
}

/** "SAN JUAN DE BIGOTE" → "San Juan de Bigote" */
export function titleCase(name: string): string {
  const small = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'el'])
  return name
    .toLowerCase()
    .split(' ')
    .map((word, index) => (index > 0 && small.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}

/** Los distritos de un departamento, de mayor a menor aviso y, a igual nivel, los más poblados primero. */
export function districtsOf(departmentName: string, districts: District[]): District[] {
  const wanted = normalize(departmentName)
  return districts
    .filter((district) => normalize(district.dep) === wanted)
    .sort((a, b) => b.nivel - a.nivel || b.poblacion - a.poblacion || a.dist.localeCompare(b.dist, 'es'))
}

/** Cuánta gente y cuántos centros poblados hay en zonas con aviso, por nivel (2, 3, 4). */
export function exposure(districts: District[]) {
  const personas = [0, 0, 0]
  const poblados = [0, 0, 0]
  for (const district of districts) {
    for (let i = 0; i < 3; i++) {
      personas[i]! += district.personas[i]!
      poblados[i]! += district.poblados[i]!
    }
  }
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
  return { personas, poblados, totalPersonas: sum(personas), totalPoblados: sum(poblados), altaPersonas: personas[1]! + personas[2]! }
}


// ---- Las formas de los distritos, para elegir uno tocando el mapa ----

/** Un distrito con su forma (simplificada). */
export interface Shape {
  ubigeo: string
  name: string
  population: number
  /** Las piezas del distrito; de cada una, el borde y luego sus huecos */
  polygons: Ring[][]
  /** Todos los anillos juntos, para preguntar si un punto está dentro (regla par-impar) */
  rings: Ring[]
  /** [oeste, sur, este, norte] */
  bounds: [number, number, number, number]
}

export interface Shapes {
  /** Nombre de cada departamento y provincia por su ubigeo (2 y 4 dígitos) */
  departments: Record<string, string>
  provinces: Record<string, string>
  list: Shape[]
}

let shapesPromise: Promise<Shapes> | undefined

/** Baja las formas de los distritos (unos 330 KB) la primera vez que se piden. */
export function loadShapes(): Promise<Shapes> {
  shapesPromise ??= fetch('/data/distritos-formas.json')
    .then((response) => {
      if (!response.ok) throw new Error(`distritos-formas.json: ${response.status}`)
      return response.json()
    })
    .then((json) => ({
      departments: json.departamentos,
      provinces: json.provincias,
      list: json.distritos.map(([ubigeo, name, population, polygons]: [string, string, number, Ring[][]]) => {
        const rings = polygons.flat()
        return { ubigeo, name, population, polygons, rings, bounds: boundsOf(rings) }
      }),
    }))
    .catch((error) => {
      shapesPromise = undefined // se vuelve a intentar la próxima vez
      throw error
    })
  return shapesPromise
}

/** El distrito que tiene un punto. */
export function shapeAt(shapes: Shapes, longitude: number, latitude: number): Shape | undefined {
  return shapes.list.find((shape) => {
    const [west, south, east, north] = shape.bounds
    return longitude >= west && longitude <= east && latitude >= south && latitude <= north && contains(shape.rings, longitude, latitude)
  })
}

/** El resumen de un departamento con el nivel más alto de sus distritos con aviso (sea de lluvia o de quebradas). */
export function withDistricts(home: Home, districts: District[]): Home {
  const top = districtsOf(home.name, districts).reduce((level, district) => Math.max(level, district.nivel - 2), -1)
  const highest = Math.max(home.highest ?? -1, top)
  return highest === (home.highest ?? -1) ? home : { ...home, highest }
}

/** Los distritos de una provincia (ubigeo de 4 dígitos). */
export function provinceShapes(shapes: Shapes, province: string): Shape[] {
  return shapes.list.filter((shape) => shape.ubigeo.startsWith(province))
}

/** El rectángulo que encierra varios distritos. */
export function boundsOfShapes(list: Shape[]): [number, number, number, number] {
  const bounds: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const shape of list) {
    bounds[0] = Math.min(bounds[0], shape.bounds[0])
    bounds[1] = Math.min(bounds[1], shape.bounds[1])
    bounds[2] = Math.max(bounds[2], shape.bounds[2])
    bounds[3] = Math.max(bounds[3], shape.bounds[3])
  }
  return bounds
}
