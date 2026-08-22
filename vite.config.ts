// defineConfig vem de vitest/config (nao de 'vite') para que o bloco `test`
// seja tipado corretamente.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Base relativa: mantem o app funcional tanto na raiz de um dominio
// quanto em subpasta (ex.: GitHub Pages /repo/). Revisar no slice de deploy.
export default defineConfig({
  base: './',
  // 5173 (padrao do Vite) esta ocupada por outro processo nesta maquina.
  server: { port: 5199, strictPort: true },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // RNF-02: dashboard, cartoes, conteudo e scheduler devem funcionar offline.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      manifest: {
        name: 'Faixa Azul — Preparacao para a prova',
        short_name: 'Faixa Azul',
        description:
          'Treinador de recuperacao ativa para a prova de graduacao faixa azul (Rilion Gracie Garopaba)',
        lang: 'pt-BR',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        // Cores da marca Rilion Gracie, amostradas da propria logo.
        theme_color: '#111214',
        background_color: '#F4F3F1',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          // Maskable tem area de seguranca maior: o sistema recorta as bordas.
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
