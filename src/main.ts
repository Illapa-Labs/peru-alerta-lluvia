import './style.css'
import { boundsOfShapes, departmentAt, loadData, loadShapes, normalize, provinceShapes, shapeAt, type Department, type Shape, type Shapes } from './data'
import { createPanel } from './panel'
import { setupSearch } from './search'
import type { HoverTarget, MapApi } from './map'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

async function main() {
  const data = await loadData()

  // El panel se muestra primero: con 3G el mapa tarda, y la alerta es lo importante
  let mapApi: MapApi | undefined
  let pendingFit: [number, number, number, number] | undefined
  const fit = (bounds: [number, number, number, number], maxZoom?: number) => (mapApi ? mapApi.fit(bounds, true, maxZoom) : (pendingFit = bounds))

  // El departamento que se muestra: el panel lo dice y el mapa le pone el contorno azul
  let selected: Department | undefined
  const departmentNamed = (name: string) => data.departments.find((department) => normalize(department.name) === normalize(name))

  // Al tocar el mapa se baja un escalón: primero la provincia y, estando en ella, sus distritos.
  let districtChosen = false
  let chosenUbigeo: string | undefined
  let focusedProvince: string | undefined
  let shapesReady: Shapes | undefined

  const clearDistrict = () => {
    districtChosen = false
    chosenUbigeo = undefined
    panel.showDistrict(undefined)
    mapApi?.selectDistrict(undefined)
  }
  const clearProvince = () => {
    focusedProvince = undefined
    panel.showProvince(undefined)
    mapApi?.focusProvince(undefined)
  }
  const show = (department: Department, source: 'inicio' | 'mapa') => {
    panel.showDepartment(department, source)
    selected = department
    mapApi?.select(department)
    clearProvince()
    clearDistrict()
  }

  /** Enfoca una provincia: el panel lista sus distritos y el mapa dibuja sus límites, que ya se pueden tocar. */
  const focusProvince = (shapes: Shapes, prefix: string, fly: boolean) => {
    const department = departmentNamed(shapes.departments[prefix.slice(0, 2)] ?? '')
    if (department && department.name !== panel.current()) show(department, 'mapa')
    clearDistrict()
    const districts = provinceShapes(shapes, prefix)
    focusedProvince = prefix
    panel.showProvince({ name: shapes.provinces[prefix] ?? '', distritos: districts })
    mapApi?.focusProvince(districts)
    if (fly) fit(boundsOfShapes(districts), 11)
  }

  /** Elige un distrito: el panel dice cuál es, el mapa le pone el contorno azul y va hasta él. */
  const chooseDistrict = (shapes: Shapes, shape: Shape) => {
    const prefix = shape.ubigeo.slice(0, 4)
    if (focusedProvince !== prefix) focusProvince(shapes, prefix, false)
    districtChosen = true
    chosenUbigeo = shape.ubigeo
    panel.showDistrict(shape, shapes)
    mapApi?.selectDistrict(shape)
    // El zoom se queda en el de la provincia: el distrito se ve dentro de ella y solo se mueve el mapa si hace falta
    mapApi?.reveal(shape.bounds)
  }

  const panel = createPanel($('panel'), data, {
    selectDistrict: async (ubigeo) => {
      const shapes = (shapesReady = await loadShapes())
      const shape = shapes.list.find((candidate) => candidate.ubigeo === ubigeo)
      if (shape) chooseDistrict(shapes, shape)
    },
    clearDistrict,
    goDepartment: () => {
      if (!selected) return
      show(selected, 'mapa')
      fit(selected.bounds)
    },
    goProvince: () => {
      if (focusedProvince && shapesReady) focusProvince(shapesReady, focusedProvince, true)
    },
  })
  document.body.classList.add('ready')

  // Al empezar el panel muestra Lima, con la lista de sus avisos, y el mapa todo el Perú, con todas las zonas de aviso
  const lima = data.departments.find((department) => department.name === 'Lima') ?? data.departments[0]
  if (lima) show(lima, 'inicio')
  const peru = data.departments.reduce<[number, number, number, number]>(
    ([west, south, east, north], { bounds }) => [Math.min(west, bounds[0]), Math.min(south, bounds[1]), Math.max(east, bounds[2]), Math.max(north, bounds[3])],
    [180, 90, -180, -90],
  )
  fit(peru)

  // ---- El buscador de departamentos ----
  setupSearch(data, (department) => {
    show(department, 'mapa')
    fit(department.bounds)
  })

  // ---- El mapa, después ----
  const { createMap } = await import('./map')
  mapApi = await createMap($('mapa'), data, {
    onClick(longitude, latitude) {
      // Se baja de a un escalón: en otro departamento el toque lo elige entero; dentro del departamento que ya se ve,
      // elige la provincia; y dentro de la provincia enfocada, un distrito.
      const shape = shapesReady && shapeAt(shapesReady, longitude, latitude)
      if (shapesReady && shape) {
        const prefix = shape.ubigeo.slice(0, 4)
        const sameDepartment = normalize(shapesReady.departments[prefix.slice(0, 2)] ?? '') === normalize(panel.current() ?? '')
        if (prefix === focusedProvince) return chooseDistrict(shapesReady, shape)
        if (sameDepartment) return focusProvince(shapesReady, prefix, true)
      }
      // En otro departamento, sin las formas (todavía se bajan) o fuera de un distrito, el toque elige el departamento entero
      void loadShapes()
        .then((shapes) => (shapesReady = shapes))
        .catch(() => {})
      const department = departmentAt(data.departments, longitude, latitude)
      if (department) {
        show(department, 'mapa')
        fit(department.bounds)
      }
    },
    onHover(longitude, latitude): HoverTarget | undefined {
      // Lo mismo que elegiría un toque en ese punto, pero sin elegirlo: se señala en azul
      if (shapesReady) {
        const shape = shapeAt(shapesReady, longitude, latitude)
        if (shape) {
          const prefix = shape.ubigeo.slice(0, 4)
          const sameDepartment = normalize(shapesReady.departments[prefix.slice(0, 2)] ?? '') === normalize(panel.current() ?? '')
          if (prefix === focusedProvince) return districtChosen && chosenUbigeo === shape.ubigeo ? undefined : { shapes: [shape] }
          if (sameDepartment) return { shapes: provinceShapes(shapesReady, prefix) }
        }
      }
      const department = departmentAt(data.departments, longitude, latitude)
      return department && department !== selected ? { department } : undefined
    },
    onMoveEnd(longitude, latitude, zoom) {
      // Al pasear por el mapa el panel cambia al departamento por el que pasas (no con el país entero a la vista).
      // Con una provincia enfocada el panel no se mueve solo: para ir a otra hay que tocarla.
      if (zoom < 6 || districtChosen || focusedProvince) return
      const department = departmentAt(data.departments, longitude, latitude)
      if (department && department.name !== panel.current()) show(department, 'mapa')
    },
  })
  document.body.classList.add('map-ready')
  // La lluvia hora por hora: el botón aparece con el mapa, y no baja nada hasta que se toca
  const { setupRain } = await import('./lluvia')
  const map = mapApi.map
  const showRain = () => {
    setupRain(map, data.departments.flatMap((department) => department.rings))
    $('lluvia-abrir').hidden = false
  }
  // Las capas de lluvia solo se pueden agregar con el estilo ya cargado
  if ((map as any).style?._loaded) showRain()
  else map.once('load', showRain)
  mapApi.select(selected)
  // Sin vuelo y sin inclinar, para que entre todo el Perú (con el mapa inclinado se cortaba el sur)
  // En el celular el mapa es la mitad de arriba y la barra de la lluvia tapa su parte de abajo: se deja ese espacio
  const narrow = window.matchMedia('(max-width: 800px)').matches
  const padding = narrow ? { top: 56, bottom: 140, left: 16, right: 16 } : 40
  if (pendingFit) mapApi.map.fitBounds(pendingFit, { padding, pitch: 0, bearing: 0, duration: 0 })

  // Con buena conexión las formas se bajan en cuanto el mapa está listo, para que el primer toque ya sea por provincia
  const connection = (navigator as any).connection as { saveData?: boolean; effectiveType?: string } | undefined
  if (!connection?.saveData && !/^(slow-2g|2g|3g)$/.test(connection?.effectiveType ?? '')) {
    ;(window.requestIdleCallback ?? ((callback: () => void) => setTimeout(callback, 1500)))(() =>
      void loadShapes()
        .then((shapes) => (shapesReady = shapes))
        .catch(() => {}),
    )
  }
}

main()
