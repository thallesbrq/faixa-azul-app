// defineConfig vem de vitest/config (nao de 'vite') para que o bloco `test`
// seja tipado corretamente.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Base relativa: mantem o app funcional tanto na raiz de um dominio
// quanto em subpasta (ex.: GitHub Pages /repo/). Revisar no slice de deploy.
export default defineConfig({
  base: './',
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
        // Tokens do spec 8.6
        theme_color: '#1E4E8C',
        background_color: '#F7F7F5',
        // TODO(slice-6): gerar icons 192/512 + maskable antes do deploy.
        icons: [],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
