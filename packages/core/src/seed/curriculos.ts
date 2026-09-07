/**
 * Qual curriculo mede qual meta.
 *
 * ESTE E O UNICO LUGAR QUE LIGA META A SEED, e por isso as duas telas (Central e
 * app do aluno) passam a MESMA funcao para a montagem das linhas. Se cada uma
 * resolvesse por conta propria, um aluno de 1o grau poderia ser medido contra o
 * azul numa tela e contra o 1o grau na outra.
 *
 * `null` NAO E LACUNA A CORRIGIR: 2o, 3o e 4o grau nao tem lista ainda, e meta
 * desconhecida (um `roxa` gravado por versao futura) tambem cai aqui. Devolver
 * um curriculo qualquer produziria numero errado com aparencia de certo; `null`
 * faz a tela mostrar `—` com o motivo escrito.
 */

import type { Curriculo } from '../domain/curriculo'
import { CARTOES_TEORIA, CONTEUDOS, ITENS, REQUISITOS } from './index'
import { ITENS_1GRAU } from './primeiro-grau'

/** O exame de azul: 81 itens da banca, 56 ativos. */
export const CURRICULO_AZUL: Curriculo = {
  itens: ITENS,
  conteudos: CONTEUDOS,
  requisitos: REQUISITOS,
  cartoesTeoria: CARTOES_TEORIA,
}

/**
 * O 1o grau: 29 itens da lista do professor.
 *
 * SEM CONTEUDO, SEM REQUISITOS E SEM TEORIA, e nao por esquecimento: a lista dele
 * nao vem com passo a passo, e redigi-lo aqui seria inventar curriculo. A
 * consequencia esta medida no cabecalho de `primeiro-grau.ts` — e e a razao de a
 * meta `1grau` ser medida por ATESTADO e nao por cartoes (ADR-016, decisao 9).
 */
export const CURRICULO_1GRAU: Curriculo = {
  itens: ITENS_1GRAU,
  conteudos: [],
  requisitos: [],
  cartoesTeoria: [],
}

export function curriculoDaMeta(meta: string): Curriculo | null {
  if (meta === 'azul') return CURRICULO_AZUL
  if (meta === '1grau') return CURRICULO_1GRAU
  return null
}
