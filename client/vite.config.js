import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    strictPort: true,
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // 开发环境：API 请求代理到 Express 后端
      '/api': {
        target: 'http://localhost:5100',
        changeOrigin: true,
      },
      // 静态资源（图片等）
      '/assets': {
        target: 'http://localhost:5100',
        changeOrigin: true,
      },
    },
  },
  build: {
    // 生产产物输出到项目根目录的 dist/spa/
    outDir: resolve(__dirname, '../dist/spa'),
    emptyOutDir: true,
  },
})
