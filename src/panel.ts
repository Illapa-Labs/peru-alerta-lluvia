// El panel del aviso de lluvia, según el diseño "Escritorio · panel de aviso". Todo el texto está
// en español y en un tono sobrio. Se construye con textContent: los datos de la API nunca se
// interpretan como HTML.

import { CALM, type AppData, type Department, type District, type Home, type Level, type Shape, type Shapes, LEVELS, districtsOf, exposure, homeOf as sharedHomeOf, neighborsOf, normalize, titleCase, withDistricts } from './data'

type Child = Node | string

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, ...children: Child[]): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  if (className) element.className = className
  element.append(...children)
  return element
}

const text = (content: string, className: string) => el('span', className, content)

const MONTHS = ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'set.', 'oct.', 'nov.', 'dic.']
const WEEKDAYS = ['dom.', 'lun.', 'mar.', 'mié.', 'jue.', 'vie.', 'sáb.']

function parseDate(fecha: string): Date | undefined {
  const date = new Date(`${fecha.replace('Z', '').slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const shortDate = (fecha: string) => {
  const date = parseDate(fecha)
  return date && `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`
}
/** Si el aviso es de antes de ayer (en la hora de Lima): el SENAMHI publica uno cada día, así que ya no está al día */
const isStale = (fecha: string, now = Date.now()) => {
  const date = parseDate(fecha)
  if (!date) return false
  const lima = new Date(now - 5 * 3_600_000)
  const today = Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), lima.getUTCDate(), 12)
  return today - date.getTime() > 86_400_000
}
const longDate = (fecha: string) => {
  const date = parseDate(fecha)
  return date && `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

const percent = (share: number) => {
  const rounded = Math.round(share * 100)
  return rounded === 0 && share > 0 ? 'menos de 1 %' : `${rounded} %`
}

const zones = (count: number) => `${count} ${count === 1 ? 'zona' : 'zonas'}`

/** De dónde viene el departamento que se muestra. */
export type Source = 'inicio' | 'mapa'

export interface PanelApi {
  /** El resumen de un departamento: el de inicio, el de tu ubicación o el que se mira en el mapa */
  showDepartment(department: Department, source: Source): void
  /** La provincia enfocada con sus distritos, o ninguna */
  showProvince(province: { name: string; distritos: Shape[] } | undefined): void
  /** El distrito elegido (tocándolo en el mapa o en la lista), o ninguno */
  showDistrict(shape: Shape | undefined, shapes?: Shapes): void
  /** El nombre del departamento que se muestra */
  current(): string | undefined
}

export interface PanelHandlers {
  /** Se eligió un distrito de la lista */
  selectDistrict(ubigeo: string): void
  /** Se quitó la selección del distrito */
  clearDistrict(): void
  /** Se volvió al departamento (desde el hilo de migas) */
  goDepartment(): void
  /** Se volvió a la provincia */
  goProvince(): void
}

export function createPanel(root: HTMLElement, data: AppData, handlers: PanelHandlers): PanelApi {
  const { areas, departments } = data

  const count = (level: number) => areas.filter((area) => area.level === level).length
  const highest = [...LEVELS.keys()].reverse().find((level) => count(level) > 0)

  let shown: { home: Home; neighbors: Home[]; source: Source } | undefined
  let province: { name: string; distritos: Shape[] } | undefined
  let chosen: { shape: Shape; province: string } | undefined
  let showAllDistricts = false
  let picked = highest ?? 0

  const placeBody = el('div', 'place')
  const nearBody = el('div', 'what')
  const exposureBody = el('div', 'what')
  const scale = el('div')
  const official = el('div', 'official')

  // ---- De qué día es el aviso ----
  // El panel no lleva un encabezado con el nombre del SENAMHI: haría parecer que esta web es oficial. La fuente se dice
  // en el resumen, con la fecha. No se dice «hoy»: el aviso del día se publica durante el día, y hasta entonces sigue el de ayer
  const issued = areas[0] && shortDate(areas[0].fecha)
  const stale = areas[0] !== undefined && isStale(areas[0].fecha)

  function card(fill: string, border: string, ...children: Child[]) {
    const box = el('div', 'card', ...children)
    box.style.background = fill
    box.style.borderColor = border
    return box
  }

  function levelHeader(level: Level) {
    const badge = el('div', 'badge', text('NIVEL', 'badge-label'), text(String(level.n), 'badge-number'))
    badge.style.background = level.strong
    const name = text(level.name, 'level-name')
    name.style.color = level.ink
    const rain = text(level.rain, 'level-rain')
    rain.style.color = level.ink
    return el('div', 'level-header', badge, el('div', 'level-text', name, rain))
  }

  function todoBox(level: Level) {
    const title = text('QUÉ HACER', 'label')
    title.style.color = level.ink
    return el('div', 'todo', title, text(level.hereTodo, 'body'))
  }

  function ink(content: string, level: Level, className: string) {
    const p = el('p', className, content)
    p.style.color = level.ink
    return p
  }

  function swatchOf(color: string, className = 'swatch') {
    const swatch = el('span', className)
    swatch.style.background = color
    return swatch
  }

  function swatchRow(level: Level, content: string, textColor?: string) {
    const row = el('p', 'row')
    if (textColor) row.style.color = textColor
    row.append(swatchOf(level.color), content)
    return row
  }

  /** Una fila de las listas de distritos: se elige con un toque, con Enter o con espacio. */
  function districtRow(ubigeo: string, color: string, lines: HTMLElement[], levelName: string) {
    const row = el('li', '', swatchOf(color), el('span', 'district-text', ...lines), text(levelName, 'near-level'))
    row.tabIndex = 0
    row.setAttribute('role', 'button')
    if (chosen?.shape.ubigeo === ubigeo) row.classList.add('chosen')
    const choose = () => {
      if (!ubigeo) return
      setOpen(false)
      handlers.selectDistrict(ubigeo)
    }
    row.addEventListener('click', choose)
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        choose()
      }
    })
    return row
  }

  /** El botón que muestra todos los distritos de la lista o solo los primeros. */
  function moreButton(total: number) {
    const more = el('button', 'more', showAllDistricts ? 'Mostrar menos' : `Mostrar los ${total} distritos`)
    more.addEventListener('click', () => {
      showAllDistricts = !showAllDistricts
      renderPlace()
    })
    return more
  }

  function homeCard(home: Home) {
    if (home.highest === undefined) {
      return card('#F3F6F8', '#D5DCE3', text('Sin aviso hoy', 'card-title'), el('p', 'body', `Hoy no hay un aviso de lluvia en ningún lugar de ${home.name}. Aun así, mantente atento a la información oficial.`))
    }
    const level = LEVELS[home.highest]!
    const rows = [...LEVELS.keys()]
      .reverse()
      .filter((index) => home.share[index]! > 0)
      .map((index) => swatchRow(LEVELS[index]!, `${LEVELS[index]!.name}: ${percent(home.share[index]!)} del departamento`, level.ink))
    // Niveles que solo tienen distritos con aviso de activación de quebradas, sin parte del departamento del aviso de lluvia
    const byDistricts = districtsOf(home.name, data.districts)
    for (const index of [...LEVELS.keys()].reverse()) {
      const count = byDistricts.filter((district) => district.nivel - 2 === index).length
      if (count > 0 && home.share[index] === 0) rows.unshift(swatchRow(LEVELS[index]!, `${LEVELS[index]!.name}: ${count} ${count === 1 ? 'distrito' : 'distritos'}`, level.ink))
    }
    return card(
      level.soft,
      level.border,
      levelHeader(level),
      ink(`El aviso más alto en ${home.name} es ${level.short.toLowerCase()}. ${level.here.replace('en esta zona', 'en parte del departamento')}`, level, 'lead'),
      ...rows,
      home.none > 0 ? el('p', 'small muted', `Sin aviso: ${percent(home.none)} del departamento`) : '',
      todoBox(level),
    )
  }

  /** Cuánta gente vive en los centros poblados dentro de zonas de aviso de quebradas. */
  function renderExposure() {
    exposureBody.replaceChildren()
    if (!shown) return
    const people = exposure(districtsOf(shown.home.name, data.districts))
    if (people.totalPersonas === 0) {
      exposureBody.append(el('p', 'small muted', 'No hay centros poblados en zonas con aviso de activación de quebradas en este departamento.'))
      return
    }
    exposureBody.append(el('p', '', el('strong', '', `${number(people.totalPersonas)} personas`), ` viven en ${number(people.totalPoblados)} centros poblados dentro de zonas con aviso de activación de quebradas en ${shown.home.name}${people.altaPersonas > 0 ? `; ${number(people.altaPersonas)} de ellas en zonas con aviso naranja o rojo` : ''}.`), el('p', 'small muted', 'Es la población de los centros poblados dentro de esas zonas. No significa que todas esas personas se vean afectadas.'))
  }

  const number = (value: number) => value.toLocaleString('es-PE')

  /** El aviso de un distrito: la tarjeta grande de ese escalón. */
  function districtMain(shape: Shape) {
    const info: District | undefined = data.districts.find((district) => district.ubigeo === shape.ubigeo)
    const level = info ? LEVELS[info.nivel - 2] : undefined
    if (!level || !info) {
      return card('#F3F6F8', '#D5DCE3', text('Sin aviso hoy', 'card-title'), el('p', 'body', 'Hoy no hay un aviso de lluvia en este distrito.'))
    }
    const places = info.poblados.reduce((a, b) => a + b, 0)
    const inZone = info.personas.reduce((a, b) => a + b, 0)
    return card(
      level.soft,
      level.border,
      levelHeader(level),
      ink(level.here.replace('en esta zona', 'en parte de este distrito'), level, 'lead'),
      places > 0 ? ink(`En zona de aviso: ${places} ${places === 1 ? 'centro poblado' : 'centros poblados'} · ${number(inZone)} personas`, level, 'small') : '',
      todoBox(level),
    )
  }

  /** El aviso de una provincia: el nivel más alto de sus distritos. */
  function provinceMain(focus: { name: string; distritos: Shape[] }) {
    const levels = new Map(data.districts.map((district) => [district.ubigeo, district.nivel]))
    const flagged = focus.distritos.filter((shape) => levels.has(shape.ubigeo))
    const top = flagged.reduce((top, shape) => Math.max(top, levels.get(shape.ubigeo)! - 2), -1)
    if (top < 0) {
      return card('#F3F6F8', '#D5DCE3', text('Sin aviso hoy', 'card-title'), el('p', 'body', 'Hoy no hay un aviso de lluvia en ningún distrito de esta provincia.'))
    }
    const level = LEVELS[top]!
    const rows = [...LEVELS.keys()].reverse().flatMap((index) => {
      const n = flagged.filter((shape) => levels.get(shape.ubigeo)! - 2 === index).length
      return n > 0 ? [swatchRow(LEVELS[index]!, `${LEVELS[index]!.name}: ${n} ${n === 1 ? 'distrito' : 'distritos'}`, level.ink)] : []
    })
    return card(
      level.soft,
      level.border,
      levelHeader(level),
      ink(`El aviso más alto en la provincia es ${level.short.toLowerCase()}: ${flagged.length} de ${focus.distritos.length} distritos tienen aviso.`, level, 'lead'),
      ...rows,
      todoBox(level),
    )
  }

  /** Los distritos de la provincia enfocada: son los que se pueden tocar en el mapa. */
  function provinceBlock(focus: { name: string; distritos: Shape[] }): Node[] {
    const blocks: Node[] = []
    blocks.push(el('h3', 'sub', chosen ? `Otros distritos de la provincia · ${focus.distritos.length}` : `Distritos · ${focus.distritos.length}`))
    const levels = new Map(data.districts.map((district) => [district.ubigeo, district.nivel]))
    const sorted = [...focus.distritos].sort((a, b) => (levels.get(b.ubigeo) ?? 0) - (levels.get(a.ubigeo) ?? 0) || b.population - a.population)
    const visible = showAllDistricts ? sorted : sorted.slice(0, 8)
    const rows = el('ul', 'districts')
    for (const shape of visible) {
      const nivel = levels.get(shape.ubigeo)
      const level = nivel ? LEVELS[nivel - 2] : undefined
      const lines = [text(titleCase(shape.name), 'district-name'), text(`${number(shape.population)} habitantes`, 'district-detail')]
      rows.append(districtRow(shape.ubigeo, level ? level.color : '#D5DCE3', lines, level ? level.name.toLowerCase() : 'sin aviso'))
    }
    blocks.push(rows)
    if (sorted.length > 8) blocks.push(moreButton(sorted.length))
    return blocks
  }

  /** Los distritos del departamento con aviso, y cuánta gente vive en los centros poblados de esas zonas. */
  function districtsBlock(home: Home): Node[] {
    const list = districtsOf(home.name, data.districts)
    if (list.length === 0) return []
    const blocks: Node[] = []

    blocks.push(el('h3', 'sub', `Distritos con aviso · ${list.length}`))
    const visible = showAllDistricts ? list : list.slice(0, 6)
    const rows = el('ul', 'districts')
    for (const district of visible) {
      const level = LEVELS[district.nivel - 2]!
      const inZone = district.personas.reduce((a, b) => a + b, 0)
      const places = district.poblados.reduce((a, b) => a + b, 0)
      const lines = [text(titleCase(district.dist), 'district-name'), text(`${titleCase(district.prov)}${district.poblacion ? ` · ${number(district.poblacion)} habitantes` : ''}`, 'district-detail')]
      if (places > 0) lines.push(text(`En zona de aviso: ${places} ${places === 1 ? 'centro poblado' : 'centros poblados'} · ${number(inZone)} personas`, 'district-detail district-zone'))
      rows.append(districtRow(district.ubigeo, level.color, lines, level.name.toLowerCase()))
    }
    blocks.push(rows)
    blocks.push(el('p', 'small muted', 'Incluye los distritos que solo en parte están dentro de una zona con aviso.'))
    if (list.length > 6) blocks.push(moreButton(list.length))

    return blocks
  }

  /** El hilo de migas: Lima › Huarochirí › San Bartolomé. Cada una lleva de vuelta a ese escalón. */
  function breadcrumbs(home: Home): HTMLElement {
    const current = chosen ? 'district' : province ? 'province' : 'department'
    const trail: { label: string; level: string; go: () => void }[] = [{ label: home.name, level: 'department', go: handlers.goDepartment }]
    if (province) trail.push({ label: titleCase(province.name), level: 'province', go: handlers.goProvince })
    if (chosen) trail.push({ label: titleCase(chosen.shape.name), level: 'district', go: () => {} })
    const nav = el('nav', 'crumbs')
    nav.setAttribute('aria-label', 'Dónde estás')
    trail.forEach((step, index) => {
      if (index > 0) nav.append(text('›', 'crumb-separator'))
      if (step.level === current) {
        const here = text(step.label, 'crumb here')
        here.setAttribute('aria-current', 'page')
        nav.append(here)
      } else {
        const button = el('button', 'crumb', step.label)
        button.addEventListener('click', step.go)
        nav.append(button)
      }
    })
    return nav
  }

  function renderPlace() {
    placeBody.replaceChildren()
    if (!shown) {
      placeBody.append(el('div', 'card dashed', el('p', 'body muted', areas.length === 0 ? 'No se pudieron cargar los avisos del SENAMHI. Vuelve a intentarlo en unos minutos.' : 'Cargando…')))
      return
    }
    const home = withDistricts(shown.home, data.districts)
    const level = chosen ? 'district' : province ? 'province' : 'department'

    // El departamento es el primer escalón: sin hilo de migas hasta que se baja a una provincia
    if (level !== 'department') placeBody.append(breadcrumbs(home))

    // El título y la tarjeta grande son los del escalón en que estás: departamento, provincia o distrito
    if (level === 'district' && chosen) {
      const { shape, province: provinceName } = chosen
      placeBody.append(el('div', 'place-name', text(`Distrito · ${titleCase(provinceName)}`, 'label'), el('h2', 'place-title', titleCase(shape.name)), shape.population ? text(`${number(shape.population)} habitantes · Censo 2017`, 'district-detail') : ''))
      placeBody.append(districtMain(shape))
    } else if (level === 'province' && province) {
      const people = province.distritos.reduce((sum, shape) => sum + shape.population, 0)
      placeBody.append(el('div', 'place-name', text(`Provincia · ${home.name}`, 'label'), el('h2', 'place-title', titleCase(province.name)), text(`${number(people)} habitantes · ${province.distritos.length} distritos`, 'district-detail')))
      placeBody.append(provinceMain(province))
    } else {
      const inhabitants = data.departmentPopulation[normalize(home.name)]
      placeBody.append(el('div', 'place-name', text('Departamento', 'label'), el('h2', 'place-title', home.name), inhabitants ? text(`${number(inhabitants)} habitantes · Censo 2017`, 'district-detail') : ''))
      placeBody.append(homeCard(home))
    }

    // Debajo, lo que se puede tocar en el siguiente escalón
    placeBody.append(...(province ? provinceBlock(province) : districtsBlock(home)))
  }

  /** Los departamentos de alrededor, en un desplegable. */
  function renderNear() {
    nearBody.replaceChildren()
    if (!shown) return
    const near = shown.neighbors.map((other) => withDistricts(other, data.districts)).filter((other) => other.highest !== undefined).sort((a, b) => b.highest! - a.highest!)
    if (near.length === 0) {
      nearBody.append(el('p', 'small muted', 'Los departamentos vecinos no tienen avisos hoy.'))
      return
    }
    const list = el('ul', 'near')
    for (const other of near) {
      const level = LEVELS[other.highest!]!
      list.append(el('li', '', swatchOf(level.color), text(other.name, 'near-name'), text(level.name.toLowerCase(), 'near-level')))
    }
    nearBody.append(list)
  }

  // ---- Resumen de todo el país ----
  const severe = [...LEVELS.keys()].filter((level) => level >= 1 && count(level) > 0).reverse()
  const parts = severe.map((level) => `${zones(count(level))} con aviso ${LEVELS[level]!.short.toLowerCase()}`)
  const nationalText = el('p')
  if (parts.length > 0) {
    nationalText.append(el('strong', '', `En todo el Perú hay ${parts[0]}`), `${parts.length > 1 ? ` y ${parts.slice(1).join(' y ')}` : ''} en este aviso. Si vas a viajar a la sierra o vives cerca de una quebrada, infórmate.`)
  } else {
    nationalText.textContent = 'Hoy no hay avisos naranja ni rojo en el país.'
  }
  const nationalBody = el('div', 'what', nationalText)

  // ---- Los niveles ----
  function renderScale() {
    const mine = shown && withDistricts(shown.home, data.districts).highest
    const buttons = LEVELS.map((level, index) => {
      const bar = el('span', 'bar')
      bar.style.background = level.color
      const number = el('span', 'level-number', text(String(level.n), ''), mine === index ? text('AQUÍ', 'mine') : '')
      const button = el('button', 'level-button', bar, number, text(level.short, 'level-short'))
      button.setAttribute('aria-pressed', String(picked === index))
      if (picked === index) button.style.background = level.soft
      button.addEventListener('click', () => {
        picked = index
        renderScale()
      })
      return button
    })
    const level = LEVELS[picked]!
    const swatch = swatchOf(level.color, 'swatch big')
    const total = areas.length === 0 ? '–' : zones(count(picked))
    const box = (title: string, value: string) => el('div', 'stat', text(title, 'label small'), text(value, 'stat-value'))
    scale.replaceChildren(
      el('p', 'small muted', 'Toca un nivel para ver qué significa y qué hacer.'),
      el('div', 'levels', ...buttons),
      el('div', 'between small muted', text('Menos lluvia', ''), text('Más lluvia', '')),
      el(
        'div',
        'card',
        el('div', 'level-title', swatch, text(`Nivel ${level.n} · ${level.name}`, 'card-title')),
        el('div', 'stats', box('LLUVIA ESPERADA', level.mm), box('EN TODO EL AVISO', total)),
        text('QUÉ SIGNIFICA', 'label'),
        el('p', 'body', level.means),
        text('QUÉ HACER', 'label'),
        el('p', 'body', level.todo),
      ),
    )
  }

  // ---- Texto oficial ----
  function renderOfficial() {
    const level = shown && withDistricts(shown.home, data.districts).highest
    const area = (level !== undefined && areas.find((candidate) => candidate.level === level)) || areas[0]
    official.replaceChildren()
    if (!area) {
      official.append(el('p', 'small muted', 'No hay un aviso cargado.'))
      return
    }
    const issued = [`Emitido para el ${longDate(area.fecha) ?? 'día de hoy'}`]
    if (area.respons) issued.push(`por ${area.respons}`)
    issued.push(`${areas.length} áreas`)
    if (highest !== undefined) issued.push(`nivel más alto: ${LEVELS[highest]!.n} (${LEVELS[highest]!.short.toLowerCase()})`)
    official.append(el('p', 'small muted', issued.join(' · ')))
    if (area.descripcio) official.append(el('p', 'quote', `“${area.descripcio}”`))
    if (area.recomendac) official.append(el('p', 'quote', el('strong', '', 'Recomendación: '), `“${area.recomendac}”`))
  }

  function fold(title: string, content: HTMLElement) {
    content.hidden = true
    const sign = text('+', 'sign')
    const button = el('button', 'fold', text(title, ''), sign)
    button.setAttribute('aria-expanded', 'false')
    button.addEventListener('click', () => {
      content.hidden = !content.hidden
      sign.textContent = content.hidden ? '+' : '−'
      button.setAttribute('aria-expanded', String(!content.hidden))
    })
    return [button, content]
  }

  const what = el(
    'div',
    'what',
    el('p', '', 'El ', el('strong', '', 'SENAMHI'), ' (Servicio Nacional de Meteorología e Hidrología del Perú) publica cada día un pronóstico de cuánta lluvia caerá en las próximas 24 horas.'),
    el('p', '', 'Cuando llueve fuerte en las alturas, el agua baja por las ', el('strong', '', 'quebradas'), ' arrastrando lodo y piedras: eso es un ', el('strong', '', 'huaico'), '. Por eso, cuando llueve mucho, conviene estar atento si vives cerca de una quebrada.'),
    el('p', 'note', el('strong', '', '¿Cuánto es 1 mm de lluvia? '), 'Equivale a 1 litro de agua por cada metro cuadrado. 80 mm son 80 litros —unos 4 baldes— sobre cada metro cuadrado de suelo.'),
  )
  // Los tres desplegables empiezan cerrados
  const folds = el(
    'section',
    'block folds',
    ...fold('Los 3 niveles de aviso', scale),
    ...fold('Personas en zonas con aviso', exposureBody),
    ...fold('Departamentos cercanos', nearBody),
    ...fold('Resumen de todo el Perú', nationalBody),
    ...fold('¿Qué es este aviso y qué es un huaico?', what),
    ...fold('Texto oficial del aviso', official),
  )

  // ---- Pie ----
  const footer = el('footer', 'panel-footer')
  if (data.updated) {
    const when = new Date(data.updated).toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    footer.append(el('p', data.stale ? 'warning' : '', data.stale ? `Los datos son del ${when}: puede haber un aviso nuevo que todavía no se ve. Revisa también la página del SENAMHI.` : `Datos del SENAMHI bajados el ${when}`))
  }
  const link = el('a', '', 'SENAMHI')
  link.href = 'https://www.senamhi.gob.pe'
  link.target = '_blank'
  link.rel = 'noopener'
  footer.append(
    'Fuente: ',
    link,
    ', capas g_prono_pp_24h (aviso de lluvia) y g_acti_quebrada (activación de quebradas). ',
    el('strong', '', 'No es un sitio oficial. '),
    'Ante una emergencia llama al ',
    el('strong', '', '115'),
    ' (INDECI) o al ',
    el('strong', '', '116'),
    ' (Bomberos). ',
    'Medimos visitas y velocidad de carga de forma anónima, sin cookies ni datos personales.',
  )

  // ---- El resumen: el lugar, su aviso, qué hacer y de cuándo es ----
  // Va primero en el panel, en el celular y en la computadora; el detalle va debajo. En el celular el panel es una hoja
  // al pie del mapa: cerrada muestra solo el resumen, y con un toque en él se abre con todo el detalle.
  const narrow = matchMedia('(max-width: 800px)').matches
  const peek = el('div', 'peek')
  const setOpen = (open: boolean) => {
    root.classList.toggle('sheet-open', open)
    if (!narrow) return
    peek.setAttribute('aria-expanded', String(open))
    peek.querySelector('.peek-more')?.replaceChildren(open ? 'Cerrar ▾' : 'Ver más ▴')
    if (!open) root.scrollTop = 0
  }
  if (narrow) {
    peek.setAttribute('role', 'button')
    peek.tabIndex = 0
    const toggle = () => setOpen(!root.classList.contains('sheet-open'))
    peek.addEventListener('click', toggle)
    peek.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        toggle()
      }
    })
  }

  function renderPeek() {
    let place = 'Perú'
    let where = ''
    let level: Level | undefined
    let hint = ''
    if (shown) {
      const home = withDistricts(shown.home, data.districts)
      if (chosen) {
        place = titleCase(chosen.shape.name)
        where = `${titleCase(chosen.province)}, ${home.name}`
        const info = data.districts.find((district) => district.ubigeo === chosen!.shape.ubigeo)
        level = info ? LEVELS[info.nivel - 2] : undefined
      } else if (province) {
        place = titleCase(province.name)
        where = `Provincia de ${home.name}`
        const levels = new Map(data.districts.map((district) => [district.ubigeo, district.nivel]))
        const top = province.distritos.reduce((top, shape) => Math.max(top, (levels.get(shape.ubigeo) ?? 1) - 2), -1)
        level = LEVELS[top]
        hint = `${narrow ? 'Toca' : 'Haz clic en'} tu distrito en el mapa para ver su aviso.`
      } else {
        place = home.name
        where = 'Departamento'
        level = home.highest !== undefined ? LEVELS[home.highest] : undefined
        hint = `${narrow ? 'Toca' : 'Haz clic en'} tu provincia o tu distrito en el mapa, o búscalo.`
      }
    }
    // El nivel con el número de la escala del SENAMHI (1 verde, sin aviso; 2 amarillo; 3 naranja; 4 rojo): informa sin
    // alarmar, y sin aviso también se dice, en verde
    const calm = shown && !level
    const badge = el('span', 'peek-badge', text('NIVEL', 'peek-badge-label'), text(level ? String(level.n) : calm ? String(CALM.n) : '–', ''))
    badge.style.background = level?.strong ?? (calm ? CALM.strong : '#9aa7b4')
    // «Aviso rojo · Lluvia muy fuerte», y los milímetros aparte, en chico, para que no se partan
    const [rainWords, rainAmount] = level ? level.rain.split(' · ') : []
    const status = el('span', 'peek-level', !level ? (shown ? `${CALM.name} · ${CALM.says}` : 'Cargando el aviso…') : chosen ? `${level.name} · ${rainWords} ` : `${level.name} en parte de ${place}`)
    if (level && chosen && rainAmount) status.append(text(rainAmount, 'peek-amount'))
    status.style.color = level?.ink ?? (calm ? CALM.ink : '')
    const todo = level || calm ? el('span', 'peek-todo', el('b', '', 'Qué hacer: '), level ? level.hereTodo : CALM.todo) : ''
    peek.replaceChildren(
      narrow ? el('span', 'peek-handle') : '',
      el('span', 'peek-row', badge, el('span', 'peek-text', text(place, 'peek-place'), where ? text(where, 'peek-where') : ''), narrow ? text(root.classList.contains('sheet-open') ? 'Cerrar ▾' : 'Ver más ▴', 'peek-more') : ''),
      status,
      todo,
      hint ? text(hint, 'peek-hint') : '',
      issued ? text(`SENAMHI · aviso del ${issued}, para 24 h${stale ? ' · puede no estar al día' : ''}`, `peek-date${stale ? ' stale' : ''}`) : '',
    )
  }

  function update() {
    renderPeek()
    renderPlace()
    renderNear()
    renderExposure()
    renderScale()
    renderOfficial()
  }

  root.replaceChildren(peek, el('section', 'block', placeBody), folds, footer)
  setOpen(false)
  update()

  const homeOf = (department: Department, steps: number) => sharedHomeOf(department, areas, steps)

  return {
    showDepartment(department, source) {
      if (shown?.home.name === department.name && shown.source === source) return
      const home = homeOf(department, 70)
      const neighbors = neighborsOf(department, departments).map((other) => homeOf(other, 28))
      if (home.highest !== undefined) picked = home.highest
      chosen = undefined
      showAllDistricts = false
      shown = { home, neighbors, source }
      update()
    },
    showProvince(focus) {
      province = focus
      showAllDistricts = false
      setOpen(false)
      update()
    },
    showDistrict(shape, shapes) {
      if (!shape || !shapes) {
        chosen = undefined
      } else {
        chosen = { shape, province: shapes.provinces[shape.ubigeo.slice(0, 4)] ?? '' }
      }
      setOpen(false)
      update()
    },
    current: () => shown?.home.name,
  }
}
