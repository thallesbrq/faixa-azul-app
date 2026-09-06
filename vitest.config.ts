import { defineConfig } from 'vitest/config'

/**
 * Um Vitest para o monorepo inteiro.
 *
 * Os testes das camadas puras vivem em packages/core e nao precisam de
 * navegador. Rodar tudo de um lugar mantem `npm test` na raiz funcionando como
 * sempre funcionou — o CI e a memoria muscular nao mudam com a reestruturacao.
 */
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.test.ts?(x)', 'apps/*/src/**/*.test.ts?(x)'],
  },
})
