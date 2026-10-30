// SPDX-License-Identifier: AGPL-3.0-or-later
// Dónde está la API de Illapa (illapa-engine), que da el aviso, los distritos y el pronóstico. Se elige al
// construir el sitio con VITE_ILLAPA_API_URL (ver .env.development y .env.production).

export const API_URL = String(import.meta.env.VITE_ILLAPA_API_URL ?? '').replace(/\/+$/, '')

/** Una ruta de la API, por ejemplo `api('/v1/aviso')` */
export const api = (path: string) => `${API_URL}${path}`
