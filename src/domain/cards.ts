/**
 * Gerador de cartoes.
 *
 * Deriva cartoes do curriculo. Gera SOMENTE os 5 tipos que os dados atuais
 * sustentam (decisao de planejamento). Os tipos `erro_comum`, `aplicacao`
 * (gatilho) e `reacao` do spec 11 nao sao gerados: o spec proibe inventar esse
 * conteudo, e a ausencia dele virou pergunta ao professor (ver seed/duvidas).
 *
 * Modulo puro: sem React, sem I/O, sem aleatoriedade.
 */

import type { Card, RequisitoProva, TechniqueContent, TechniqueItem, TechniqueKind } from './types'

/** Minimo de etapas para que ordenar tenha valor pedagogico. */
export const MIN_PASSOS_SEQUENCIA = 3

/**
 * Kinds em que perguntar "isto e raspagem ou passagem?" discrimina de fato.
 * Em Fundamentos, Quedas e Defesa Pessoal o kind e constante dentro do modulo —
 * a pergunta seria trivial.
 */
const KINDS_CLASSIFICAVEIS: TechniqueKind[] = [
  'raspagem',
  'passagem',
  'finalizacao',
  'costas',
  'saida',
  'defesa',
]

const ROTULO_KIND: Record<TechniqueKind, string> = {
  raspagem: 'Raspagem',
  passagem: 'Passagem',
  finalizacao: 'Finalizacao',
  costas: 'Ida para as costas',
  saida: 'Saida',
  defesa: 'Defesa de finalizacao',
  movimentacao: 'Movimentacao',
  queda: 'Queda',
  defesa_pessoal: 'Defesa pessoal',
}

function rotulo(item: TechniqueItem): string {
  return item.nome || `${item.posicao} — ${item.slot}`
}

const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Cartoes derivados de uma tecnica. Devolve lista vazia quando o item nao tem
 * conteudo que sustente pergunta alguma — caso dos 11 itens de Defesa Pessoal,
 * que existem no curriculo mas nao tem passo a passo (ADR-012).
 */
export function cartoesDaTecnica(item: TechniqueItem, conteudo: TechniqueContent | undefined): Card[] {
  if (!item.ativo) return []

  const cartoes: Card[] = []
  const passos = conteudo?.passos ?? []

  if (passos.length > 0) {
    cartoes.push({
      id: `${item.id}--explicacao`,
      itemId: item.id,
      type: 'explicacao',
      prompt: `Explique em voz alta: ${rotulo(item)} (${item.posicao}).`,
      resposta: passos,
      dica: passos[0],
      validationStatus: item.validationStatus,
      ativo: true,
    })
  }

  if (passos.length >= MIN_PASSOS_SEQUENCIA) {
    cartoes.push({
      id: `${item.id}--sequencia`,
      itemId: item.id,
      type: 'sequencia',
      prompt: `Coloque as etapas na ordem: ${rotulo(item)}.`,
      resposta: passos,
      validationStatus: item.validationStatus,
      ativo: true,
    })
  }

  if (item.kind && KINDS_CLASSIFICAVEIS.includes(item.kind)) {
    cartoes.push({
      id: `${item.id}--classificacao`,
      itemId: item.id,
      type: 'classificacao',
      prompt: `${rotulo(item)} — que tipo de tecnica e esta?`,
      resposta: [ROTULO_KIND[item.kind]],
      validationStatus: item.validationStatus,
      ativo: true,
    })
  }

  return cartoes
}

/** Um cartao por quantidade exigida pela prova. */
export function cartoesDeRequisito(requisitos: RequisitoProva[]): Card[] {
  return requisitos.map((r) => ({
    id: `requisito--${slug(r.posicao)}--${slug(r.categoria)}`,
    type: 'requisito' as const,
    prompt: `Quantas ${r.categoria.toLowerCase()} a prova exige em ${r.posicao}?`,
    resposta: [String(r.quantidade)],
    validationStatus: r.validationStatus,
    ativo: true,
  }))
}

/**
 * Cartao de reconhecimento para um modulo cujos itens nao tem passo a passo.
 * Testa se o aluno sabe O QUE a prova cobre, sem ensinar execucao — o unico
 * tipo de cartao permitido para Defesa Pessoal (ADR-012).
 */
export function cartaoDeReconhecimento(
  idModulo: string,
  titulo: string,
  itens: TechniqueItem[],
): Card | undefined {
  const doModulo = itens.filter((i) => i.moduloId === idModulo && i.ativo)
  if (doModulo.length === 0) return undefined

  return {
    id: `reconhecimento--${idModulo}`,
    type: 'explicacao',
    prompt: `Liste os ${doModulo.length} itens de ${titulo} exigidos na prova.`,
    resposta: doModulo.map((i) => i.slot),
    validationStatus: 'aguardando_validacao',
    ativo: true,
  }
}

/** Monta o baralho completo. */
export function gerarBaralho(entrada: {
  itens: TechniqueItem[]
  conteudos: TechniqueContent[]
  requisitos: RequisitoProva[]
  cartoesTeoria: Card[]
}): Card[] {
  const { itens, conteudos, requisitos, cartoesTeoria } = entrada
  const porItem = new Map(conteudos.map((c) => [c.itemId, c]))

  const cartoes: Card[] = [
    ...itens.flatMap((item) => cartoesDaTecnica(item, porItem.get(item.id))),
    ...cartoesDeRequisito(requisitos),
    ...cartoesTeoria,
  ]

  const reconhecimento = cartaoDeReconhecimento('mod-defesa-pessoal', 'defesa pessoal', itens)
  if (reconhecimento) cartoes.push(reconhecimento)

  const ids = new Set<string>()
  for (const c of cartoes) {
    if (ids.has(c.id)) throw new Error(`cartao duplicado: ${c.id}`)
    ids.add(c.id)
  }

  return cartoes
}
