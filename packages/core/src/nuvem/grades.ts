/**
 * A grade das 10 aulas — o unico caminho do professor para o aluno.
 *
 * POR QUE UMA COLECAO PROPRIA, e nao escrever no estado do aluno: as regras
 * negam ao professor escrever `estados/{uid}`, e essa negacao e o que dispensa
 * merge entre dois escritores no mesmo documento. Aqui cada lado escreve o SEU
 * documento, e a juncao acontece no cliente do aluno (`mesclarGrade`), com dono
 * por campo.
 *
 * UM DOCUMENTO POR AULA, e nao um blob com as dez. Tres razoes, e a terceira e
 * a que decidiu:
 * 1. o professor mexe numa aula por vez, e mandar as dez a cada arrasto
 *    escreveria dez vezes mais;
 * 2. `firestore.rules` ja estava escrito assim — `grades/{alunoUid}/aulas/{numero}`
 *    — com assercoes;
 * 3. AULA NAO MONTADA E DIFERENTE DE AULA VAZIA. Documento ausente = o professor
 *    nao chegou nela; documento com `itemIds: []` = ele tirou tudo dela. Com um
 *    blob unico, essa distincao dependeria de gravar `undefined`, que o Firestore
 *    nao guarda.
 *
 * AS MARCAS VAO NO DOCUMENTO. Sem `marcas.itemIds`, `mesclarCampos` ignora o
 * campo recebido — a grade chegaria e nao seria aplicada, em silencio. E o
 * `alteradoPor: 'professor'` e o que faz a grade dele vencer o valor local, sem
 * depender de relogios sincronizados.
 */

import type { FirebaseApp } from 'firebase/app'
import type { AlteracaoAula } from '../persistence/repositorio'
import { marcar } from '../domain/procedencia'
import type { Marca } from '../domain/procedencia'

/** O que o professor grava numa aula. `realizadaEm` nao esta aqui: e do aluno. */
export interface AulaDaGrade {
  numero: number
  /** `[]` e valido e significa "esvaziei esta aula". */
  itemIds: string[]
  notas?: string
}

export interface Grades {
  /** As aulas que o professor montou para este aluno. Vazio = nenhuma. */
  lerGrade(alunoUid: string): Promise<AlteracaoAula[]>
  /** Grava UMA aula, com a marca do professor. */
  gravarAula(alunoUid: string, aula: AulaDaGrade, agora: Date): Promise<void>
}

export async function abrirGrades(app: FirebaseApp): Promise<Grades> {
  const fs = await import('firebase/firestore')
  const db = fs.getFirestore(app)

  const colecao = (alunoUid: string) => fs.collection(db, 'grades', alunoUid, 'aulas')

  return {
    async lerGrade(alunoUid) {
      const q = await fs.getDocs(colecao(alunoUid))
      return q.docs.map((d) => {
        const x = d.data()
        const marca = x.marcaItemIds as Marca | undefined
        const marcaNotas = x.marcaNotas as Marca | undefined
        return {
          // O id do documento e a fonte do numero: o campo poderia divergir dele.
          numero: Number(d.id),
          itemIds: Array.isArray(x.itemIds) ? (x.itemIds as string[]) : undefined,
          notas: typeof x.notas === 'string' ? x.notas : undefined,
          marcas: {
            ...(marca ? { itemIds: marca } : {}),
            ...(marcaNotas ? { notas: marcaNotas } : {}),
          },
        } satisfies AlteracaoAula
      })
    },

    /**
     * EM TRANSACAO, e nao um `setDoc` solto — por causa do `versao` da marca.
     *
     * `marcar` incrementa `versao` a partir da marca ANTERIOR, e `versao` e o
     * desempate de `maisRecente` quando os relogios empatam. Gravar sempre
     * `versao: 1` faria duas escritas do professor no mesmo segundo caírem no
     * ultimo critério (`alteradoPor`, identico) e voltarem ao "empate devolve o
     * primeiro" — exatamente a dependencia de ordem que o comentario de
     * `maisRecente` diz ter quase passado.
     *
     * A transacao existe porque ler-modificar-escrever solto tem corrida: entre
     * o `getDoc` e o `setDoc` cabe outra escrita, e as duas sairiam com o mesmo
     * `versao`. Hoje ha um professor so, mas a regra ja preve outros.
     */
    async gravarAula(alunoUid, aula, agora) {
      const ref = fs.doc(db, 'grades', alunoUid, 'aulas', String(aula.numero))
      await fs.runTransaction(db, async (tx) => {
        const atual = await tx.get(ref)
        const anterior = atual.exists() ? (atual.data().marcaItemIds as Marca | undefined) : undefined
        const marca = marcar('professor', agora, anterior)

        // As marcas ficam em campos PROPRIOS e nao dentro de um mapa `marcas`:
        // assim o documento na nuvem tem a forma que ele precisa ter, e a
        // traducao para `AlteracaoAula` acontece na leitura, num lugar so.
        tx.set(ref, {
          numero: aula.numero,
          itemIds: aula.itemIds,
          marcaItemIds: marca,
          ...(aula.notas !== undefined ? { notas: aula.notas, marcaNotas: marca } : {}),
          atualizadoEm: agora.toISOString(),
        })
      })
    },
  }
}
