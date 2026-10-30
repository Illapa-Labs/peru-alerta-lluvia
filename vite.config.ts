import { defineConfig } from 'vite'

// Los datos vienen de la API de Illapa (VITE_ILLAPA_API_URL, en .env.development y .env.production)
export default defineConfig({
  server: {
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    // MapLibre GL JS es grande: va en su propio archivo, que se baja después de mostrar el panel
    chunkSizeWarningLimit: 1200,
  },
})
