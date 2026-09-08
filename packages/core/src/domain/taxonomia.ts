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
  /**
   * `dominio` E EXPLICITO AQUI, e nao por elegancia: esta funcao e uma cadeia de
   * `if` com padrao no fim, entao ela NAO quebrou quando o tipo novo entrou —
   * `dominio` cairia em 'atacando' em silencio. Manter a posicao por cima e o
   * lado de quem passou, nao de quem ataca de baixo.
   *
   * Os dois `Record<TechniqueKind, ...>` deste arquivo e de cards.ts quebraram a
   * compilacao, como projetado. Esta linha existe porque uma cadeia de `if` nao
   * tem essa defesa, e a diferenca so aparece lendo o codigo.
   */
  if (kind === 'dominio') return 'passando'
  return 'atacando'
}

// ---------------------------------------------------------------------------
// Bloco do curriculo: as guardas, as saidas, e os modulos que nao sao guarda
// ---------------------------------------------------------------------------

/**
 * O BLOCO PELO QUAL O BOLSAO DA MONTAGEM AGRUPA. Chamava-se `Guarda`.
 *
 * O NOME JA ERA FALSO ANTES DE EU MEXER: `'saidas'` esta nesta lista desde o
 * inicio, e saida da montada nao e guarda. O tipo sempre foi "bloco do
 * curriculo" usando o nome do caso mais comum.
 *
 * O RENOME NAO FOI ESTETICA — foi um teste falhando. Ao religar os 25 itens das
 * Secoes 1 a 3 (ADR-017, decisao 7), `TODA posicao ativa esta classificada`
 * quebrou: Base & Movimentacao, Quedas e Defesa Pessoal nao tinham prefixo aqui,
 * entao `blocoDaPosicao` devolvia `null` para eles. E o efeito NAO seria um erro
 * visivel: `montagem.ts` faz `if (!g) continue` ao montar o bolsao, entao os 25
 * itens sumiriam da lista de escolha do professor — e `problemas` diria
 * "faltam 25 itens" sem oferecer onde clicar. Silencioso, e exatamente o tipo de
 * defeito que este teste existe para pegar.
 *
 * Manter o nome `Guarda` e acrescentar 'quedas' faria o proximo leitor confiar
 * num nome que mente. Ver `taxonomia`: inventar classificacao onde ja existe uma
 * e o erro que este arquivo registra.
 */
export type BlocoDoCurriculo =
  | 'fechada'
  | 'meia'
  | 'gancho'
  | 'aranha'
  | 'dela-riva'
  | 'laco'
  | 'aberta'
  | 'complexo'
  | 'saidas'
  /** Nao sao guarda. Voltaram ao curriculo ativo com o ADR-017, decisao 7. */
  | 'fundamentos'
  | 'quedas'
  | 'defesa-pessoal'

/** Rotulo curto, para caber na linha de um documento denso. */
export const ROTULO_BLOCO: Record<BlocoDoCurriculo, string> = {
  fechada: 'Guarda Fechada',
  meia: 'Meia Guarda',
  gancho: 'Guarda Gancho',
  aranha: 'Guarda Aranha',
  'dela-riva': 'Guarda Dela Riva',
  laco: 'Guarda Laço',
  aberta: 'Guarda Aberta',
  complexo: 'Complexo Moderno',
  saidas: 'Saídas',
  fundamentos: 'Base & Movimentação',
  quedas: 'Quedas',
  'defesa-pessoal': 'Defesa Pessoal',
}

/**
 * Ordem do curriculo do exame, para legendas e agrupamentos.
 *
 * FUNDAMENTOS E QUEDAS VEM PRIMEIRO, e a ordem e a do documento da prova
 * (Secoes 1 a 5) — que por acaso e tambem a ordem segura: ukemi antes de queda,
 * queda antes de guarda. Defesa Pessoal fica no fim porque e o unico bloco sem
 * passo a passo, e no bolsao ele e escolha de aula presencial.
 */
export const ORDEM_BLOCO: BlocoDoCurriculo[] = [
  'fundamentos',
  'quedas',
  'fechada',
  'meia',
  'gancho',
  'aranha',
  'dela-riva',
  'laco',
  'aberta',
  'complexo',
  'saidas',
  'defesa-pessoal',
]

/**
 * Posicao -> bloco do curriculo.
 *
 * Comparacao por prefixo porque os rotulos importados carregam parenteses
 * longos ("Guarda Laço (Lasso Guard)"). A ordem importa: "Guarda Gancho" tem de
 * ser testado antes de qualquer prefixo mais curto que o contenha.
 *
 * A TABELA NAO PODE SER EXAUSTIVA — a entrada e `string`, e nenhum
 * `Record<...>` a obriga a cobrir tudo, ao contrario de `ROTULO_BLOCO`. Quem
 * garante a cobertura e o teste `TODA posicao ativa esta classificada`, sobre o
 * seed real. Foi ele que pegou a ausencia destes tres.
 */
const BLOCO_POR_PREFIXO: [string, BlocoDoCurriculo][] = [
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
  ['Base & Movimentação', 'fundamentos'],
  ['Quedas', 'quedas'],
  // Antes de nada mais que comece com "Defesa": 'Defesas de Finalização' esta
  // acima e e outro bloco. Prefixo mais especifico primeiro.
  ['Defesa Pessoal', 'defesa-pessoal'],
]

/** `null` quando a posicao nao esta no curriculo mapeado. */
export function blocoDaPosicao(posicao: string): BlocoDoCurriculo | null {
  for (const [prefixo, bloco] of BLOCO_POR_PREFIXO) {
    if (posicao.startsWith(prefixo)) return bloco
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
  const guarda = blocoDaPosicao(item.posicao)
  if (guarda === 'complexo') return item.categoria
  if (guarda === 'saidas') return item.posicao
  return null
}

// ---------------------------------------------------------------------------
// Grupo tecnico: as colunas da central
// ---------------------------------------------------------------------------

/**
 * Sete grupos, derivados do `kind` dos itens — ver ADR-015, decisao 2.
 *
 * POR QUE NAO O MODULO DA PROVA, que seria a taxonomia "oficial": `mod-guardas`
 * carrega 48 dos 81 itens. Uma coluna com 59% do curriculo se move junto com o
 * progresso geral, e a variacao que interessa ao professor (raspa bem da
 * fechada, nao faz nada da Dela Riva) fica escondida dentro dela.
 *
 * POR QUE NAO AS 16 POSICOES: nao cabem como coluna. Elas viram LINHAS na
 * pagina de um aluno so, onde `progressoPorPosicao` ja atende. A mesma
 * taxonomia serve nos dois niveis, girada 90 graus.
 *
 * DOIS AGRUPAMENTOS, e cada um tem razao propria:
 * - `costas` entra em Finalizacoes: ir as costas e ataque que termina em
 *   finalizacao, e sozinho seriam 2 itens numa coluna inteira.
 * - `defesa` entra em Saidas: as duas respondem "estou por baixo, como saio",
 *   e `defesa` tambem tem so 2 itens.
 *
 * Contagem que fecha em 81: 18 + 14 + 16 + 8 + 5 + 9 + 11. Ha teste garantindo.
 */
export type GrupoTecnico =
  | 'raspagens'
  | 'passagens'
  | 'finalizacoes'
  | 'saidas-defesas'
  | 'quedas'
  | 'fundamentos'
  | 'defesa-pessoal'
  /** Manter a posicao por cima. Entrou com o curriculo do 1o grau (ADR-016). */
  | 'dominios'

export const ROTULO_GRUPO: Record<GrupoTecnico, string> = {
  raspagens: 'Raspagens',
  passagens: 'Passagens',
  finalizacoes: 'Finalizações',
  'saidas-defesas': 'Saídas e defesas',
  quedas: 'Quedas',
  fundamentos: 'Fundamentos',
  'defesa-pessoal': 'Defesa pessoal',
  dominios: 'Domínio de posição',
}

/** Ordem das colunas: do maior grupo para o menor, com Defesa Pessoal ao fim. */
export const ORDEM_GRUPO: GrupoTecnico[] = [
  'raspagens',
  'passagens',
  'finalizacoes',
  'saidas-defesas',
  'quedas',
  'fundamentos',
  'defesa-pessoal',
  // Depois dos demais: existe so no curriculo do 1o grau, e nas telas do azul
  // `gruposComItens` o descarta sozinho por nao haver item ativo do tipo.
  'dominios',
]

const GRUPO_POR_KIND: Record<TechniqueKind, GrupoTecnico> = {
  raspagem: 'raspagens',
  passagem: 'passagens',
  finalizacao: 'finalizacoes',
  costas: 'finalizacoes',
  saida: 'saidas-defesas',
  defesa: 'saidas-defesas',
  queda: 'quedas',
  movimentacao: 'fundamentos',
  defesa_pessoal: 'defesa-pessoal',
  dominio: 'dominios',
}

/**
 * Grupo tecnico de um item.
 *
 * `Record` completo e nao `switch` com padrao: assim acrescentar um `kind` novo
 * em `TechniqueKind` QUEBRA a compilacao aqui, em vez de cair silenciosamente
 * num grupo de sobra. Um item que aparece na coluna errada nao produz erro
 * nenhum — so um numero errado na tela do professor.
 */
export function grupoDoKind(kind: TechniqueKind): GrupoTecnico {
  return GRUPO_POR_KIND[kind]
}
