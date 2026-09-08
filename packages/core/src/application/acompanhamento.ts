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
  /**
   * A aula que COMPLETA este requisito, ou `null` quando ele nao pode ser
   * completado pelo programa atual (nenhuma aula o contem, ou falta alguma parte
   * dele — ver `programacaoDoRequisito`).
   */
  aula: number | null
  /** `YYYY-MM-DD` da aula, quando ela tem data. */
  data: string | null
  /** A aula ja foi dada? `false` tambem quando ela nao tem data. */
  ensinado: boolean
  /**
   * As PARTES do requisito, quando ele e composto por itens de outro curriculo.
   *
   * `null` quando nao ha partes: o requisito esta no programa com o proprio id,
   * ou nao tem equivalentes em outro curriculo.
   *
   * EXISTE PARA QUE NADA FIQUE INVISIVEL. O professor decidiu que "Ukemi conta
   * como todos frente, costas e lateral" — regra fiel ao exame, e com um efeito
   * colateral ruim se nao for mostrada: um requisito com 2 das 3 partes dadas
   * ficaria identico a um que nunca foi programado. Com o parcial na tela, a
   * diferenca entre "falta uma parte" e "nao esta no programa" e legivel.
   *
   * DUAS CONTAGENS E NAO UMA, e confundi-las produziu um defeito que a pagina de
   * amostra mostrou na primeira olhada: a tela dizia "falta parte" para
   * "Raspagem de tesoura", cuja unica parte nao esta programada em lugar nenhum.
   * Nao falta parte — falta o requisito inteiro. `programadas` responde "esta no
   * programa?" e `dadas` responde "ja aconteceu?", e cada uma governa uma frase
   * diferente na tela.
   */
  partes: { programadas: number; dadas: number; total: number } | null
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

export interface ProgramacaoDoRequisito {
  aula: number | null
  data: string | null
  ensinado: boolean
  partes: { programadas: number; dadas: number; total: number } | null
}

/**
 * ONDE UM REQUISITO DO 1o GRAU ESTA NO PROGRAMA, considerando que a mesma tecnica
 * tem id diferente em cada curriculo.
 *
 * ---------------------------------------------------------------------------
 * O DEFEITO QUE ISTO CONSERTA. O bolsao do Planner oferece os itens de AZUL; esta
 * matriz conta os do 1o GRAU; e os dois conjuntos de ids sao disjuntos (ver
 * `seed/equivalencia-1grau`). A aula 1 da RGI ensinou rolamento para frente,
 * rolamento para tras, fuga de quadril e o soto gari — quatro requisitos — e a
 * matriz dizia "0 de 29 itens ja foram dados", com tres deles "fora do programa".
 * O professor deu a aula e a tela negava.
 * ---------------------------------------------------------------------------
 *
 * DOIS CAMINHOS, E NAO UMA PRECEDENCIA. Um requisito pode ser cumprido por:
 *
 *   - o CAMINHO DIRETO: o proprio id `g1-*` numa aula. Uma parte so.
 *   - o CAMINHO POR EQUIVALENCIA: os itens de azul que o compoem, TODOS
 *     necessarios. Decisao do professor: "ukemi conta como todos frente, costas
 *     e lateral". A aula que completa e a ULTIMA delas.
 *
 * O requisito foi ensinado quando QUALQUER caminho se completou.
 *
 * ---------------------------------------------------------------------------
 * PRECEDENCIA FIXA ERA A ABSTRACAO ERRADA, e o dado real mostrou por que.
 *
 * A primeira versao disto dizia "o id proprio ganha", com o argumento de que
 * programar o requisito e o sinal mais forte. No programa da RGI,
 * `quedas--o-soto-gari` esta na aula 1 (dada em 08/09) e
 * `g1-quedas--osoto-gari` esta na aula 15 (sem data). A precedencia devolvia a
 * aula 15 e "nao ensinado" — para uma tecnica dada naquela manha.
 *
 * O erro e de ordem: precedencia escolhe o caminho ANTES de saber qual deles
 * aconteceu. A escolha tem de vir depois.
 * ---------------------------------------------------------------------------
 *
 * ENTRE OS CAMINHOS: ganha o que JA FOI DADO; entre dois dados, o de data mais
 * antiga — o mesmo princIpio de `aulaDeCadaItem` ("a primeira aparicao ganha"),
 * porque o que decide "esta aprendendo" e a primeira vez que o aluno viu. Se
 * nenhum foi dado, ganha o de aula menor, que e quando ele VAI ser dado.
 *
 * FALTANDO UMA PARTE NO PROGRAMA o caminho por equivalencia nem existe: ele nao
 * pode se completar, e dizer "aula 4" quando falta a parte que nunca foi
 * programada prometeria uma conclusao que nao vem. `partes` continua preenchido,
 * e e o que separa "falta uma parte" de "nao esta no programa".
 */
export function programacaoDoRequisito({
  requisitoId,
  aulaDoItem,
  dataDaAula,
  limite,
  equivalentes,
}: {
  requisitoId: string
  /** Item -> primeira aula que o contem. Vem de `aulaDeCadaItem`. */
  aulaDoItem: ReadonlyMap<string, number>
  /** Aula -> `YYYY-MM-DD`, so as que tem data. */
  dataDaAula: ReadonlyMap<number, string>
  /** `YYYY-MM-DD` de hoje. Comparacao de TEXTO: a aula das 8h conta hoje. */
  limite: string
  /**
   * Os equivalentes de um requisito.
   *
   * PARAMETRO E NAO IMPORT: este modulo e do `application` e nao deve conhecer
   * o seed de um curriculo especifico — o mesmo motivo de `curriculoPorId` ser
   * funcao em `useLinhas`. No dia do 2o grau, entra outra tabela sem tocar aqui.
   */
  equivalentes: (id: string) => readonly string[]
}): ProgramacaoDoRequisito {
  const daAula = (n: number) => dataDaAula.get(n) ?? null
  const jaDada = (n: number) => {
    const d = dataDaAula.get(n)
    return d !== undefined && d <= limite
  }

  const caminhos: ProgramacaoDoRequisito[] = []

  // Caminho direto: o proprio id, uma parte so.
  const direta = aulaDoItem.get(requisitoId)
  if (direta !== undefined) {
    caminhos.push({
      aula: direta,
      data: daAula(direta),
      ensinado: jaDada(direta),
      partes: null,
    })
  }

  // Caminho por equivalencia: todas as partes.
  const nomesDasPartes = equivalentes(requisitoId)
  const aulasDasPartes = nomesDasPartes.map((id) => aulaDoItem.get(id))
  const partes =
    nomesDasPartes.length === 0
      ? null
      : {
          programadas: aulasDasPartes.filter((n) => n !== undefined).length,
          dadas: aulasDasPartes.filter((n) => n !== undefined && jaDada(n)).length,
          total: nomesDasPartes.length,
        }

  if (partes !== null) {
    if (aulasDasPartes.every((n) => n !== undefined)) {
      // A ULTIMA parte e a que completa: o requisito nao esta cumprido antes dela.
      const completa = Math.max(...(aulasDasPartes as number[]))
      caminhos.push({
        aula: completa,
        data: daAula(completa),
        ensinado: partes.dadas === partes.total,
        partes,
      })
    }
  }

  if (caminhos.length === 0) {
    // Nem o id proprio, nem um conjunto completo de equivalentes. `partes` ainda
    // diz se ele esta pela METADE, que e diferente de nao estar.
    return { aula: null, data: null, ensinado: false, partes }
  }

  /**
   * A ORDEM DA ESCOLHA, e cada nivel de desempate existe por um caso concreto:
   *
   *   1. ENSINADO primeiro. Foi o que faltava na primeira versao: o o soto gari
   *      dado na aula 1 (id de azul) perdia para a aula 15 sem data (id `g1-*`).
   *   2. Entre dois ensinados, a DATA mais antiga — "a primeira aparicao ganha",
   *      o mesmo principio de `aulaDeCadaItem`.
   *   3. Entre dois nao ensinados, a AULA menor: e quando ele vai ser dado.
   */
  caminhos.sort((a, b) => {
    if (a.ensinado !== b.ensinado) return a.ensinado ? -1 : 1
    if (a.ensinado && a.data !== null && b.data !== null) return a.data < b.data ? -1 : 1
    return (a.aula ?? Infinity) - (b.aula ?? Infinity)
  })
  return caminhos[0]
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
  equivalentes,
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
  /**
   * Os equivalentes de cada requisito em outro curriculo. Ver
   * `programacaoDoRequisito`.
   *
   * PADRAO "SEM EQUIVALENTE NENHUM" e nao a tabela do 1o grau: o padrao de um
   * modulo do `application` nao pode ser o seed de um curriculo especifico. Quem
   * monta a tela passa a tabela; os testes que nao tratam de equivalencia nao
   * precisam saber que ela existe.
   */
  equivalentes?: (id: string) => readonly string[]
}): Acompanhamento {
  const equivalentesDeItem = equivalentes ?? (() => [])
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
    /**
     * ENSINADO EXIGE DATA NO PASSADO, e nao apenas estar no programa.
     *
     * Um item programado na aula 20 sem data marcada nao foi ensinado — e sem
     * esta condicao ele apareceria como pendente desde o primeiro dia, e a fila
     * do professor nasceria com 29 linhas que ele nao pode resolver.
     *
     * Compara TEXTO `YYYY-MM-DD`: a aula das 8h conta como dada no proprio dia,
     * e nao a partir de amanha. O professor atesta depois da aula que acabou.
     *
     * A RESOLUCAO ESTA EM `programacaoDoRequisito` porque ela nao e mais um
     * `get` num mapa: a mesma tecnica tem id diferente em cada curriculo, e um
     * requisito pode ser satisfeito por varias partes.
     */
    const { aula, data, ensinado, partes } = programacaoDoRequisito({
      requisitoId: item.id,
      aulaDoItem,
      dataDaAula,
      limite,
      equivalentes: equivalentesDeItem,
    })
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
    const entrada: ItemNoAcompanhamento = { item, aula, data, ensinado, partes, celulas, pendentes }
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
