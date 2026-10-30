// El mapa, con MapLibre GL JS: relieve 3D, calles, el aviso, los departamentos y el contorno del
// Perú. Se carga después de mostrar el panel, porque es lo más pesado de la página.

import type { GeoJSONSource, Map as GlMap, MapMouseEvent, StyleSpecification } from 'maplibre-gl'
import { type AppData, type Department, type Shape, LEVELS } from './data'
// El worker se empaqueta junto con lo que usa, así funciona igual en desarrollo y en producción
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

/** Dónde empieza el mapa: Lima, mirando hacia los Andes. */
const START = { center: [-76.95, -11.95] as [number, number], zoom: 10, pitch: 58 }

/** El Perú con margen: el mapa no se va más lejos, lo que lo hace mucho más barato. Es más ancho que el país porque
 * la vista no puede salirse de este rectángulo: si fuera justo, en una pantalla ancha no entraría el Perú entero. */
const MAX_BOUNDS: [number, number, number, number] = [-88.5, -20.5, -61.5, 2.0]

const OPENFREEMAP = 'https://tiles.openfreemap.org/planet'
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

const EMPTY = { type: 'FeatureCollection', features: [] } as const

const LEVEL_COLORS: any[] = LEVELS.flatMap((level) => [level.nivel, level.color])

function style(data: AppData): StyleSpecification {
  return {
    version: 8,
    sources: {
      calles: { type: 'vector', url: OPENFREEMAP },
      relieve: { type: 'raster-dem', tiles: [TERRARIUM], encoding: 'terrarium', tileSize: 512, maxzoom: 15, attribution: 'Elevación: Mapzen / AWS Terrain Tiles' },
      aviso: { type: 'geojson', data: data.avisoGeoJson ?? { type: 'FeatureCollection', features: [] } },
      // El contorno del departamento que se señala (azul) y el elegido (azul más fuerte)
      'dep-hover': { type: 'geojson', data: EMPTY },
      'dep-seleccion': { type: 'geojson', data: EMPTY },
      'prov-foco': { type: 'geojson', data: EMPTY },
      'formas-hover': { type: 'geojson', data: EMPTY },
      'dist-seleccion': { type: 'geojson', data: EMPTY },
    },
    terrain: { source: 'relieve', exaggeration: 1.25 },
    layers: [
      { id: 'fondo', type: 'background', paint: { 'background-color': '#ECEFF3' } },
      {
        id: 'sombras',
        type: 'hillshade',
        source: 'relieve',
        paint: { 'hillshade-exaggeration': 0.55, 'hillshade-shadow-color': '#5B6675', 'hillshade-highlight-color': '#FFFFFF', 'hillshade-accent-color': '#8E99A8' },
      },
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
      {
        id: 'limite-peru',
        type: 'line',
        source: 'calles',
        'source-layer': 'boundary',
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

export async function createMap(container: HTMLElement, data: AppData, handlers: MapHandlers): Promise<MapApi> {
  const [maplibregl] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])

  maplibregl.setWorkerUrl(workerUrl)
  const narrow = matchMedia('(max-width: 800px)').matches
  const map = new maplibregl.Map({
    container,
    style: style(data),
    ...START,
    maxBounds: MAX_BOUNDS,
    minZoom: 4,
    maxPitch: 80,
    attributionControl: false,
    // Gastar menos: sin antialiasing, y los mosaicos que no se ven no se guardan de más
    canvasContextAttributes: { antialias: false },
    maxTileCacheSize: 60,
  })
  // Solo en desarrollo: para mirar el mapa desde la consola
  if (import.meta.env.DEV) (window as any).__map = map
  map.touchZoomRotate.enableRotation()

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
      const margin = 40
      const visible = [[west, south], [east, south], [east, north], [west, north]].every((corner) => {
        const point = map.project(corner as [number, number])
        return point.x >= margin && point.y >= margin && point.x <= canvas.clientWidth - margin && point.y <= canvas.clientHeight - margin
      })
      if (!visible) map.easeTo({ center: [(west + east) / 2, (south + north) / 2], duration: 800 })
    },
    fit(bounds, animate = true, maxZoom = 11) {
      map.fitBounds(bounds, {
        padding: 40,
        pitch: 25,
        bearing: 0,
        maxZoom,
        duration: animate ? 1400 : 0,
      })
    },
  }
}
