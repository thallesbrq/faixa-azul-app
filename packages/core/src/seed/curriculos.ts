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

/**
 * O exame de azul: os 81 itens da banca, todos ativos (ADR-017, decisao 7).
 *
 * ERAM 56 ATE AQUI, e o corte nao estava nos itens: `MODULOS_ATIVOS` em
 * `seed/index.ts` sobrescrevia `ativo` na exportacao, deixando so guardas e
 * saidas. Voltaram Fundamentos (9), Quedas (5) e Defesa Pessoal (11).
 *
 * OS 11 DE DEFESA PESSOAL VOLTAM SEM PASSO A PASSO, e isso nao e lacuna: o
 * ADR-012 continua valendo. Eles sao itens de curriculo com aviso de supervisao
 * obrigatoria, e os cartoes deles ficam restritos a reconhecimento. O professor
 * da esse conteudo na aula 00 presencial — dar em loco nao e o mesmo que
 * fornecer o protocolo escrito, que segue sendo a condicao de revisao do ADR-012.
 *
 * CONSEQUENCIA REGISTRADA: esses 11 alcancam "dominio" por RECONHECIMENTO, e a
 * central os mostra igual aos provados por recordacao da sequencia. E uma
 * afirmacao mais fraca com a mesma aparencia.
 */
export const CURRICULO_AZUL: Curriculo = {
  itens: ITENS,
  conteudos: CONTEUDOS,
  requisitos: REQUISITOS,
  cartoesTeoria: CARTOES_TEORIA,
  medida: 'cartoes',
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
  medida: 'atestado',
}

/**
 * O curriculo de um id de curriculo.
 *
 * ANTES SE CHAMAVA `curriculoDaMeta` E RECEBIA A META (ADR-017, decisao 6). O
 * nome mentia depois que `meta` e `estuda` viraram campos separados: ele nunca
 * respondeu "qual a prova", e sim "qual o conteudo". Chamado com a meta, ele
 * media quem persegue o 3o grau contra o curriculo do 3o grau — que nao existe —
 * em vez do de azul, que e o que a pessoa de fato estuda.
 *
 * `null` NAO E LACUNA A CORRIGIR: 2o, 3o e 4o grau nao tem lista, e um id
 * desconhecido (`roxa`, gravado por versao futura) tambem cai aqui.
 */
export function curriculoPorId(id: string): Curriculo | null {
  if (id === 'azul') return CURRICULO_AZUL
  if (id === '1grau') return CURRICULO_1GRAU
  return null
}
