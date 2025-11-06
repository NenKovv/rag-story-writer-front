import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  // Removed pdfjs-dist optimization since we're using react-pdf's bundled version
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
})
