/**
 * Validacao pelo professor — o unico caminho para um item deixar de ser
 * "sugestao nao validada".
 *
 * Existe porque o maior risco do projeto e o conteudo: 70 dos 81 itens tem
 * passo a passo redigido como sugestao padrao de faixa azul, nao como o
 * curriculo da academia. Se o professor corrigir e o app nao registrar, o aluno
 * continua estudando a versao errada.
 *
 * Dois canais (ADR-013 / decisao de planejamento):
 * - `aula_particular`: as 10 aulas pagas, focadas nas Secoes 4 e 5
 * - `aula_regular`: as aulas de segunda e quarta, canal dos 25 itens de
 *   Fundamentos, Defesa Pessoal e Quedas
 *
 * Modulo puro: sem React, sem I/O, `agora` sempre injetado.
 */

import type { TechniqueItem, ValidacaoDoProfessor, ValidationStatus } from './types'

/** Status que uma validacao pode atribuir. */
const STATUS_PERMITIDOS: ValidationStatus[] = [
  'validado_pelo_professor',
  'variante_pessoal',
  'aguardando_validacao',
  'descartado',
]

export function criarValidacao(entrada: {
  id: string
  itemId: string
  texto: string
  novoStatus: ValidationStatus
  origem: ValidacaoDoProfessor['origem']
  aulaNumero?: number
  sessionId?: string
  agora: Date
}): ValidacaoDoProfessor {
  const { agora, ...resto } = entrada

  if (!STATUS_PERMITIDOS.includes(resto.novoStatus)) {
    throw new Error(
      `status invalido para validacao: ${resto.novoStatus}. ` +
        `"sugestao_nao_validada" e o estado inicial do app, nao algo que o professor atribui.`,
    )
  }
  if (!resto.texto.trim()) {
    throw new Error('validacao exige o texto do que o professor disse — status sem justificativa nao e rastreavel')
  }
  if (resto.origem === 'aula_particular' && resto.aulaNumero === undefined) {
    throw new Error('validacao de aula particular exige o numero da aula')
  }

  return { ...resto, registradaEm: agora.toISOString() }
}

/**
 * Aplica as validacoes aos itens. Funcao pura: devolve novos itens.
 *
 * Quando ha mais de uma validacao para o mesmo item, a mais recente vence — o
 * professor pode mudar de opiniao numa aula seguinte, e o historico permanece
 * intacto no array de validacoes (append-only, ADR-010).
 */
export function aplicarValidacoes(
  itens: TechniqueItem[],
  validacoes: ValidacaoDoProfessor[],
): TechniqueItem[] {
  if (validacoes.length === 0) return itens

  const maisRecentePorItem = new Map<string, ValidacaoDoProfessor>()
  for (const v of validacoes) {
    const atual = maisRecentePorItem.get(v.itemId)
    if (!atual || v.registradaEm >= atual.registradaEm) maisRecentePorItem.set(v.itemId, v)
  }

  return itens.map((item) => {
    const v = maisRecentePorItem.get(item.id)
    return v ? { ...item, validationStatus: v.novoStatus } : item
  })
}

/** Notas do professor para um item, da mais recente para a mais antiga. */
export function historicoDoItem(itemId: string, validacoes: ValidacaoDoProfessor[]): ValidacaoDoProfessor[] {
  return validacoes
    .filter((v) => v.itemId === itemId)
    .sort((a, b) => b.registradaEm.localeCompare(a.registradaEm))
}

/** Quantos itens ja passaram pelo professor, por canal. */
export function coberturaDeValidacao(
  itens: TechniqueItem[],
  validacoes: ValidacaoDoProfessor[],
): { validados: number; total: number; porOrigem: Record<string, number> } {
  const aplicados = aplicarValidacoes(itens, validacoes)
  const validados = aplicados.filter((i) => i.validationStatus === 'validado_pelo_professor').length

  const porOrigem: Record<string, number> = {}
  for (const itemId of new Set(validacoes.map((v) => v.itemId))) {
    const ultima = historicoDoItem(itemId, validacoes)[0]
    if (ultima?.novoStatus === 'validado_pelo_professor') {
      porOrigem[ultima.origem] = (porOrigem[ultima.origem] ?? 0) + 1
    }
  }

  return { validados, total: itens.filter((i) => i.ativo).length, porOrigem }
}
