// La escala de colores de la lluvia (mm por hora), la misma de la leyenda (.rain-scale en style.css): logarítmica,
// de 0,1 a 53 mm/h. Va de celeste a azul y violeta, para no confundirse con los colores del aviso del SENAMHI
// (amarillo, naranja y rojo), que tienen prioridad. La usan las imágenes del pronóstico.

const STOPS: [number, [number, number, number]][] = [
  [0, [160, 214, 250]], [0.3, [90, 170, 240]], [0.5, [40, 110, 225]], [0.68, [40, 50, 180]],
  [0.82, [100, 30, 170]], [1, [160, 20, 150]],
]
export const COLORS = 64
const LOG_MIN = -1 // 0,1 mm/h
const LOG_MAX = Math.log10(53)

/** Los 64 colores, del más suave al más fuerte */
export const PALETTE: [number, number, number][] = Array.from({ length: COLORS }, (_, i) => {
  const t = i / (COLORS - 1)
  const upper = STOPS.findIndex(([at]) => at >= t)
  const [t1, c1] = STOPS[Math.max(upper, 1)]!
  const [t0, c0] = STOPS[Math.max(upper, 1) - 1]!
  const f = (t - t0) / (t1 - t0)
  return c0.map((c, k) => Math.round(c + (c1[k]! - c) * f)) as [number, number, number]
})

/** El índice del color (0 a 63) para una lluvia en mm/h; desde 0,1 mm/h */
export function colorIndex(mm: number): number {
  const t = (Math.log10(mm) - LOG_MIN) / (LOG_MAX - LOG_MIN)
  return Math.min(COLORS - 1, Math.max(0, Math.round(t * (COLORS - 1))))
}
