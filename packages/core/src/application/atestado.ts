/**
 * A folha de atestacao de uma graduacao.
 *
 * O FORMATO E O QUE O PROFESSOR MANDOU, e nao um agrupamento nosso: Quedas,
 * Guarda fechada, Educativos, Posicao individual, Finalizacoes, Saidas. A ordem
 * e os titulos vem dos MODULOS do curriculo, que foram escritos com as palavras
 * dele (ver seed/primeiro-grau). Reagrupar por conta propria criaria uma segunda
 * linguagem — o erro que `taxonomia.ts` registra.
 *
 * DOIS REQUISITOS INDEPENDENTES, e a tela nao pode fundi-los:
 *   1. as 29 competencias atestadas por ele
 *   2. as 35 aulas cumpridas
 *
 * O segundo depende da fatia 3 do ADR-016 (programa da turma + presenca). Ate
 * ela existir, `aulasCumpridas` chega `null` — que NAO e zero: e "o app nao
 * conta isso ainda, confira voce". Tratar como zero faria a folha dizer que
 * faltam 35 aulas a um aluno que talvez tenha 40.
 *
 * `apto` E SOBRE AS COMPETENCIAS, e o nome diz isso: `competenciasCompletas`.
 * Nao existe um booleano unico "apto ao grau" aqui de proposito — quem junta os
 * dois requisitos e o professor, no ato de conceder, porque um deles o sistema
 * ainda nao sabe.
 *
 * Modulo puro: sem React, sem I/O, `agora` injetado onde precisa.
 */

import type { TechniqueItem, Modulo } from '../domain/types'
import type { RegistroDeCompetencia } from '../domain/competencia'
import { historicoDoItem, itensCompetentes } from '../domain/competencia'
import { aulasExigidas } from '../domain/metas'
import type { Curriculo } from '../domain/curriculo'

export interface LinhaDoAtestado {
  item: TechniqueItem
  /** Atestado hoje. Retirado conta como `false`, mesmo tendo sido atestado antes. */
  competente: boolean
  /** A atestacao (ou retirada) mais recente, para a tela mostrar quem e quando. */
  ultimo: RegistroDeCompetencia | null
  /** Quantas vezes este item foi atestado ou retirado. `> 1` merece um olhar. */
  vezes: number
}

export interface GrupoDoAtestado {
  moduloId: string
  /** O titulo que o professor escreveu. */
  nome: string
  linhas: LinhaDoAtestado[]
  atestados: number
  total: number
}

export interface Atestado {
  grupos: GrupoDoAtestado[]
  atestados: number
  total: number
  /** 0 a 1 — o progresso de uma meta medida por atestado. */
  progresso: number
  competenciasCompletas: boolean
  /** Itens que faltam atestar, na ordem da folha. */
  faltando: TechniqueItem[]
  /**
   * Aulas exigidas pela meta, e quantas o sistema conseguiu contar.
   *
   * `cumpridas: null` significa "o app nao conta isso ainda" — e nao zero.
   */
  aulas: { exigidas: number | null; cumpridas: number | null }
}

export function montarAtestado({
  curriculo,
  modulos,
  registros,
  meta,
  aulasCumpridas,
}: {
  curriculo: Curriculo
  /** Os modulos DO CURRICULO, para os titulos e a ordem serem os dele. */
  modulos: readonly Modulo[]
  registros: readonly RegistroDeCompetencia[]
  meta: string
  /** `null` enquanto a contagem de aulas nao existir (fatia 3). */
  aulasCumpridas: number | null
}): Atestado {
  const competentes = itensCompetentes(registros)
  const ativos = curriculo.itens.filter((i) => i.ativo)

  const linhaDe = (item: TechniqueItem): LinhaDoAtestado => {
    const historico = historicoDoItem(item.id, registros)
    return {
      item,
      competente: competentes.has(item.id),
      ultimo: historico.length > 0 ? historico[historico.length - 1] : null,
      vezes: historico.length,
    }
  }

  // A ORDEM VEM DE `modulos`, e nao da ordem dos itens no seed: a folha e um
  // documento da academia, e a sequencia dos titulos e parte do formato.
  const grupos: GrupoDoAtestado[] = [...modulos]
    .sort((a, b) => a.ordem - b.ordem)
    .map((m) => {
      const linhas = ativos.filter((i) => i.moduloId === m.id).map(linhaDe)
      return {
        moduloId: m.id,
        nome: m.nome,
        linhas,
        atestados: linhas.filter((l) => l.competente).length,
        total: linhas.length,
      }
    })
    // Modulo sem item ativo nao vira secao vazia na folha.
    .filter((g) => g.total > 0)

  const total = ativos.length
  const atestados = ativos.filter((i) => competentes.has(i.id)).length

  return {
    grupos,
    atestados,
    total,
    // Curriculo vazio devolve 0 e nao NaN: dividir por zero aqui poria "NaN%" na
    // tela de um professor.
    progresso: total === 0 ? 0 : atestados / total,
    // Curriculo vazio NAO esta completo: seria "apto" por nao haver exigencia.
    competenciasCompletas: total > 0 && atestados === total,
    faltando: grupos.flatMap((g) => g.linhas.filter((l) => !l.competente).map((l) => l.item)),
    aulas: { exigidas: aulasExigidas(meta), cumpridas: aulasCumpridas },
  }
}

/**
 * Falta quanto para as aulas — `null` quando o sistema nao sabe contar.
 *
 * Existe como funcao propria para a tela nao fazer essa subtracao no meio do
 * JSX: `35 - null` daria `35`, e a folha diria que faltam 35 aulas a quem
 * talvez tenha 40. `null` tem de sobreviver ao calculo.
 */
export function aulasFaltando(aulas: Atestado['aulas']): number | null {
  if (aulas.exigidas === null) return null
  if (aulas.cumpridas === null) return null
  return Math.max(0, aulas.exigidas - aulas.cumpridas)
}
