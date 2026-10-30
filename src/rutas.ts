// SPDX-License-Identifier: AGPL-3.0-or-later
// Cada lugar tiene su dirección: /piura, /piura/piura, /piura/piura/tambo-grande. Así se puede compartir el aviso de un
// lugar, y las analíticas (sin cookies) cuentan qué lugares se miran. Dentro de un departamento no hay dos provincias con
// el mismo nombre, ni dos distritos en una provincia, así que cada dirección es un solo lugar.

import { normalize } from './data'

/** Los nombres en una dirección, como los de una ruta en la web, en minúsculas y sin tildes: "Tambo Grande" → tambo-grande */
export function pathOf(...names: string[]): string {
  return `/${names.map(slug).join('/')}`
}

/** Un nombre en una dirección: sin tildes, en minúsculas y con guiones */
export const slug = (name: string) =>
  normalize(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** El lugar que pide una dirección, por partes; cada una ya en la forma de `slug` */
export interface Route {
  department?: string
  province?: string
  district?: string
}

export function parseRoute(pathname: string): Route {
  const parts = pathname
    .split('/')
    .filter(Boolean)
    .slice(0, 3)
    .map((part) => {
      try {
        return slug(decodeURIComponent(part))
      } catch {
        return ''
      }
    })
  const [department, province, district] = parts
  return { department: department || undefined, province: province || undefined, district: district || undefined }
}
