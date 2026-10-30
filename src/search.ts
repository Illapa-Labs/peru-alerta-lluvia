// El buscador de departamentos: al escribir se completa con una lista, y sin escribir muestra todos
// de mayor a menor aviso. Funciona con el teclado (flechas, Enter, Escape) y con el toque.

import { type AppData, type Department, type Home, LEVELS, normalize, ranked } from './data'

export function setupSearch(data: AppData, onSelect: (department: Department) => void) {
  const input = document.getElementById('search-input') as HTMLInputElement
  const list = document.getElementById('search-list') as HTMLUListElement
  const box = document.getElementById('search')!

  let options: Home[] = []
  let active = -1
  let all: Home[] | undefined

  const render = () => {
    // El orden se calcula al abrir por primera vez: cuesta un poco y casi nadie lo usa al cargar
    all ??= ranked(data.departments, data.areas, data.districts)
    const query = normalize(input.value)
    options = query
      ? all.filter((home) => normalize(home.name).includes(query)).sort((a, b) => Number(!normalize(a.name).startsWith(query)) - Number(!normalize(b.name).startsWith(query)))
      : all
    active = options.length > 0 ? 0 : -1

    list.replaceChildren()
    if (options.length === 0) {
      const empty = document.createElement('li')
      empty.className = 'empty'
      empty.textContent = 'No hay un departamento con ese nombre'
      list.append(empty)
    }
    options.forEach((home, index) => {
      const item = document.createElement('li')
      item.id = `search-option-${index}`
      item.setAttribute('role', 'option')
      const swatch = document.createElement('span')
      swatch.className = 'swatch'
      swatch.style.background = home.highest === undefined ? '#D5DCE3' : LEVELS[home.highest]!.color
      const name = document.createElement('span')
      name.className = 'option-name'
      name.textContent = home.name
      const level = document.createElement('span')
      level.className = 'option-level'
      level.textContent = home.highest === undefined ? 'sin aviso' : LEVELS[home.highest]!.name.toLowerCase()
      item.append(swatch, name, level)
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
    render()
    list.hidden = false
    input.setAttribute('aria-expanded', 'true')
  }

  const close = () => {
    list.hidden = true
    input.setAttribute('aria-expanded', 'false')
  }

  const choose = (index: number) => {
    const home = options[index]
    const department = home && data.departments.find((candidate) => candidate.name === home.name)
    if (!department) return
    input.value = department.name
    close()
    input.blur()
    onSelect(department)
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
