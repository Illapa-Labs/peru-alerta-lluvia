// El buscador de lugares: departamentos, provincias y distritos. Al escribir se completa con una lista, y sin escribir
// muestra los departamentos de mayor a menor aviso. Funciona con el teclado (flechas, Enter, Escape) y con el toque.
// Las provincias y los distritos salen de las formas de los distritos, que se empiezan a bajar al tocar el buscador
// (con buena conexión ya están bajadas).

import { type AppData, type Department, type Shapes, LEVELS, loadShapes, normalize, ranked, titleCase } from './data'

/** Lo que se eligió en el buscador */
export type Place =
  | { kind: 'department'; department: Department }
  | { kind: 'province'; prefix: string; shapes: Shapes }
  | { kind: 'district'; ubigeo: string; shapes: Shapes }

interface Option {
  name: string
  /** Dónde queda, para distinguir nombres repetidos: «Provincia · Piura», «Distrito · Piura, Piura» */
  where: string
  /** Índice en LEVELS, o nada si no tiene aviso */
  level?: number
  /** El nombre sin tildes ni mayúsculas, para comparar */
  key: string
  /** 0 departamento, 1 provincia, 2 distrito */
  rank: number
  /** Los habitantes: entre nombres parecidos, primero los lugares donde vive más gente */
  people: number
  place: () => Place
}

/** Cuántos resultados se muestran a la vez: los primeros bastan, el resto se encuentra escribiendo más */
const MAX = 30

export function setupSearch(data: AppData, onSelect: (place: Place) => void) {
  const input = document.getElementById('search-input') as HTMLInputElement
  const list = document.getElementById('search-list') as HTMLUListElement
  const box = document.getElementById('search')!

  let options: Option[] = []
  let active = -1
  let departments: Option[] | undefined
  let places: Option[] | undefined
  let loading = false

  // El nivel de cada distrito con aviso (los que no están, no tienen)
  const districtLevel = new Map(data.districts.map((district) => [district.ubigeo, district.nivel - 2]))

  const departmentOptions = (): Option[] =>
    // El orden se calcula al abrir por primera vez: cuesta un poco y casi nadie lo usa al cargar
    ranked(data.departments, data.areas, data.districts).map((home) => ({
      name: home.name,
      where: 'Departamento',
      level: home.highest,
      key: normalize(home.name),
      rank: 0,
      people: 0,
      place: () => ({ kind: 'department', department: data.departments.find((candidate) => candidate.name === home.name)! }),
    }))

  const placeOptions = (shapes: Shapes): Option[] => {
    const department = (ubigeo: string) => titleCase(shapes.departments[ubigeo.slice(0, 2)] ?? '')
    const top = new Map<string, number>()
    const people = new Map<string, number>()
    for (const shape of shapes.list) {
      const level = districtLevel.get(shape.ubigeo)
      const prefix = shape.ubigeo.slice(0, 4)
      if (level !== undefined && level > (top.get(prefix) ?? -1)) top.set(prefix, level)
      people.set(prefix, (people.get(prefix) ?? 0) + shape.population)
    }
    const provinces = Object.entries(shapes.provinces).map(([prefix, name]) => ({
      name: titleCase(name),
      where: `Provincia · ${department(prefix)}`,
      level: top.get(prefix),
      key: normalize(name),
      rank: 1,
      people: people.get(prefix) ?? 0,
      place: (): Place => ({ kind: 'province', prefix, shapes }),
    }))
    const districts = shapes.list.map((shape) => ({
      name: titleCase(shape.name),
      where: `Distrito · ${titleCase(shapes.provinces[shape.ubigeo.slice(0, 4)] ?? '')}, ${department(shape.ubigeo)}`,
      level: districtLevel.get(shape.ubigeo),
      key: normalize(shape.name),
      rank: 2,
      people: shape.population,
      place: (): Place => ({ kind: 'district', ubigeo: shape.ubigeo, shapes }),
    }))
    return [...provinces, ...districts]
  }

  /** Baja las formas (una sola vez) y vuelve a dibujar la lista cuando llegan */
  const prepare = () => {
    if (places || loading) return
    loading = true
    loadShapes()
      .then((shapes) => {
        places = placeOptions(shapes)
        if (!list.hidden) render()
      })
      .catch(() => {})
      .finally(() => (loading = false))
  }

  const render = () => {
    departments ??= departmentOptions()
    const query = normalize(input.value.trim())
    if (!query) {
      options = departments
    } else {
      // Primero el nombre exacto y los que empiezan con lo escrito; a igual, departamentos, provincias y distritos, y
      // entre ellos los más poblados
      const score = (option: Option) => (option.key === query ? 2 : option.key.startsWith(query) ? 1 : 0)
      options = [...departments, ...(places ?? [])]
        .filter((option) => option.key.includes(query))
        .sort((a, b) => score(b) - score(a) || a.rank - b.rank || b.people - a.people)
        .slice(0, MAX)
    }
    active = options.length > 0 ? 0 : -1

    list.replaceChildren()
    if (options.length === 0) {
      const empty = document.createElement('li')
      empty.className = 'empty'
      empty.textContent = places ? 'No hay un lugar con ese nombre' : 'Buscando provincias y distritos…'
      list.append(empty)
    }
    options.forEach((option, index) => {
      const item = document.createElement('li')
      item.id = `search-option-${index}`
      item.setAttribute('role', 'option')
      const swatch = document.createElement('span')
      swatch.className = 'swatch'
      swatch.style.background = option.level === undefined ? '#D5DCE3' : LEVELS[option.level]!.color
      const text = document.createElement('span')
      text.className = 'option-text'
      const name = document.createElement('span')
      name.className = 'option-name'
      name.textContent = option.name
      const where = document.createElement('span')
      where.className = 'option-where'
      where.textContent = option.where
      text.append(name, where)
      const level = document.createElement('span')
      level.className = 'option-level'
      level.textContent = option.level === undefined ? 'sin aviso' : LEVELS[option.level]!.name.toLowerCase()
      item.append(swatch, text, level)
      // mousedown y no click: el campo todavía tiene el foco y no se cierra antes de elegir
      item.addEventListener('mousedown', (event) => {
        event.preventDefault()
        choose(index)
      })
      list.append(item)
    })
    mark()
  }

  const mark = () => {
    list.querySelectorAll('[role=option]').forEach((item, index) => item.setAttribute('aria-selected', String(index === active)))
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', `search-option-${active}`)
      document.getElementById(`search-option-${active}`)?.scrollIntoView({ block: 'nearest' })
    } else {
      input.removeAttribute('aria-activedescendant')
    }
  }

  const open = () => {
    prepare()
    render()
    list.hidden = false
    input.setAttribute('aria-expanded', 'true')
  }

  const close = () => {
    list.hidden = true
    input.setAttribute('aria-expanded', 'false')
  }

  const choose = (index: number) => {
    const option = options[index]
    if (!option) return
    input.value = option.name
    close()
    input.blur()
    onSelect(option.place())
  }

  input.addEventListener('focus', () => {
    input.select()
    open()
  })
  input.addEventListener('input', open)
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (list.hidden) open()
      if (options.length === 0) return
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
      mark()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (active >= 0) choose(active)
    } else if (event.key === 'Escape') {
      close()
      input.blur()
    }
  })
  input.addEventListener('blur', close)
  // Tocar fuera cierra la lista (en el celular el campo puede conservar el foco)
  document.addEventListener('pointerdown', (event) => {
    if (!box.contains(event.target as Node)) close()
  })
}
