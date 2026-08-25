/**
 * Taxonomia das posicoes — os rotulos de contexto da lista de tecnicas.
 *
 * HISTORICO DESTA DECISAO, porque ela ja foi errada uma vez. Eu havia inventado
 * uma classificacao por familia tecnica ("pegada de manga", "gancho", "pernas
 * entrelacadas"), agrupando Aranha com Laco e Dela Riva com Gancho. O aluno
 * corrigiu: as guardas devem ser EXATAMENTE as do curriculo do exame. Inventar
 * taxonomia sobre um documento que ja tem a sua e criar uma segunda linguagem
 * que ninguem na academia fala.
 *
 * As nove guardas do curriculo:
 *   Guarda Fechada · Meia Guarda · Guarda Gancho · Guarda Aranha ·
 *   Guarda Dela Riva · Guarda Laco · Guarda Aberta ·
 *   Complexo Moderno (One Leg, 50-50, Guarda X, Berimbolo) · Saidas
 *
 * O Complexo Moderno tem SUB-POSICOES, e elas ja estavam nos dados desde a
 * importacao, no campo `categoria`: Guarda One Leg, Guarda 50-50, Guarda X e
 * Berimbolo. Nao precisou inventar nada — precisou olhar.
 *
 * PAPEL continua existindo como dimensao separada, e o motivo e concreto: todas
 * as oito guardas contem itens em que o aluno esta embaixo atacando E itens em
 * que ele esta em cima passando. "Guarda Fechada · Raspagem de tesoura" e
 * "Guarda Fechada · Abrir em pe e passar" sao lados opostos da luta com o mesmo
 * nome de posicao.
 *
 * Modulo puro: sem React, sem I/O.
 */

import type { TechniqueItem, TechniqueKind } from './types'

// ---------------------------------------------------------------------------
// Papel: de que lado da luta o aluno esta
// ---------------------------------------------------------------------------

export type Papel = 'atacando' | 'passando' | 'defendendo'

export const ROTULO_PAPEL: Record<Papel, string> = {
  atacando: 'eu ataco',
  passando: 'eu passo',
  defendendo: 'eu defendo',
}

/**
 * Papel a partir do tipo da tecnica.
 *
 * `costas` conta como atacando: ir as costas parte de uma guarda, com o aluno
 * embaixo. `movimentacao` e os demais caem no padrao por nao terem lado
 * definido — sao itens de Fundamentos, fora deste escopo.
 */
export function papelDoKind(kind: TechniqueKind): Papel {
  if (kind === 'passagem') return 'passando'
  if (kind === 'saida' || kind === 'defesa') return 'defendendo'
  return 'atacando'
}

// ---------------------------------------------------------------------------
// Guarda: as do curriculo, nem uma mais nem uma menos
// ---------------------------------------------------------------------------

export type Guarda =
  | 'fechada'
  | 'meia'
  | 'gancho'
  | 'aranha'
  | 'dela-riva'
  | 'laco'
  | 'aberta'
  | 'complexo'
  | 'saidas'

/** Rotulo curto, para caber na linha de um documento denso. */
export const ROTULO_GUARDA: Record<Guarda, string> = {
  fechada: 'Guarda Fechada',
  meia: 'Meia Guarda',
  gancho: 'Guarda Gancho',
  aranha: 'Guarda Aranha',
  'dela-riva': 'Guarda Dela Riva',
  laco: 'Guarda Laço',
  aberta: 'Guarda Aberta',
  complexo: 'Complexo Moderno',
  saidas: 'Saídas',
}

/** Ordem do curriculo do exame, para legendas e agrupamentos. */
export const ORDEM_GUARDA: Guarda[] = [
  'fechada',
  'meia',
  'gancho',
  'aranha',
  'dela-riva',
  'laco',
  'aberta',
  'complexo',
  'saidas',
]

/**
 * Posicao -> guarda do curriculo.
 *
 * Comparacao por prefixo porque os rotulos importados carregam parenteses
 * longos ("Guarda Laço (Lasso Guard)"). A ordem importa: "Guarda Gancho" tem de
 * ser testado antes de qualquer prefixo mais curto que o contenha.
 */
const GUARDA_POR_PREFIXO: [string, Guarda][] = [
  ['Guarda Fechada', 'fechada'],
  ['Meia Guarda', 'meia'],
  ['Guarda Gancho', 'gancho'],
  ['Guarda Aranha', 'aranha'],
  ['Guarda Dela Riva', 'dela-riva'],
  ['Guarda Laço', 'laco'],
  ['Guarda Aberta', 'aberta'],
  ['Complexo Moderno', 'complexo'],
  ['Saída', 'saidas'],
  ['Defesas de Finalização', 'saidas'],
]

/** `null` quando a posicao nao esta no curriculo mapeado. */
export function guardaDaPosicao(posicao: string): Guarda | null {
  for (const [prefixo, guarda] of GUARDA_POR_PREFIXO) {
    if (posicao.startsWith(prefixo)) return guarda
  }
  return null
}

/**
 * Sub-posicao dentro da guarda, quando a guarda tem subdivisao no curriculo.
 *
 * Vale para dois casos, e nos dois o dado ja existia:
 * - Complexo Moderno: `categoria` traz One Leg, 50-50, Guarda X ou Berimbolo.
 * - Saidas: cada uma e uma posicao propria (da Montada, dos 100 Kilos, ...), e
 *   ai a subdivisao e a propria `posicao`.
 *
 * Devolve `null` para as guardas que nao se subdividem — nesses casos o rotulo
 * da guarda ja e a informacao completa.
 */
export function subPosicao(item: Pick<TechniqueItem, 'posicao' | 'categoria'>): string | null {
  const guarda = guardaDaPosicao(item.posicao)
  if (guarda === 'complexo') return item.categoria
  if (guarda === 'saidas') return item.posicao
  return null
}
