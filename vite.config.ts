import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { devApi } from './vite.devApi.ts'

// https://vite.dev/config/
export default defineConfig({
  // Path relatif supaya hasil build jalan di Vercel (root) maupun GitHub Pages (/nama-repo/).
  base: './',
  // devApi: fungsi api/ ikut jalan di `npm run dev` (data memori). Tidak ikut build.
  plugins: [react(), tailwindcss(), devApi()],
  build: {
    // Dua halaman: website publik (index.html) dan halaman admin rekap pesanan (admin.html → /admin).
    rolldownOptions: {
      input: { main: 'index.html', admin: 'admin.html' },
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'],
    environment: 'node',
  },
})
