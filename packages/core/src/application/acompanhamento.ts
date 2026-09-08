/**
 * O ACOMPANHAMENTO DA TURMA — alunos x itens do curriculo, item por item.
 *
 * POR QUE ISTO EXISTE, e o pedido foi direto: "em relacao a turma RGI a
 * necessidade do professor e acompanhar conforme as aulas progridem se o aluno
 * esta aprendendo as tecnicas necessarias do curriculo que levantamos para o 1o
 * grau nas 35 aulas".
 *
 * A folha do atestado responde isso por UM aluno. Para a turma, o professor
 * precisa da matriz — e nao de quatro folhas abertas em quatro abas.
 *
 * ---------------------------------------------------------------------------
 * "ESTA APRENDENDO" JUNTA TRES COISAS, e separa-las e o que faz a tela servir:
 *
 *   1. FOI ENSINADO — a aula que contem o item ja foi dada. Sai do programa da
 *      turma (que aula contem o item) mais a data dela (ja passou?).
 *   2. O ALUNO ESTAVA LA — presenca. NAO EXISTE ainda, e por isso `ensinado`
 *      significa "a aula aconteceu", nao "este aluno viu".
 *   3. O ALUNO EXECUTA — a atestacao do professor. Existe, item por item.
 *
 * O VALOR DA TELA E A LACUNA ENTRE 1 E 3: "a aula 3 ja passou, ela deu
 * Rolamentos, e eu nao marquei ninguem". Essa e a fila de trabalho do professor,
 * e ela e derivavel HOJE, sem presenca.
 * ---------------------------------------------------------------------------
 *
 * Modulo puro: sem React, sem I/O.
 */

import type { Modulo, TechniqueItem } from '../domain/types'
import type { RegistroDeCompetencia } from '../domain/competencia'
import { itensCompetentes } from '../domain/competencia'
import type { AulaAgendavel } from './agenda'
import { comoDataLocal, partesDoSlot } from './agenda'

/**
 * O estado de um par (aluno, item).
 *
 * TRES ESTADOS E NAO DOIS, e o terceiro e o que informa: `pendente` e "foi dado
 * e eu nao marquei". Com dois estados (atestado / nao atestado) o professor nao
 * distingue o que ele deixou passar do que ainda nem chegou — e a tela viraria
 * uma lista de 29 coisas por fazer desde o primeiro dia.
 */
export type EstadoDoItem =
  /** A aula que contem o item ainda nao foi dada. Nada a fazer. */
  | 'nao-ensinado'
  /** A aula ja foi dada e o professor nao atestou. A fila de trabalho. */
  | 'pendente'
  /** O professor atestou. */
  | 'atestado'
  /**
   * O professor RETIROU o atestado (registro novo com `competente: false`).
   *
   * Diferente de `pendente`: aqui houve uma decisao. Confundir os dois faria
   * um item retirado voltar a parecer esquecimento, e o professor o marcaria de
   * novo sem lembrar por que o tirou.
   */
  | 'retirado'

export interface CelulaDoAcompanhamento {
  alunoUid: string
  itemId: string
  estado: EstadoDoItem
}

export interface ItemNoAcompanhamento {
  item: TechniqueItem
  /** A aula do programa que contem este item, ou `null` se nenhuma contem. */
  aula: number | null
  /** `YYYY-MM-DD` da aula, quando ela tem data. */
  data: string | null
  /** A aula ja foi dada? `false` tambem quando ela nao tem data. */
  ensinado: boolean
  /** Uma celula por aluno, na ordem em que os alunos chegaram. */
  celulas: CelulaDoAcompanhamento[]
  /** Quantos alunos ainda esperam atestacao NESTE item, com a aula ja dada. */
  pendentes: number
}

export interface GrupoDoAcompanhamento {
  modulo: Modulo
  itens: ItemNoAcompanhamento[]
  /** Soma dos pendentes do grupo — o que o botao "atestar a area" resolveria. */
  pendentes: number
}

export interface AlunoNoAcompanhamento {
  uid: string
  nome: string
  /** Quantos dos itens do curriculo ele tem atestados. */
  atestados: number
  /** Itens com a aula ja dada e sem atestacao dele. */
  pendentes: number
}

export interface Acompanhamento {
  turma: string
  alunos: AlunoNoAcompanhamento[]
  grupos: GrupoDoAcompanhamento[]
  /** Total de itens do curriculo (o denominador do gate). */
  totalDeItens: number
  /** Itens cuja aula ja foi dada. */
  ensinados: number
  /** Pares (aluno, item) esperando atestacao. A fila da turma. */
  pendentes: number
}

/**
 * Em que aula cada item do curriculo foi programado.
 *
 * A PRIMEIRA APARICAO GANHA, e o desempate importa porque repeticao e o metodo
 * aqui: um item aparece na aula 4 e volta na aula 14 (ver `domain/circulo`). O
 * que decide "foi ensinado" e a PRIMEIRA vez — na segunda o aluno esta revendo,
 * e esperar a revisao para considerar ensinado atrasaria a fila do professor em
 * dez aulas.
 */
export function aulaDeCadaItem(
  aulas: readonly { numero: number; itemIds: readonly string[] }[],
): Map<string, number> {
  const porItem = new Map<string, number>()
  for (const a of [...aulas].sort((x, y) => x.numero - y.numero)) {
    for (const id of a.itemIds) {
      if (!porItem.has(id)) porItem.set(id, a.numero)
    }
  }
  return porItem
}

/**
 * O estado atual de cada item para um aluno, a partir do log append-only.
 *
 * `itensCompetentes` ja resolve "o registro mais recente ganha". Aqui o que se
 * acrescenta e distinguir NUNCA ATESTADO de ATESTADO E RETIRADO — dois estados
 * que o `Set` de competentes colapsa num so.
 */
function estadoPorItem(registros: readonly RegistroDeCompetencia[]): Map<string, 'atestado' | 'retirado'> {
  const competentes = itensCompetentes(registros)
  const mencionados = new Set(registros.map((r) => r.itemId))

  const mapa = new Map<string, 'atestado' | 'retirado'>()
  for (const id of mencionados) {
    mapa.set(id, competentes.has(id) ? 'atestado' : 'retirado')
  }
  return mapa
}

export function montarAcompanhamento({
  turma,
  alunos,
  itens,
  modulos,
  aulas,
  registrosPorAluno,
  hoje,
}: {
  turma: string
  /** Os alunos da turma, na ordem em que a tela vai mostrar as colunas. */
  alunos: readonly { uid: string; nome: string }[]
  /** Os itens do curriculo do 1o grau. */
  itens: readonly TechniqueItem[]
  /** Os modulos do curriculo, para os titulos e a ordem do professor. */
  modulos: readonly Modulo[]
  /** As aulas do programa da turma, com `itemIds` e `slot`. */
  aulas: readonly (AulaAgendavel & { itemIds: readonly string[] })[]
  /** Registros de competencia por uid de aluno. Ausente = nenhum. */
  registrosPorAluno: ReadonlyMap<string, readonly RegistroDeCompetencia[]>
  hoje: Date
}): Acompanhamento {
  const limite = comoDataLocal(hoje)
  const aulaDoItem = aulaDeCadaItem(aulas)
  const dataDaAula = new Map<number, string>()
  for (const a of aulas) {
    const p = partesDoSlot(a.slot)
    if (p) dataDaAula.set(a.numero, p.data)
  }

  const estados = new Map<string, Map<string, 'atestado' | 'retirado'>>()
  for (const a of alunos) {
    estados.set(a.uid, estadoPorItem(registrosPorAluno.get(a.uid) ?? []))
  }

  const porModulo = new Map<string, ItemNoAcompanhamento[]>()
  let ensinados = 0
  let pendentesDaTurma = 0

  for (const item of itens) {
    const aula = aulaDoItem.get(item.id) ?? null
    const data = aula === null ? null : (dataDaAula.get(aula) ?? null)
    /**
     * ENSINADO EXIGE DATA NO PASSADO, e nao apenas estar no programa.
     *
     * Um item programado na aula 20 sem data marcada nao foi ensinado — e sem
     * esta condicao ele apareceria como pendente desde o primeiro dia, e a fila
     * do professor nasceria com 29 linhas que ele nao pode resolver.
     *
     * Compara TEXTO `YYYY-MM-DD`: a aula das 8h conta como dada no proprio dia,
     * e nao a partir de amanha. O professor atesta depois da aula que acabou.
     */
    const ensinado = data !== null && data <= limite
    if (ensinado) ensinados += 1

    const celulas: CelulaDoAcompanhamento[] = alunos.map((al) => {
      const doAluno = estados.get(al.uid)?.get(item.id)
      const estado: EstadoDoItem =
        doAluno === 'atestado'
          ? 'atestado'
          : doAluno === 'retirado'
            ? 'retirado'
            : ensinado
              ? 'pendente'
              : 'nao-ensinado'
      return { alunoUid: al.uid, itemId: item.id, estado }
    })

    const pendentes = celulas.filter((c) => c.estado === 'pendente').length
    pendentesDaTurma += pendentes

    const lista = porModulo.get(item.moduloId)
    const entrada: ItemNoAcompanhamento = { item, aula, data, ensinado, celulas, pendentes }
    if (lista) lista.push(entrada)
    else porModulo.set(item.moduloId, [entrada])
  }

  /**
   * OS GRUPOS SEGUEM `modulos`, e nao a ordem dos itens.
   *
   * A ordem dos modulos e a do professor (Quedas, Guarda fechada, Educativos,
   * Posicao individual, Finalizacoes, Saidas — ver `seed/primeiro-grau`). Ordenar
   * pela ordem em que os itens aparecem no array faria a tela seguir como o seed
   * foi escrito, e o professor procuraria "Finalizacoes" onde ela nao esta.
   *
   * Modulo sem item nao vira grupo: um titulo vazio na matriz gasta uma linha
   * para dizer que nao ha nada.
   */
  const grupos: GrupoDoAcompanhamento[] = [...modulos]
    .sort((a, b) => a.ordem - b.ordem)
    .flatMap((modulo) => {
      const itensDoModulo = porModulo.get(modulo.id)
      if (!itensDoModulo?.length) return []
      return [
        {
          modulo,
          itens: itensDoModulo,
          pendentes: itensDoModulo.reduce((n, i) => n + i.pendentes, 0),
        },
      ]
    })

  const porAluno: AlunoNoAcompanhamento[] = alunos.map((al) => {
    const todas = grupos.flatMap((g) => g.itens).flatMap((i) => i.celulas)
    const minhas = todas.filter((c) => c.alunoUid === al.uid)
    return {
      uid: al.uid,
      nome: al.nome,
      atestados: minhas.filter((c) => c.estado === 'atestado').length,
      pendentes: minhas.filter((c) => c.estado === 'pendente').length,
    }
  })

  return {
    turma,
    alunos: porAluno,
    grupos,
    totalDeItens: itens.length,
    ensinados,
    pendentes: pendentesDaTurma,
  }
}

// ---------------------------------------------------------------------------
// Atestar em lote
// ---------------------------------------------------------------------------

export interface ParaAtestar {
  alunoUid: string
  itemId: string
}

/**
 * Os pares (aluno, item) que "atestar a area inteira" resolveria.
 *
 * SO OS PENDENTES ENTRAM, e essa e a diferenca entre util e destrutivo. Incluir
 * `atestado` gravaria um registro repetido num log append-only — poluicao
 * permanente. Incluir `retirado` DESFARIA uma decisao do professor sem ele pedir,
 * e ele nao veria: a celula so voltaria a verde.
 *
 * `nao-ensinado` fica fora porque a aula nao aconteceu. Atestar o que nao foi
 * dado e o unico jeito de o gate do 1o grau ficar sem significado.
 */
export function paresPendentes(
  itens: readonly ItemNoAcompanhamento[],
  /** Um aluno so, ou todos quando `null`. */
  alunoUid: string | null = null,
): ParaAtestar[] {
  const pares: ParaAtestar[] = []
  for (const i of itens) {
    for (const c of i.celulas) {
      if (c.estado !== 'pendente') continue
      if (alunoUid !== null && c.alunoUid !== alunoUid) continue
      pares.push({ alunoUid: c.alunoUid, itemId: c.itemId })
    }
  }
  return pares
}
