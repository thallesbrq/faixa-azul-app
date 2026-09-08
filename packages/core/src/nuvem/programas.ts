/**
 * O programa da turma na nuvem: `programas/{turma}/aulas/{numero}`.
 *
 * UM DOCUMENTO POR AULA, e nao um documento com as 81 dentro. O motivo e
 * concreto: dois professores editando a mesma turma gravariam o array inteiro, e
 * a ultima gravacao apagaria a aula que o outro acabou de montar — sem erro e sem
 * aviso. Com um documento por aula, editar a aula 4 e a aula 12 ao mesmo tempo
 * nao colide, porque sao escritas em documentos diferentes.
 *
 * A TURMA NO CAMINHO e nao dentro do documento, pelo mesmo motivo que o uid de
 * `competencias` (ADR-016): o Firestore nao consegue decidir uma regra de LISTA
 * a partir de um campo do corpo, entao uma colecao plana com `turma` dentro nao
 * poderia ser listada. E listar as aulas de uma turma e a operacao central desta
 * tela.
 *
 * LEITURA ABERTA A QUEM ESTA ATIVO NA ACADEMIA (ADR-017, decisao 3). O programa
 * nao contem dado pessoal — e curriculo. Foi o que dissolveu o pedido do Kainã
 * (ver o conteudo da aula da RGI para ministrar) sem inventar um papel de
 * monitor: ele ve o mesmo que todos veem, e continua sem ver o progresso de
 * ninguem.
 */

import type { FirebaseApp } from 'firebase/app'
import type { AulaDoPrograma, RotuloDaAula } from '../application/programa'

export interface Programas {
  /** Todas as aulas guardadas de uma turma. Aula nunca editada nao vem. */
  aulasDe(turma: string): Promise<AulaDoPrograma[]>
  /** Grava UMA aula. Sobrescreve o documento dela e nao toca nas outras. */
  gravarAula(turma: string, aula: AulaDoPrograma): Promise<void>
  /**
   * Grava varias aulas de uma vez — usado pelo "aplicar sugestao".
   *
   * EM LOTE, e nao num laco de `gravarAula`: aplicar a sugestao do 1o grau
   * escreve ~25 documentos, e um laco deixaria a turma pela metade se a rede
   * caisse no meio. O lote do Firestore e atomico.
   */
  gravarVarias(turma: string, aulas: readonly AulaDoPrograma[]): Promise<void>
}

/** Numero da aula como id de documento: dois digitos, para ordenar como texto. */
function idDaAula(numero: number): string {
  return String(numero).padStart(2, '0')
}

/**
 * Le um rotulo do documento com desconfianca de cada campo.
 *
 * O documento pode ter sido escrito por uma versao anterior ou editado a mao no
 * console. Campo faltando vira string vazia em vez de `undefined`, porque
 * `descreverRotulo` monta texto e `undefined` apareceria como "undefined" na
 * tela do professor.
 */
function comoRotulo(x: unknown): RotuloDaAula | null {
  if (typeof x !== 'object' || x === null) return null
  const o = x as Record<string, unknown>
  const nome = typeof o.nome === 'string' ? o.nome : ''
  // Rotulo sem nome nao tem o que mostrar: era so o que o professor ia escrever.
  if (nome.trim() === '') return null
  return {
    id: typeof o.id === 'string' && o.id !== '' ? o.id : `r-${nome}`,
    posicao: typeof o.posicao === 'string' ? o.posicao : '',
    tipo: typeof o.tipo === 'string' ? o.tipo : 'avulsa',
    nome,
  }
}

export async function abrirProgramas(app: FirebaseApp): Promise<Programas> {
  const fs = await import('firebase/firestore')
  const db = fs.getFirestore(app)

  const colecao = (turma: string) => fs.collection(db, 'programas', turma, 'aulas')

  return {
    async aulasDe(turma) {
      const q = await fs.getDocs(colecao(turma))
      return q.docs.map((d) => {
        const x = d.data()
        return {
          // O NUMERO VEM DO CAMPO, com o id do documento como reserva: se algum
          // dia o id mudar de formato, o dado continua legivel.
          numero: typeof x.numero === 'number' ? x.numero : Number(d.id),
          itemIds: Array.isArray(x.itemIds) ? x.itemIds.filter((i): i is string => typeof i === 'string') : [],
          rotulos: Array.isArray(x.rotulos)
            ? x.rotulos.map(comoRotulo).filter((r): r is RotuloDaAula => r !== null)
            : [],
          foco: typeof x.foco === 'string' ? x.foco : '',
          // Aula gravada antes deste campo nao tem a chave: `''` e o que ela de
          // fato e — sem data.
          slot: typeof x.slot === 'string' ? x.slot : '',
        } satisfies AulaDoPrograma
      })
    },

    async gravarAula(turma, aula) {
      await fs.setDoc(fs.doc(colecao(turma), idDaAula(aula.numero)), {
        numero: aula.numero,
        itemIds: aula.itemIds,
        rotulos: aula.rotulos,
        foco: aula.foco,
        slot: aula.slot,
        alteradoEm: new Date().toISOString(),
      })
    },

    async gravarVarias(turma, aulas) {
      const lote = fs.writeBatch(db)
      for (const aula of aulas) {
        lote.set(fs.doc(colecao(turma), idDaAula(aula.numero)), {
          numero: aula.numero,
          itemIds: aula.itemIds,
          rotulos: aula.rotulos,
          foco: aula.foco,
          slot: aula.slot,
          alteradoEm: new Date().toISOString(),
        })
      }
      await lote.commit()
    },
  }
}
