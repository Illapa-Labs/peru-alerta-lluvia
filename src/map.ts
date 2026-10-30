// El mapa, con MapLibre GL JS: plano (2D), con calles, ríos, el aviso, los departamentos y el contorno del Perú. Se
// carga después de mostrar el panel, porque es lo más pesado de la página. Es plano para que abra rápido y gaste pocos
// datos: el relieve 3D (los mosaicos de elevación y su sombreado) era lo más pesado del mapa, y queda para una vista
// aparte, más detallada, que se abra a pedido.

import type { GeoJSONSource, Map as GlMap, MapMouseEvent, StyleSpecification } from 'maplibre-gl'
import { type AppData, type Department, type Shape, LEVELS } from './data'
// El worker se empaqueta junto con lo que usa, así funciona igual en desarrollo y en producción
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

/** Dónde empieza el mapa si no se le dice otra cosa: todo el Perú */
const PERU: [number, number, number, number] = [-81.4, -18.4, -68.6, 0.0]

/** El Perú con margen: el mapa no se va más lejos, lo que lo hace mucho más barato. Es más ancho que el país porque
 * la vista no puede salirse de este rectángulo: si fuera justo, en una pantalla ancha no entraría el Perú entero. */
const MAX_BOUNDS: [number, number, number, number] = [-88.5, -20.5, -61.5, 2.0]

const OPENFREEMAP = 'https://tiles.openfreemap.org/planet'

const EMPTY = { type: 'FeatureCollection', features: [] } as const

const LEVEL_COLORS: any[] = LEVELS.flatMap((level) => [level.nivel, level.color])

/**
 * El contorno del Perú hecho con los departamentos: los bordes que tiene un solo departamento son los del país (los que
 * comparten dos son límites entre departamentos). Los mosaicos de calles traen el límite del país, pero solo desde el
 * zoom 5: con el Perú entero a la vista no lo dibujaban.
 */
function peruOutline(departments: Department[]) {
  const key = ([x, y]: number[]) => `${x!.toFixed(5)},${y!.toFixed(5)}`
  const seen = new Map<string, { segment: number[][]; count: number }>()
  for (const department of departments) {
    for (const ring of department.rings) {
      for (let i = 0; i + 1 < ring.length; i++) {
        const a = ring[i]!
        const b = ring[i + 1]!
        const id = [key(a), key(b)].sort().join('|')
        const entry = seen.get(id)
        if (entry) entry.count++
        else seen.set(id, { segment: [a, b], count: 1 })
      }
    }
  }
  const lines = [...seen.values()].filter((entry) => entry.count === 1).map((entry) => entry.segment)
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'MultiLineString' as const, coordinates: lines } }
}

function style(data: AppData): StyleSpecification {
  return {
    version: 8,
    sources: {
      calles: { type: 'vector', url: OPENFREEMAP },
      aviso: { type: 'geojson', data: data.avisoGeoJson ?? { type: 'FeatureCollection', features: [] } },
      // El contorno del departamento que se señala (azul) y el elegido (azul más fuerte)
      'dep-hover': { type: 'geojson', data: EMPTY },
      'dep-seleccion': { type: 'geojson', data: EMPTY },
      'prov-foco': { type: 'geojson', data: EMPTY },
      'formas-hover': { type: 'geojson', data: EMPTY },
      'dist-seleccion': { type: 'geojson', data: EMPTY },
      'peru-contorno': { type: 'geojson', data: peruOutline(data.departments) },
    },
    layers: [
      { id: 'fondo', type: 'background', paint: { 'background-color': '#ECEFF3' } },
      { id: 'agua', type: 'fill', source: 'calles', 'source-layer': 'water', paint: { 'fill-color': '#B0CCE8' } },
      {
        id: 'edificios',
        type: 'line',
        source: 'calles',
        'source-layer': 'building',
        minzoom: 14,
        paint: { 'line-color': '#8E99A8', 'line-width': 0.6 },
      },
      {
        id: 'calles',
        type: 'line',
        source: 'calles',
        'source-layer': 'transportation',
        filter: ['!', ['in', ['get', 'class'], ['literal', ['ferry', 'aerialway', 'rail', 'transit']]]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#5B6675',
          'line-opacity': 0.85,
          'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.4, 12, ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 1.6, 0.7], 16, ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], 4, 2]],
        },
      },
      {
        id: 'aviso-relleno',
        type: 'fill',
        source: 'aviso',
        paint: { 'fill-color': (['match', ['get', 'nivel'], ...LEVEL_COLORS, '#9AA5B1'] as any), 'fill-opacity': 0.4 },
      },
      {
        id: 'aviso-linea',
        type: 'line',
        source: 'aviso',
        paint: { 'line-color': (['match', ['get', 'nivel'], ...LEVEL_COLORS, '#9AA5B1'] as any), 'line-width': 1.4, 'line-opacity': 0.9 },
      },
      // Los ríos van sobre el color del aviso, para que se vean
      {
        id: 'rios',
        type: 'line',
        source: 'calles',
        'source-layer': 'waterway',
        filter: ['==', ['get', 'class'], 'river'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#3F86CB', 'line-opacity': 0.55, 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 4, 0.8, 8, 2, 11, 3.2, 14, 7] },
      },
      {
        id: 'quebradas',
        type: 'line',
        source: 'calles',
        'source-layer': 'waterway',
        minzoom: 8,
        filter: ['!', ['in', ['get', 'class'], ['literal', ['river', 'canal', 'drain', 'ditch']]]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#5A9BD9', 'line-opacity': 0.5, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 11, 1.4, 14, 2.6] },
      },
      // Los límites vienen de los mismos mosaicos de calles (OpenStreetMap): tienen el detalle de cada
      // zoom, y nada más que bajar. Nivel 2 es el país, 4 el departamento, 6 la provincia.
      {
        id: 'limite-provincias',
        type: 'line',
        source: 'calles',
        'source-layer': 'boundary',
        minzoom: 8,
        filter: ['all', ['==', ['get', 'admin_level'], 6], ['==', ['get', 'maritime'], 0]],
        paint: { 'line-color': '#4A5866', 'line-opacity': 0.55, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 13, 1.1], 'line-dasharray': [3, 2] },
      },
      {
        id: 'limite-departamentos',
        type: 'line',
        source: 'calles',
        'source-layer': 'boundary',
        filter: ['all', ['==', ['get', 'admin_level'], 4], ['==', ['get', 'maritime'], 0]],
        paint: { 'line-color': '#4A5866', 'line-opacity': 0.8, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 10, 1.6] },
      },
      // El país: con el Perú entero a la vista, el contorno hecho con los departamentos; más cerca, el límite de los
      // mosaicos, que tiene más detalle
      {
        id: 'contorno-peru',
        type: 'line',
        source: 'peru-contorno',
        maxzoom: 5,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#17202A', 'line-opacity': 0.9, 'line-width': 1.4 },
      },
      {
        id: 'limite-peru',
        type: 'line',
        source: 'calles',
        'source-layer': 'boundary',
        minzoom: 5,
        filter: ['all', ['==', ['get', 'admin_level'], 2], ['==', ['get', 'maritime'], 0], ['any', ['==', ['get', 'adm0_l'], 'PER'], ['==', ['get', 'adm0_r'], 'PER']]],
        paint: { 'line-color': '#17202A', 'line-opacity': 0.9, 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.4, 10, 3] },
      },
      { id: 'prov-relleno', type: 'fill', source: 'prov-foco', paint: { 'fill-color': '#1D6FE0', 'fill-opacity': 0.05 } },
      { id: 'prov-linea', type: 'line', source: 'prov-foco', layout: { 'line-join': 'round' }, paint: { 'line-color': '#1D6FE0', 'line-opacity': 0.7, 'line-width': 1.3 } },
      { id: 'dist-relleno', type: 'fill', source: 'dist-seleccion', paint: { 'fill-color': '#1D6FE0', 'fill-opacity': 0.12 } },
      { id: 'formas-hover-relleno', type: 'fill', source: 'formas-hover', paint: { 'fill-color': '#1D6FE0', 'fill-opacity': 0.1 } },
      { id: 'formas-hover-linea', type: 'line', source: 'formas-hover', layout: { 'line-join': 'round' }, paint: { 'line-color': '#1D6FE0', 'line-opacity': 0.85, 'line-width': 2.2 } },
      { id: 'dep-hover', type: 'line', source: 'dep-hover', layout: { 'line-join': 'round' }, paint: { 'line-color': '#1D6FE0', 'line-opacity': 0.8, 'line-width': 2.4 } },
      { id: 'dep-seleccion', type: 'line', source: 'dep-seleccion', layout: { 'line-join': 'round' }, paint: { 'line-color': '#1D6FE0', 'line-opacity': 1, 'line-width': 3.6 } },
      { id: 'dist-linea', type: 'line', source: 'dist-seleccion', layout: { 'line-join': 'round' }, paint: { 'line-color': '#1D6FE0', 'line-opacity': 1, 'line-width': 2.6 } },
    ],
  }
}

export interface MapApi {
  map: GlMap
  /** El departamento elegido: su contorno se pone azul */
  select(department: Department | undefined): void
  /** La provincia enfocada: se dibujan los límites de sus distritos, que son los que se pueden tocar */
  focusProvince(shapes: Shape[] | undefined): void
  /** El distrito elegido: su contorno se pone azul */
  selectDistrict(shape: Shape | undefined): void
  /** Que el rectángulo se vea, sin cambiar el zoom: no se mueve si ya está a la vista */
  reveal(bounds: [number, number, number, number]): void
  fit(bounds: [number, number, number, number], animate?: boolean, maxZoom?: number): void
}

/** Lo que se señala con el mouse: un departamento, o los distritos de una provincia o uno solo. */
export type HoverTarget = { department: Department } | { shapes: Shape[] }

export interface MapHandlers {
  /** Un toque en el mapa, sin arrastrar */
  onClick(longitude: number, latitude: number): void
  /** Cuando el mapa termina de moverse: dónde quedó el centro y a qué zoom */
  onMoveEnd(longitude: number, latitude: number, zoom: number): void
  /** El mouse está sobre un punto: qué se elegiría con un toque ahí (departamento, provincia o distrito), o nada */
  onHover(longitude: number, latitude: number): HoverTarget | undefined
}

/**
 * Lo que tapa el mapa en cada borde. En el celular el mapa ocupa toda la pantalla: arriba están el buscador y la
 * leyenda, y abajo la hoja del panel (su alto lo dice --sheet, ver main.ts) con la lluvia encima. Al encuadrar un lugar
 * se deja ese espacio. No se usa map.setPadding: cambiarlo mientras el mapa se mueve detiene el movimiento.
 */
export function viewPadding(): { top: number; bottom: number; left: number; right: number } {
  if (!matchMedia('(max-width: 800px)').matches) return { top: 40, bottom: 40, left: 40, right: 40 }
  const sheet = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sheet')) || 150
  const RAIN_BAR = 100
  return { top: 96, bottom: sheet + RAIN_BAR + 12, left: 16, right: 16 }
}

/** `bounds`: lo que se ve al abrir (el lugar de la dirección, o el Perú). Empezar ahí evita bajar mosaicos de otro lugar. */
export async function createMap(container: HTMLElement, data: AppData, handlers: MapHandlers, bounds = PERU): Promise<MapApi> {
  const [maplibregl] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])

  maplibregl.setWorkerUrl(workerUrl)
  const narrow = matchMedia('(max-width: 800px)').matches
  const map = new maplibregl.Map({
    container,
    style: style(data),
    bounds,
    fitBoundsOptions: { padding: viewPadding() },
    maxBounds: MAX_BOUNDS,
    minZoom: 4,
    // Plano: sin inclinar ni girar
    maxPitch: 0,
    dragRotate: false,
    pitchWithRotate: false,
    attributionControl: false,
    // Gastar menos: sin antialiasing, y los mosaicos que no se ven no se guardan de más
    canvasContextAttributes: { antialias: false },
    maxTileCacheSize: 60,
  })
  // Solo en desarrollo: para mirar el mapa desde la consola
  if (import.meta.env.DEV) (window as any).__map = map
  map.touchZoomRotate.disableRotation()

  // La atribución: en el celular va arriba, debajo del buscador (abajo están la lluvia y la hoja del panel), y empieza
  // cerrada en el botón «i» (MapLibre la abre al cargar los datos; se cierra apenas lo hace). En escritorio hay lugar:
  // va abajo y queda abierta.
  map.addControl(new maplibregl.AttributionControl({ compact: true }), narrow ? 'top-right' : 'bottom-right')
  const collapseAttribution = () => {
    const attribution = container.querySelector('.maplibregl-ctrl-attrib.maplibregl-compact-show')
    if (!attribution) return
    attribution.classList.remove('maplibregl-compact-show')
    attribution.removeAttribute('open')
    map.off('sourcedata', collapseAttribution)
  }
  if (narrow) map.on('sourcedata', collapseAttribution)

  // Un toque sin arrastrar pregunta por el lugar
  map.on('click', (event: MapMouseEvent) => handlers.onClick(event.lngLat.lng, event.lngLat.lat))
  map.on('moveend', () => {
    const center = map.getCenter()
    handlers.onMoveEnd(center.lng, center.lat, map.getZoom())
  })

  // El contorno de un departamento como líneas (sus anillos)
  const outline = (department: Department | undefined) => ({
    type: 'FeatureCollection' as const,
    features: department ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'MultiLineString' as const, coordinates: department.rings } }] : [],
  })
  let selected: Department | undefined
  let hovered: Department | undefined
  const setSource = (name: string, department: Department | undefined) => (map.getSource(name) as GeoJSONSource | undefined)?.setData(outline(department))

  // Al pasar el mouse se señala (en azul) lo que se elegiría con un toque: un departamento, una provincia o un
  // distrito, según el escalón en que estés. En cada movimiento solo se mira un punto, y solo se vuelve a dibujar
  // si cambió lo señalado.
  let hoveredKey: string | undefined
  const setHover = (target: HoverTarget | undefined, key: string | undefined) => {
    if (key === hoveredKey) return
    hoveredKey = key
    hovered = target && 'department' in target ? target.department : undefined
    setSource('dep-hover', hovered)
    const shapes = target && 'shapes' in target ? target.shapes : []
    ;(map.getSource('formas-hover') as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: shapes.map((shape) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'MultiPolygon' as const, coordinates: shape.polygons } })),
    })
  }
  let pending = false
  map.on('mousemove', (event: MapMouseEvent) => {
    if (pending) return
    pending = true
    requestAnimationFrame(() => {
      pending = false
      const target = handlers.onHover(event.lngLat.lng, event.lngLat.lat)
      const key = !target ? undefined : 'department' in target ? `d:${target.department.name}` : `s:${target.shapes.map((shape) => shape.ubigeo).join(',')}`
      setHover(target, key)
      map.getCanvas().style.cursor = target ? 'pointer' : ''
    })
  })
  map.on('mouseout', () => setHover(undefined, undefined))

  return {
    map,
    select(department) {
      selected = department
      const apply = () => {
        if (hovered === selected) setSource('dep-hover', (hovered = undefined))
        setSource('dep-seleccion', selected)
      }
      // Al empezar el estilo puede no haber terminado de cargar
      if (map.getSource('dep-seleccion')) apply()
      else map.once('load', apply)
    },
    focusProvince(shapes) {
      const apply = () =>
        (map.getSource('prov-foco') as GeoJSONSource | undefined)?.setData({
          type: 'FeatureCollection',
          features: shapes ? shapes.map((shape) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'MultiPolygon' as const, coordinates: shape.polygons } })) : [],
        })
      if (map.getSource('prov-foco')) apply()
      else map.once('load', apply)
    },
    selectDistrict(shape) {
      const apply = () =>
        (map.getSource('dist-seleccion') as GeoJSONSource | undefined)?.setData({
          type: 'FeatureCollection',
          features: shape ? [{ type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: shape.polygons } }] : [],
        })
      if (map.getSource('dist-seleccion')) apply()
      else map.once('load', apply)
    },
    reveal(bounds) {
      const [west, south, east, north] = bounds
      const canvas = map.getCanvas()
      const padding = viewPadding()
      const visible = [[west, south], [east, south], [east, north], [west, north]].every((corner) => {
        const point = map.project(corner as [number, number])
        return point.x >= padding.left && point.y >= padding.top && point.x <= canvas.clientWidth - padding.right && point.y <= canvas.clientHeight - padding.bottom
      })
      // Si no se ve entero, se encuadra (sin acercar más que ahora)
      if (!visible) map.fitBounds(bounds, { padding, maxZoom: map.getZoom(), duration: 800 })
    },
    fit(bounds, animate = true, maxZoom = 11) {
      map.fitBounds(bounds, {
        padding: viewPadding(),
        pitch: 0,
        bearing: 0,
        maxZoom,
        duration: animate ? 1400 : 0,
      })
    },
  }
}
