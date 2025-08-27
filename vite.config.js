import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      // 将 /api 请求代理到 http://localhost:3000
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true, // 必须设置为 true
        rewrite: (path) => path.replace(/^\/api/, ''), // 重写路径，移除 /api 前缀
      },
    },
  },
})
