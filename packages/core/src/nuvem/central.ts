/**
 * Leitura dos estados dos alunos, para a central calcular.
 *
 * UM `getDoc` POR ALUNO, E NAO UMA CONSULTA NA COLECAO. Parece desperdicio e nao
 * e: as regras autorizam `estados/{uid}` com `mesmaAcademiaQue(uid)`, que faz um
 * `get()` em `pessoas`. O Firestore NAO consegue avaliar uma regra assim contra
 * uma consulta de colecao — ele exige que a regra seja decidivel sem olhar cada
 * documento, e recusaria o `list` inteiro. Ler um por um e o que as regras
 * permitem, e o custo e real mas pequeno: uma leitura por aluno, so quando a
 * central abre.
 *
 * A CENTRAL BAIXA O ESTADO INTEIRO E CALCULA COM O CORE (ADR-015). A alternativa
 * era engordar `resumos` com percentuais — e ai cada cartao novo so apareceria
 * depois que TODO aluno abrisse o app de novo, deixando buraco na tela por
 * semanas. Aqui o dado e o mesmo que o aluno tem, e qualquer numero novo e uma
 * funcao nova, nao uma migracao.
 *
 * FALHA PARCIAL NAO E AUSENCIA. Se a leitura de um aluno falhar, ele NAO entra
 * como "nunca sincronizou": isso seria transformar um erro em fato. As falhas
 * voltam separadas, para a tela poder dizer "nao consegui ler 2 alunos" em vez
 * de mostrar dois zeros convincentes.
 */

import type { FirebaseApp } from 'firebase/app'
import type { EstadoPersistido } from '../persistence/repositorio'

export interface EstadosDosAlunos {
  /** Estado de quem tem. Ausente do mapa = nunca sincronizou. */
  porUid: Map<string, EstadoPersistido>
  /** Quem nao pudemos ler, com o motivo. Diferente de nao ter dado. */
  falhas: { uid: string; motivo: string }[]
}

export interface DadosDaCentral {
  estadosDe(uids: readonly string[]): Promise<EstadosDosAlunos>
}

export async function abrirCentral(app: FirebaseApp): Promise<DadosDaCentral> {
  const fs = await import('firebase/firestore')
  const db = fs.getFirestore(app)

  return {
    async estadosDe(uids) {
      const resultados = await Promise.allSettled(
        uids.map(async (uid) => {
          const s = await fs.getDoc(fs.doc(db, 'estados', uid))
          return { uid, dados: s.exists() ? (s.data().dados as EstadoPersistido) : null }
        }),
      )

      const porUid = new Map<string, EstadoPersistido>()
      const falhas: { uid: string; motivo: string }[] = []

      resultados.forEach((r, i) => {
        if (r.status === 'rejected') {
          falhas.push({
            uid: uids[i],
            motivo: (r.reason as Error)?.message ?? 'erro desconhecido',
          })
          return
        }
        // `dados` nulo quando o documento nao existe: o aluno entrou e nunca
        // sincronizou. Nao e falha, e ausencia — e a central diz isso na linha.
        if (r.value.dados) porUid.set(r.value.uid, r.value.dados)
      })

      return { porUid, falhas }
    },
  }
}
