// defineConfig vem de vitest/config (nao de 'vite') para que o bloco `test`
// seja tipado corretamente — mesmo motivo do app do aluno.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * SEM PWA, E ISSO E DECISAO E NAO ESQUECIMENTO.
 *
 * O app do aluno tem service worker porque ele PRECISA funcionar sem rede: o
 * aluno estuda no vestiario, no onibus, na academia com sinal ruim. A central
 * e o oposto — ela existe para mostrar o que os alunos sincronizaram, e um
 * retrato velho de dados alheios e pior que uma tela dizendo "sem conexao".
 * Cache de dados de outra pessoa nao e conveniencia, e desinformacao com cara
 * de dado.
 *
 * E de graca vem um problema a menos: nao existe versao presa em `waiting`, nem
 * aviso de atualizacao, nem o risco de servir pacote antigo depois do deploy.
 * A central recarrega e esta atualizada.
 */
export default defineConfig({
  /**
   * `/central/` e nao `./`, e a diferenca importa aqui.
   *
   * A central e publicada na MESMA origem do app do aluno, sob /central/ — e o
   * que da uma sessao unica em vez de dois logins (ADR-015, decisao 9). Com base
   * relativa, `/central/aluno/abc` pediria os assets em `/central/aluno/*` e
   * receberia 404 em toda navegacao com mais de um nivel. Base absoluta resolve
   * de qualquer profundidade.
   */
  base: '/central/',
  // 5199 e do app do aluno; as duas rodam juntas em desenvolvimento.
  server: { port: 5299, strictPort: true },
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
