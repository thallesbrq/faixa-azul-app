/**
 * Competencia atestada — o professor confirmando que ESTE ALUNO executa.
 *
 * NAO E `validacoes`, E ESSA DISTINCAO E A RAZAO DE ESTE ARQUIVO EXISTIR.
 * `validado_pelo_professor` fala do TEXTO: o cabecalho de `validacao.ts` diz que
 * existe porque "70 dos 81 itens tem passo a passo redigido como sugestao padrao
 * de faixa azul, nao como o curriculo da academia". E o professor corrigindo a
 * DESCRICAO da tecnica.
 *
 * Aqui e o oposto: a descricao pode estar perfeita e o aluno nao executar. Sao
 * dois eixos que nao colapsam, pelo mesmo motivo que dominio e validacao nao
 * colapsam (ver application/progresso).
 *
 * REGISTRO APPEND-ONLY, e nao um estado por item. Evidencia de graduacao que
 * pode ser reescrita nao serve como evidencia (ADR-010) — se a academia
 * precisar mostrar por que alguem foi graduado, um campo booleano editavel nao
 * responde nada. Cada atestacao e uma linha nova; o estado atual e derivado da
 * mais recente de cada item.
 *
 * ISSO CORRIGE O ADR-016, que dizia `competencias/{aluno}/itens/{itemId}` — um
 * documento por item, ou seja um ESTADO. Com aquela forma, retirar um atestado
 * dado por engano exigiria sobrescrever, e o registro anterior desapareceria.
 *
 * RETIRAR TAMBEM E UM REGISTRO. `competente: false` e uma linha nova, nao a
 * remocao da anterior: o professor pode ter atestado numa aula e mudado de
 * opiniao na seguinte, e as duas coisas aconteceram.
 *
 * Modulo puro: sem React, sem I/O, `agora` sempre injetado.
 */

/** Onde o professor viu — a mesma distincao que `validacoes` usa. */
export type OrigemDaCompetencia = 'aula_particular' | 'aula_regular' | 'exame'

export interface RegistroDeCompetencia {
  id: string
  itemId: string
  /** `true` atesta; `false` retira. Nunca a ausencia da linha anterior. */
  competente: boolean
  /**
   * O que o professor disse, nas palavras dele. OBRIGATORIO.
   *
   * Mesma exigencia de `criarValidacao`, e pelo mesmo motivo: atestacao sem
   * justificativa nao e rastreavel. Numa graduacao isso importa mais ainda —
   * "atestei" sem dizer o que viu nao ajuda ninguem seis meses depois.
   */
  texto: string
  origem: OrigemDaCompetencia
  /** Quem atestou. Uma academia pode ter mais de um professor. */
  professorUid: string
  registradaEm: string
}

export function criarCompetencia(entrada: {
  id: string
  itemId: string
  competente: boolean
  texto: string
  origem: OrigemDaCompetencia
  professorUid: string
  agora: Date
}): RegistroDeCompetencia {
  const { agora, ...resto } = entrada

  if (!resto.texto.trim()) {
    throw new Error(
      'atestar competencia exige o texto do que o professor viu — ' +
        'atestacao sem justificativa nao serve como evidencia de graduacao',
    )
  }
  if (!resto.professorUid.trim()) {
    throw new Error('atestacao sem autor nao e rastreavel')
  }

  return { ...resto, registradaEm: agora.toISOString() }
}

/**
 * Estado atual de cada item: a atestacao MAIS RECENTE vence.
 *
 * Ordena por data e nao confia na ordem de chegada — os registros vem de uma
 * consulta ao Firestore, que nao promete ordem. Confiar na ordem faria o estado
 * depender de como o banco devolveu a pagina.
 *
 * Data invalida perde para data valida, pelo mesmo motivo de `maisRecente` em
 * procedencia: um relogio que devolve lixo nao pode vencer um valido.
 */
export function competenciaAtual(
  registros: readonly RegistroDeCompetencia[],
): Map<string, RegistroDeCompetencia> {
  const atual = new Map<string, RegistroDeCompetencia>()

  for (const r of registros) {
    const anterior = atual.get(r.itemId)
    if (!anterior) {
      atual.set(r.itemId, r)
      continue
    }
    const ta = Date.parse(r.registradaEm)
    const tb = Date.parse(anterior.registradaEm)
    const aValida = Number.isFinite(ta)
    const bValida = Number.isFinite(tb)

    if (aValida && !bValida) atual.set(r.itemId, r)
    else if (aValida && bValida && ta > tb) atual.set(r.itemId, r)
  }

  return atual
}

/** Itens hoje atestados. Retirados NAO contam, mesmo tendo sido atestados antes. */
export function itensCompetentes(registros: readonly RegistroDeCompetencia[]): Set<string> {
  const ids = new Set<string>()
  for (const [itemId, r] of competenciaAtual(registros)) {
    if (r.competente) ids.add(itemId)
  }
  return ids
}

/** Historico de um item, do mais antigo ao mais novo. */
export function historicoDoItem(
  itemId: string,
  registros: readonly RegistroDeCompetencia[],
): RegistroDeCompetencia[] {
  return registros
    .filter((r) => r.itemId === itemId)
    .sort((a, b) => Date.parse(a.registradaEm) - Date.parse(b.registradaEm))
}
