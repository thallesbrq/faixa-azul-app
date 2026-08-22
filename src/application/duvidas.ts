/**
 * Duvidas para o professor (RF-07).
 *
 * O seed nasce com ~173 perguntas: 11 do spec 2.2 mais duas por tecnica
 * (gatilho e erro comum, que o app deliberadamente nao inventa). Esse numero e
 * correto no modelo e inutil na pratica — ninguem leva 173 perguntas para uma
 * aula de 50 minutos. Este modulo existe para transformar a lista em algo
 * levavel: recortada por aula e agrupada por tecnica.
 *
 * Modulo puro: sem React, sem I/O.
 */

import type { AulaParticular, TeacherQuestion, TechniqueItem } from '../domain/types'
import type { AlteracaoDuvida } from '../persistence/repositorio'

/**
 * Aplica as alteracoes do aluno sobre as duvidas do seed. Guardamos apenas o
 * que mudou, para que novas perguntas semeadas cheguem sem migracao.
 */
export function mesclarDuvidas(seed: TeacherQuestion[], alteracoes: AlteracaoDuvida[]): TeacherQuestion[] {
  if (alteracoes.length === 0) return seed
  const porId = new Map(alteracoes.map((a) => [a.id, a]))

  return seed.map((d) => {
    const alt = porId.get(d.id)
    if (!alt) return d
    return {
      ...d,
      status: alt.status,
      resposta: alt.resposta,
      respondidaNaAulaNumero: alt.respondidaNaAulaNumero,
      respondidaAt: alt.respondidaAt,
    }
  })
}

export interface GrupoDeDuvidas {
  /** Titulo do grupo: nome da tecnica, ou "Perguntas gerais". */
  titulo: string
  /** Ausente no grupo de perguntas gerais. */
  itemId?: string
  posicao?: string
  duvidas: TeacherQuestion[]
}

/**
 * Usa travessao em vez de parenteses porque muitos nomes de variacao ja
 * terminam com um parentese ("Raspagem de tesoura (scissor sweep)") — o formato
 * anterior produzia "... (scissor sweep) (Raspada 1)".
 */
function rotuloDoItem(item: TechniqueItem): string {
  return item.nome ? `${item.nome} — ${item.slot}` : item.slot
}

/**
 * Agrupa por tecnica. As perguntas gerais (sem item) vem primeiro, porque valem
 * para qualquer aula e sao as que mais mudam o entendimento do exame.
 */
export function agruparDuvidas(duvidas: TeacherQuestion[], itens: TechniqueItem[]): GrupoDeDuvidas[] {
  const porId = new Map(itens.map((i) => [i.id, i]))

  const gerais = duvidas.filter((d) => !d.itemId)
  const grupos: GrupoDeDuvidas[] = gerais.length
    ? [{ titulo: 'Perguntas gerais', duvidas: gerais }]
    : []

  const porItem = new Map<string, TeacherQuestion[]>()
  for (const d of duvidas) {
    if (!d.itemId) continue
    const lista = porItem.get(d.itemId)
    if (lista) lista.push(d)
    else porItem.set(d.itemId, [d])
  }

  for (const [itemId, lista] of porItem) {
    const item = porId.get(itemId)
    grupos.push({
      titulo: item ? rotuloDoItem(item) : itemId,
      itemId,
      posicao: item?.posicao,
      duvidas: lista,
    })
  }

  return grupos
}

/** Duvidas abertas de uma aula: as gerais mais as das tecnicas daquela aula. */
export function duvidasDaAula(aula: AulaParticular, duvidas: TeacherQuestion[]): TeacherQuestion[] {
  const daAula = new Set(aula.itemIds)
  return duvidas.filter((d) => d.status === 'aberta' && (!d.itemId || daAula.has(d.itemId)))
}

/**
 * Texto para levar a academia. Markdown simples, legivel impresso ou no
 * celular, sem depender do app estar aberto.
 */
export function exportarDuvidas(entrada: {
  titulo: string
  duvidas: TeacherQuestion[]
  itens: TechniqueItem[]
}): string {
  const { titulo, duvidas, itens } = entrada
  if (duvidas.length === 0) return `# ${titulo}\n\nNenhuma dúvida aberta.\n`

  const grupos = agruparDuvidas(duvidas, itens)
  const linhas: string[] = [`# ${titulo}`, '']

  for (const grupo of grupos) {
    linhas.push(`## ${grupo.titulo}`)
    if (grupo.posicao && grupo.posicao !== grupo.titulo) linhas.push(`_${grupo.posicao}_`)
    linhas.push('')
    for (const d of grupo.duvidas) linhas.push(`- [ ] ${d.pergunta}`)
    linhas.push('')
  }

  linhas.push('---')
  linhas.push('')
  linhas.push(
    'Gerado pelo app Faixa Azul. As técnicas do app são sugestões minhas, não o currículo da academia — ' +
      'a correção do professor é o que vale.',
  )
  linhas.push('')

  return linhas.join('\n')
}

/** Contagem por estado, para o cabecalho da tela. */
export function resumoDeDuvidas(duvidas: TeacherQuestion[]): {
  abertas: number
  levadas: number
  respondidas: number
} {
  return {
    abertas: duvidas.filter((d) => d.status === 'aberta').length,
    levadas: duvidas.filter((d) => d.status === 'levada_a_aula').length,
    respondidas: duvidas.filter((d) => d.status === 'respondida').length,
  }
}
