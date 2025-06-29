import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  resolve: {
    alias: {
      styles: path.resolve(__dirname, 'src/styles')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData(source: string, filepath: string) {
          // Prevent the "This file is already being loaded" SCSS error by not importing the file in itself
          if (filepath.endsWith('variables.scss')) return source
          return `
          @use 'sass:color';
          @use "styles/variables.scss" as *; ${source}
          `
        }
      }
    }
  }
})
