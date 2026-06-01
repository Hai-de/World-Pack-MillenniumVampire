import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'VampireMillennium',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      output: {
        assetFileNames: 'style.[ext]'
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})