/**
 * Taxonomia das posicoes — os rotulos de contexto que a lista de tecnicas nao
 * carrega por si.
 *
 * POR QUE ISTO EXISTE. O rotulo "Guarda Fechada" numa lista de tecnicas e
 * ambiguo de um jeito que importa no tatame: dentro da MESMA posicao ha itens em
 * que o aluno esta embaixo atacando (raspagem, finalizacao) e itens em que ele
 * esta em cima passando. Sao lados opostos da luta com o mesmo nome. Conferindo
 * o curriculo, TODAS as oito posicoes de guarda misturam os dois papeis.
 *
 * Duas dimensoes resolvem isso, e elas sao independentes:
 *
 * - PAPEL: de que lado eu estou. Derivado do `kind`, tres valores.
 * - FAMILIA: que tipo de guarda e, tecnicamente. Nao e derivavel de nada — e
 *   conhecimento de jiu-jitsu, e por isso e uma tabela explicita, para ser
 *   corrigida pelo professor em vez de adivinhada por regra.
 *
 * Modulo puro: sem React, sem I/O.
 */

import type { TechniqueKind } from './types'

/** De que lado da luta o aluno esta. */
export type Papel = 'atacando' | 'passando' | 'defendendo'

export const ROTULO_PAPEL: Record<Papel, string> = {
  atacando: 'Embaixo, atacando',
  passando: 'Em cima, passando',
  defendendo: 'Embaixo, defendendo',
}

/**
 * Papel a partir do tipo da tecnica.
 *
 * `costas` conta como atacando: ir as costas parte de uma guarda, com o aluno
 * embaixo. `movimentacao` cai no padrao por nao ter lado definido — sao itens
 * de Fundamentos, que estao desativados neste escopo.
 */
export function papelDoKind(kind: TechniqueKind): Papel {
  if (kind === 'passagem') return 'passando'
  if (kind === 'saida' || kind === 'defesa') return 'defendendo'
  return 'atacando'
}

/** Familia tecnica da posicao. */
export type Familia =
  | 'fechada'
  | 'meia'
  | 'pegada-manga'
  | 'gancho'
  | 'sem-pegada'
  | 'pernas'
  | 'dominada'
  | 'finalizacao-sofrida'

export const ROTULO_FAMILIA: Record<Familia, string> = {
  fechada: 'Fechada',
  meia: 'Meia-guarda',
  'pegada-manga': 'Pegada de manga',
  gancho: 'Gancho',
  'sem-pegada': 'Sem pegada fixa',
  pernas: 'Pernas entrelaçadas',
  dominada: 'Posição dominada',
  'finalizacao-sofrida': 'Finalização sofrida',
}

/**
 * Posicao -> familia. Tabela EXPLICITA de proposito: classificar guarda e
 * conhecimento tecnico, nao regra de string. Se o Prof. Joao Eduardo classificar
 * diferente, muda aqui e o app e os documentos acompanham.
 *
 * Comparacao por prefixo porque os rotulos importados carregam parenteses
 * longos ("Guarda Laço (Lasso Guard)").
 */
const FAMILIA_POR_PREFIXO: [string, Familia][] = [
  ['Guarda Fechada', 'fechada'],
  ['Meia Guarda', 'meia'],
  ['Guarda Aranha', 'pegada-manga'],
  ['Guarda Laço', 'pegada-manga'],
  ['Guarda Dela Riva', 'gancho'],
  ['Guarda Gancho', 'gancho'],
  ['Guarda Aberta', 'sem-pegada'],
  ['Complexo Moderno', 'pernas'],
  ['Defesas de Finalização', 'finalizacao-sofrida'],
  ['Saída', 'dominada'],
]

/** `null` quando a posicao nao esta classificada — a UI mostra sem rotulo. */
export function familiaDaPosicao(posicao: string): Familia | null {
  for (const [prefixo, familia] of FAMILIA_POR_PREFIXO) {
    if (posicao.startsWith(prefixo)) return familia
  }
  return null
}
