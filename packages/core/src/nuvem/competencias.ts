/**
 * Competencias atestadas e graduacoes concedidas.
 *
 * DUAS COLECOES, AS DUAS APPEND-ONLY:
 *
 *   competencias/{alunoUid}/registros/{id}   o professor atesta um item
 *   graduacoes/{alunoUid}/registros/{id}     o professor concede a graduacao
 *
 * SUBCOLECAO E NAO COLECAO PLANA, e a razao e das REGRAS e nao de gosto: para
 * listar as competencias de um aluno, a regra precisa ser decidivel sem abrir
 * cada documento. Com `competencias/{id}` plana e `alunoUid` DENTRO do
 * documento, a regra so poderia ser avaliada por documento — e o Firestore
 * recusaria a consulta de colecao inteira. Com o uid no CAMINHO, a mesma regra
 * autoriza a lista. E o mesmo desenho de `grades/{alunoUid}/aulas/{numero}`.
 *
 * APPEND-ONLY, com `allow update, delete: if false`. Evidencia de graduacao que
 * pode ser reescrita nao serve como evidencia (ADR-010). Retirar um atestado e
 * um registro NOVO com `competente: false` — nao a remocao do anterior, porque
 * o professor pode ter atestado numa aula e mudado de opiniao na seguinte, e as
 * duas coisas aconteceram.
 *
 * NADA DE TRANSACAO AQUI, ao contrario de `grades`. La a transacao existia por
 * causa do `versao` da marca, que depende do valor anterior. Aqui cada registro
 * e independente e imutavel: duas escritas simultaneas produzem duas linhas, que
 * e exatamente o que um log deve fazer.
 */

import type { FirebaseApp } from 'firebase/app'
import type { OrigemDaCompetencia, RegistroDeCompetencia } from '../domain/competencia'
import { criarCompetencia } from '../domain/competencia'

/** Uma graduacao concedida. O ato do professor, nao um calculo do app. */
export interface RegistroDeGraduacao {
  id: string
  /** A meta concedida: '1grau', '2grau', ... */
  meta: string
  /** O que o professor disse ao conceder. */
  texto: string
  professorUid: string
  /**
   * Quantas aulas ele CONFIRMOU no ato.
   *
   * `null` quando o sistema nao contava aulas ainda (antes da fatia 3 do
   * ADR-016) — e nao zero: o professor conferiu de cabeca, e o registro diz que
   * o numero nao veio do sistema.
   */
  aulasConfirmadas: number | null
  concedidaEm: string
}

export interface Competencias {
  /** Todos os registros de um aluno. O estado atual e derivado deles. */
  registrosDe(alunoUid: string): Promise<RegistroDeCompetencia[]>
  /** Atesta (ou retira) um item. Lanca se faltar texto ou autor. */
  atestar(
    alunoUid: string,
    entrada: {
      itemId: string
      competente: boolean
      texto: string
      origem: OrigemDaCompetencia
      professorUid: string
    },
    agora: Date,
  ): Promise<void>
  /**
   * Atesta VARIOS pares (aluno, item) de uma vez — o "atestar a area inteira".
   *
   * EM LOTE E NAO NUM LACO DE `atestar`: atestar um grupo pode ser 15 escritas,
   * e um laco deixaria metade gravada se a rede caisse no meio. Pior que isso: o
   * log e append-only, entao a metade que passou NAO SAI. O professor ficaria com
   * um grupo parcialmente atestado e sem como distinguir isso de escolha dele.
   *
   * O lote do Firestore aceita ate 500 escritas; 29 itens x 20 alunos = 580, e
   * por isso `atestarEmLote` FATIA. A fatia quebra a atomicidade, e essa e a
   * troca: com uma turma real (4 alunos, 29 itens = 116) uma fatia basta e o
   * lote e atomico de verdade.
   */
  atestarEmLote(
    pares: readonly { alunoUid: string; itemId: string }[],
    entrada: {
      competente: boolean
      texto: string
      origem: OrigemDaCompetencia
      professorUid: string
    },
    agora: Date,
  ): Promise<void>
  /** Graduacoes ja concedidas a este aluno. */
  graduacoesDe(alunoUid: string): Promise<RegistroDeGraduacao[]>
  conceder(
    alunoUid: string,
    entrada: {
      meta: string
      texto: string
      professorUid: string
      aulasConfirmadas: number | null
    },
    agora: Date,
  ): Promise<void>
}

export async function abrirCompetencias(app: FirebaseApp): Promise<Competencias> {
  const fs = await import('firebase/firestore')
  const db = fs.getFirestore(app)

  const dosRegistros = (alunoUid: string) =>
    fs.collection(db, 'competencias', alunoUid, 'registros')
  const dasGraduacoes = (alunoUid: string) =>
    fs.collection(db, 'graduacoes', alunoUid, 'registros')

  return {
    async registrosDe(alunoUid) {
      const q = await fs.getDocs(dosRegistros(alunoUid))
      return q.docs.map((d) => {
        const x = d.data()
        return {
          id: d.id,
          itemId: typeof x.itemId === 'string' ? x.itemId : '',
          // `=== true` e nao truthy: um campo ausente num documento antigo
          // nunca deve virar "atestado".
          competente: x.competente === true,
          texto: typeof x.texto === 'string' ? x.texto : '',
          origem: (x.origem as OrigemDaCompetencia) ?? 'aula_regular',
          professorUid: typeof x.professorUid === 'string' ? x.professorUid : '',
          registradaEm: typeof x.registradaEm === 'string' ? x.registradaEm : '',
        } satisfies RegistroDeCompetencia
      })
    },

    async atestar(alunoUid, entrada, agora) {
      // A VALIDACAO E DO DOMINIO, e roda ANTES de tocar a rede: `criarCompetencia`
      // exige texto e autor. Validar aqui de novo daria duas regras para
      // divergir; nao validar deixaria passar registro sem justificativa, que e
      // exatamente o que nao serve como evidencia.
      const registro = criarCompetencia({ id: 'gerado-pelo-firestore', ...entrada, agora })
      const { id: _ignorado, ...campos } = registro
      await fs.addDoc(dosRegistros(alunoUid), campos)
    },

    async atestarEmLote(pares, entrada, agora) {
      if (pares.length === 0) return

      /**
       * O LIMITE DO LOTE E 500 ESCRITAS. Fatiar em 400 deixa margem e mantem a
       * conta longe da borda — um lote recusado por estar em 501 falharia
       * inteiro, e a mensagem do Firestore nao diz que foi o tamanho.
       */
      const POR_LOTE = 400

      for (let inicio = 0; inicio < pares.length; inicio += POR_LOTE) {
        const fatia = pares.slice(inicio, inicio + POR_LOTE)
        const lote = fs.writeBatch(db)
        for (const par of fatia) {
          // A VALIDACAO DO DOMINIO RODA POR PAR, antes de qualquer escrita: se um
          // par for invalido, nada e gravado. Validar depois de montar o lote
          // deixaria a decisao para o servidor, que recusaria o lote inteiro com
          // uma mensagem de permissao.
          const registro = criarCompetencia({
            id: 'gerado-pelo-firestore',
            itemId: par.itemId,
            ...entrada,
            agora,
          })
          const { id: _ignorado, ...campos } = registro
          lote.set(fs.doc(dosRegistros(par.alunoUid)), campos)
        }
        await lote.commit()
      }
    },

    async graduacoesDe(alunoUid) {
      const q = await fs.getDocs(dasGraduacoes(alunoUid))
      return q.docs.map((d) => {
        const x = d.data()
        return {
          id: d.id,
          meta: typeof x.meta === 'string' ? x.meta : '',
          texto: typeof x.texto === 'string' ? x.texto : '',
          professorUid: typeof x.professorUid === 'string' ? x.professorUid : '',
          aulasConfirmadas:
            typeof x.aulasConfirmadas === 'number' ? x.aulasConfirmadas : null,
          concedidaEm: typeof x.concedidaEm === 'string' ? x.concedidaEm : '',
        } satisfies RegistroDeGraduacao
      })
    },

    async conceder(alunoUid, entrada, agora) {
      if (!entrada.texto.trim()) {
        throw new Error('conceder graduacao exige o texto do professor')
      }
      await fs.addDoc(dasGraduacoes(alunoUid), {
        ...entrada,
        concedidaEm: agora.toISOString(),
      })
    },
  }
}
