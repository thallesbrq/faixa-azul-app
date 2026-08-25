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
      /**
       * `prompt`, nao `autoUpdate` — o app AVISA e o aluno decide.
       *
       * Um service worker novo instala e fica em estado `waiting`: vivo, mas sem
       * controlar a pagina, porque a versao antiga ainda tem cliente aberto.
       * `autoUpdate` chamava `skipWaiting()` sozinho, e isso dava duas coisas
       * ruins:
       *
       * 1. A pagina servia o pacote ANTIGO na primeira abertura depois do deploy
       *    e trocava na seguinte, em silencio. Quem recebesse um link de
       *    montagem gerado por versao nova podia ver "nada acontece" sem nenhuma
       *    explicacao na tela.
       * 2. A troca podia acontecer no meio de uma revisao, sem aviso.
       *
       * O PRECO, que e real: com `prompt`, quem ignorar o aviso fica na versao
       * antiga indefinidamente — `autoUpdate` era mais confuso mas convergia
       * sozinho. Compensado em ./src/ui/useAtualizacao.ts, que checa de hora em
       * hora e nao deixa o aviso desaparecer para sempre.
       */
      registerType: 'prompt',
      /**
       * O registro fica no React (`useRegisterSW`), nao num script injetado no
       * index.html: e de la que sai o estado "tem versao nova", e o aviso
       * precisa desse estado. Com o registro em dois lugares, o SW seria
       * registrado duas vezes.
       */
      injectRegister: null,
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
