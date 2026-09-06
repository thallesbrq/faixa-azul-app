import { defineConfig } from 'vitest/config'

/**
 * Testes das REGRAS do Firestore, separados do resto.
 *
 * Eles precisam do emulador de pe, entao nao entram no `npm test` do dia a dia
 * — que roda em um segundo, sem rede e sem dependencia externa. Misturar os
 * dois faria o teste rapido ficar lento e frageis por motivo alheio.
 *
 * No CI os dois rodam; localmente, `npm run test:regras` sobe o emulador.
 */
export default defineConfig({
  test: {
    include: ['firestore.rules.test.ts'],
    // O emulador demora a responder na primeira consulta.
    testTimeout: 15000,
    hookTimeout: 30000,
  },
})
