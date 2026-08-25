/**
 * Montagem manual das aulas — o professor distribui os 56 itens nas 10 aulas.
 *
 * POR QUE MANUAL. O plano do circulo (ver ./aulas) existia porque nao havia
 * pauta e o app precisava propor uma. Com o professor montando junto, a proposta
 * deixa de ser a verdade: ele conhece o aluno, a academia e a banca. O gerador
 * continua disponivel como sugestao opcional, nao como fonte.
 *
 * OBJETIVO DECLARADO PELO ALUNO: encaixar os 56 nas 10 aulas. Item que sobra no
 * bolsao e ERRO a corrigir antes de fechar, nao conteudo para o aulao. Por isso
 * `completo` existe e por isso o bolsao e contado, nao escondido.
 *
 * A aritmetica que a tela precisa mostrar: 56 / 10 = 5,6. Nao divide exato,
 * entao o unico arranjo parelho e seis aulas com 6 e quatro com 5. O modulo nao
 * IMPOE isso — o professor pode fazer o que quiser — mas informa.
 *
 * O BOLSAO E DERIVADO, nunca armazenado. Guardar as duas pontas (atribuidos e
 * nao atribuidos) criaria dois estados que podem discordar; aqui existe uma
 * fonte, `atribuicao`, e o resto e calculado dela.
 *
 * Modulo puro: sem React, sem I/O.
 */

import type { TechniqueItem } from '../domain/types'
import { ORDEM_GUARDA, guardaDaPosicao } from '../domain/taxonomia'
import type { Guarda } from '../domain/taxonomia'

/** Aula -> ids dos itens nela, na ordem em que foram postos. */
export type Atribuicao = ReadonlyMap<number, readonly string[]>

/** Quantas aulas o pacote tem. */
export const TOTAL_DE_AULAS = 10

export interface GrupoDoBolsao {
  guarda: Guarda
  itens: TechniqueItem[]
}

export interface AulaMontada {
  numero: number
  itens: TechniqueItem[]
}

/**
 * Problemas que impedem considerar a montagem pronta.
 *
 * `duplicado` nao deveria acontecer — `atribuir` mantem a invariante de um lugar
 * por item — mas e detectado porque o estado vem do armazenamento, que pode ter
 * sido editado a mao ou importado de um backup de outra versao.
 */
export type Problema =
  | { tipo: 'faltam'; quantos: number }
  | { tipo: 'aula-vazia'; aulas: number[] }
  | { tipo: 'duplicado'; itemId: string; aulas: number[] }
  | { tipo: 'item-inexistente'; itemId: string }

export interface EstadoDaMontagem {
  /** Itens ainda nao atribuidos, agrupados pelas guardas do curriculo. */
  bolsao: GrupoDoBolsao[]
  aulas: AulaMontada[]
  naoAtribuidos: number
  atribuidos: number
  total: number
  /** Tudo encaixado e nenhuma aula vazia. */
  completo: boolean
  problemas: Problema[]
  /** Tamanho sugerido de cada aula para o arranjo mais parelho possivel. */
  tamanhosSugeridos: number[]
}

/**
 * Move um item para uma aula, ou de volta ao bolsao com `aula: null`.
 *
 * Retira o item de onde estiver ANTES de por no destino — e o que garante a
 * invariante de um item em um lugar so. Sem essa remocao, arrastar da aula 3
 * para a 7 deixaria o item nas duas, e a soma passaria de 56 sem ninguem notar.
 */
export function atribuir(
  atribuicao: Atribuicao,
  itemId: string,
  aula: number | null,
): Map<number, string[]> {
  const proxima = new Map<number, string[]>()
  for (const [n, ids] of atribuicao) {
    proxima.set(
      n,
      ids.filter((id) => id !== itemId),
    )
  }
  if (aula !== null) {
    proxima.set(aula, [...(proxima.get(aula) ?? []), itemId])
  }
  return proxima
}

/** Move vários itens de uma vez, preservando a invariante. */
export function atribuirVarios(
  atribuicao: Atribuicao,
  itemIds: readonly string[],
  aula: number | null,
): Map<number, string[]> {
  let atual: Atribuicao = atribuicao
  for (const id of itemIds) atual = atribuir(atual, id, aula)
  return new Map([...atual].map(([n, ids]) => [n, [...ids]]))
}

/** Onde um item esta, ou `null` se estiver no bolsao. */
export function aulaDoItem(atribuicao: Atribuicao, itemId: string): number | null {
  for (const [n, ids] of atribuicao) {
    if (ids.includes(itemId)) return n
  }
  return null
}

/**
 * Tamanhos mais parelhos possiveis para distribuir `total` em `aulas`.
 *
 * 56 em 10 devolve [6,6,6,6,6,6,5,5,5,5] — os maiores primeiro, porque aqui e
 * so referencia visual e nao ordem de execucao.
 */
export function tamanhosSugeridos(total: number, aulas = TOTAL_DE_AULAS): number[] {
  if (aulas <= 0) return []
  const base = Math.floor(total / aulas)
  const resto = total % aulas
  return Array.from({ length: aulas }, (_, i) => base + (i < resto ? 1 : 0))
}

/**
 * Consolida o estado da montagem a partir do curriculo e da atribuicao.
 *
 * Recebe TODOS os itens ativos e deriva o bolsao — nao ha lista de "nao
 * atribuidos" guardada em lugar nenhum.
 */
export function montarEstado({
  itens,
  atribuicao,
  totalDeAulas = TOTAL_DE_AULAS,
}: {
  itens: TechniqueItem[]
  atribuicao: Atribuicao
  totalDeAulas?: number
}): EstadoDaMontagem {
  const ativos = itens.filter((i) => i.ativo)
  const porId = new Map(ativos.map((i) => [i.id, i]))
  const problemas: Problema[] = []

  /** Onde cada item aparece. Mais de uma aula = dado corrompido. */
  const aparicoes = new Map<string, number[]>()
  for (const [n, ids] of atribuicao) {
    for (const id of ids) {
      if (!porId.has(id)) {
        problemas.push({ tipo: 'item-inexistente', itemId: id })
        continue
      }
      const lista = aparicoes.get(id)
      if (lista) lista.push(n)
      else aparicoes.set(id, [n])
    }
  }
  for (const [itemId, aulas] of aparicoes) {
    if (aulas.length > 1) problemas.push({ tipo: 'duplicado', itemId, aulas })
  }

  const aulas: AulaMontada[] = Array.from({ length: totalDeAulas }, (_, i) => {
    const numero = i + 1
    const ids = atribuicao.get(numero) ?? []
    return {
      numero,
      // Dedup e filtro de fantasma: a tela nunca mostra o que nao existe.
      itens: [...new Set(ids)].flatMap((id) => {
        const item = porId.get(id)
        return item ? [item] : []
      }),
    }
  })

  const naoAtribuidosItens = ativos.filter((i) => !aparicoes.has(i.id))

  // Bolsao agrupado pelas guardas do curriculo, na ordem do exame.
  const porGuarda = new Map<Guarda, TechniqueItem[]>()
  for (const item of naoAtribuidosItens) {
    const g = guardaDaPosicao(item.posicao)
    if (!g) continue
    const lista = porGuarda.get(g)
    if (lista) lista.push(item)
    else porGuarda.set(g, [item])
  }
  const bolsao: GrupoDoBolsao[] = ORDEM_GUARDA.flatMap((guarda) => {
    const itensDaGuarda = porGuarda.get(guarda)
    return itensDaGuarda?.length ? [{ guarda, itens: itensDaGuarda }] : []
  })

  const vazias = aulas.filter((a) => a.itens.length === 0).map((a) => a.numero)
  if (naoAtribuidosItens.length > 0) {
    problemas.push({ tipo: 'faltam', quantos: naoAtribuidosItens.length })
  }
  if (vazias.length > 0) problemas.push({ tipo: 'aula-vazia', aulas: vazias })

  const atribuidos = aulas.reduce((n, a) => n + a.itens.length, 0)

  return {
    bolsao,
    aulas,
    naoAtribuidos: naoAtribuidosItens.length,
    atribuidos,
    total: ativos.length,
    completo: problemas.length === 0,
    problemas,
    tamanhosSugeridos: tamanhosSugeridos(ativos.length, totalDeAulas),
  }
}

// ---------------------------------------------------------------------------
// Espacamento: a informacao que a montagem manual perde
// ---------------------------------------------------------------------------

export interface EspacamentoDaGuarda {
  guarda: Guarda
  /** Aulas em que a guarda aparece, em ordem. */
  aulas: number[]
  /**
   * Menor intervalo entre duas aparicoes consecutivas. `null` quando aparece em
   * uma aula so — ai nao ha intervalo a medir.
   */
  menorIntervalo: number | null
  /** Concentrada numa aula unica: nenhuma segunda passagem. */
  concentrada: boolean
}

/**
 * Quanto cada guarda esta espalhada pelas aulas.
 *
 * Existe porque a montagem manual perde, em silencio, o que o metodo do circulo
 * garantia: rever uma guarda quando ela ja comecou a sair da memoria. Se o
 * professor puser toda a Guarda Fechada na aula 1, o aluno a treina em setembro
 * e nao volta a ela. O modulo nao impede — mostra, e a decisao fica com quem
 * sabe.
 */
export function espacamentoPorGuarda(aulas: AulaMontada[]): EspacamentoDaGuarda[] {
  const porGuarda = new Map<Guarda, Set<number>>()
  for (const aula of aulas) {
    for (const item of aula.itens) {
      const g = guardaDaPosicao(item.posicao)
      if (!g) continue
      if (!porGuarda.has(g)) porGuarda.set(g, new Set())
      porGuarda.get(g)!.add(aula.numero)
    }
  }

  return ORDEM_GUARDA.flatMap((guarda) => {
    const conjunto = porGuarda.get(guarda)
    if (!conjunto?.size) return []
    const numeros = [...conjunto].sort((a, b) => a - b)
    const intervalos = numeros.slice(1).map((n, i) => n - numeros[i])
    return [
      {
        guarda,
        aulas: numeros,
        menorIntervalo: intervalos.length > 0 ? Math.min(...intervalos) : null,
        concentrada: numeros.length === 1,
      },
    ]
  })
}

/** Atribuicao a partir do plano gerado — o botao "sugerir distribuicao". */
export function atribuicaoDoPlano(aulas: { numero: number; itens: TechniqueItem[] }[]): Map<number, string[]> {
  return new Map(aulas.map((a) => [a.numero, a.itens.map((i) => i.id)]))
}
