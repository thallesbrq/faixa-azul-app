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
   * A PROCEDENCIA da atestacao. OBRIGATORIO — e nao mais uma justificativa.
   *
   * ---------------------------------------------------------------------------
   * A EXIGENCIA CONTINUA, O QUE ELA GUARDA MUDOU, E O DADO REAL DECIDIU ISSO.
   *
   * Este campo nasceu como "o que o professor viu, nas palavras dele", com o
   * argumento de que atestacao sem justificativa nao e rastreavel. Das seis
   * primeiras atestacoes feitas em producao, CINCO tinham o texto `"ok"` e uma
   * tinha `"guarda fechada"`.
   *
   * Ou seja: o campo obrigatorio nao produziu justificativa. Produziu atrito e a
   * palavra "ok" — e atrito num gesto que se repete 29 vezes por aluno nao gera
   * texto melhor, gera registro que nao acontece. E registro que nao acontece e
   * pior que registro sem prosa.
   *
   * O QUE DE FATO RASTREIA e o que sempre esteve aqui do lado: `professorUid`
   * (quem), `registradaEm` (quando), `itemId` (o que) e `origem` (em que
   * contexto). Nada disso depende de digitacao.
   *
   * Entao o campo passa a guardar PROCEDENCIA gerada pelo app —
   * `"Aula 5 · RGI · 22/09/2026"` — que e mais rastreavel do que `"ok"` e custa
   * zero clique. A regra do Firestore continua exigindo texto nao vazio: ela
   * impede registro anonimo, e isso nunca foi o problema.
   *
   * O professor AINDA pode escrever quando quiser (um item que ele quer comentar,
   * uma retirada de atestado que precisa explicacao). O que saiu foi a
   * obrigacao de digitar para o caso comum.
   * ---------------------------------------------------------------------------
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
    /**
     * A GUARDA FICA, e o que ela impede mudou de nome: registro sem procedencia.
     *
     * Quem chama deve passar `procedenciaDaAtestacao(...)` quando o professor nao
     * escrever nada — nao string vazia. Um registro sem nenhum texto no log
     * append-only e uma linha que ninguem sabe ler seis meses depois.
     */
    throw new Error(
      'atestar competencia exige procedencia — use `procedenciaDaAtestacao` ' +
        'quando o professor nao escrever nada',
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

/**
 * O texto de procedencia que o app escreve quando o professor so clica.
 *
 * SUBSTITUI A DIGITACAO, e nao a rastreabilidade. Ver o comentario de `texto` em
 * `RegistroDeCompetencia`: o campo livre obrigatorio produziu `"ok"` cinco vezes
 * em seis no uso real. Isto produz `"Aula 5 · RGI · 22/09/2026"`, que responde
 * onde e quando o professor viu — que e a pergunta que a justificativa deveria
 * responder e nao respondia.
 *
 * SEM AULA E UM CASO REAL: o professor pode atestar fora de aula (revendo a
 * turma, ou num exame). Ai o texto diz so a data, e nao inventa uma aula.
 */
export function procedenciaDaAtestacao(entrada: {
  turma: string
  /** Numero da aula, quando a atestacao sai de uma aula do programa. */
  aula?: number | null
  /** `YYYY-MM-DD` da aula, quando ha. */
  data?: string | null
  agora: Date
}): string {
  const partes: string[] = []
  if (entrada.aula !== null && entrada.aula !== undefined) partes.push(`Aula ${entrada.aula}`)
  if (entrada.turma.trim() !== '') partes.push(entrada.turma)

  const quando = entrada.data ?? null
  if (quando) {
    // Monta a data a partir do TEXTO `YYYY-MM-DD`, sem passar por `Date`: o
    // caminho por `Date` reintroduz o risco de fuso que `application/agenda`
    // existe para evitar.
    const [ano, mes, dia] = quando.split('-')
    partes.push(`${dia}/${mes}/${ano}`)
  } else {
    partes.push(
      new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
        entrada.agora,
      ),
    )
  }

  return partes.join(' · ')
}
