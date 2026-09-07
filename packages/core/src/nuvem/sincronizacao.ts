/**
 * Sincronizacao do estado do aluno com a nuvem.
 *
 * BLOB INTEIRO COM CONTROLE DE VERSAO, e o motivo de nao ser incremental esta
 * medido: o estado completo de um aluno com tres meses de uso da ~160 KB, e a
 * sincronizacao acontece poucas vezes por dia — nao a cada cartao respondido.
 * Enviar tudo e simples de acertar; enviar so o que mudou exigiria controlar o
 * que ja subiu, e cada parte movel a mais e um jeito novo de perder dado.
 *
 * O CONFLITO E RESOLVIDO PELO CODIGO QUE A POC JA VALIDOU. Se o servidor estiver
 * numa versao mais nova que a base do cliente (o mesmo aluno escreveu de outro
 * aparelho), a escrita e RECUSADA. O cliente baixa, chama `mesclarEstados`, e
 * reenvia com a base nova. Nada do que foi construido para a troca por arquivo
 * se perde: ele passa a resolver aluno-com-dois-aparelhos.
 *
 * POR QUE TRANSACAO E NAO "ler, comparar, escrever": entre a leitura e a
 * escrita cabe a escrita do outro aparelho. A transacao do Firestore refaz a
 * operacao se o documento mudou no meio, e e o que torna o controle de versao
 * confiavel em vez de provavel.
 *
 * O RESUMO E ESCRITO PELO PROPRIO ALUNO, junto com o estado. As regras nao
 * deixam o professor escrever no estado, e nao ha servidor nosso para calcular
 * — entao quem tem o dado calcula. E derivado, recalculado a cada sincronizacao,
 * nunca editado a mao.
 */

import type { FirebaseApp } from 'firebase/app'
import type { EstadoPersistido } from '../persistence/repositorio'
import type { ResumoDoAluno } from '../domain/resumo'

/** O que o servidor tem hoje. */
export interface EstadoRemoto {
  estado: EstadoPersistido
  versao: number
}

export type ResultadoDoEnvio =
  | { ok: true; versao: number }
  /**
   * Alguem escreveu antes. Vem com o que o servidor tem, para o chamador
   * mesclar e tentar de novo — em vez de perguntar de novo e correr o risco de
   * pegar um terceiro estado.
   */
  | { ok: false; conflito: EstadoRemoto }

export interface Sincronizador {
  puxar(uid: string): Promise<EstadoRemoto | null>
  /** `versaoBase` e a versao em que este cliente acredita estar. */
  empurrar(
    uid: string,
    estado: EstadoPersistido,
    versaoBase: number,
  ): Promise<ResultadoDoEnvio>
  gravarResumo(uid: string, resumo: ResumoDoAluno): Promise<void>
}

export async function abrirSincronizador(app: FirebaseApp): Promise<Sincronizador> {
  const fs = await import('firebase/firestore')
  const db = fs.getFirestore(app)

  const ref = (uid: string) => fs.doc(db, 'estados', uid)

  return {
    async puxar(uid) {
      const s = await fs.getDoc(ref(uid))
      if (!s.exists()) return null
      const d = s.data()
      return {
        estado: d.dados as EstadoPersistido,
        versao: typeof d.versao === 'number' ? d.versao : 0,
      }
    },

    async empurrar(uid, estado, versaoBase) {
      let conflito: EstadoRemoto | null = null
      let novaVersao = versaoBase + 1

      await fs.runTransaction(db, async (tx) => {
        const atual = await tx.get(ref(uid))
        const versaoNoServidor = atual.exists()
          ? ((atual.data().versao as number | undefined) ?? 0)
          : 0

        // O servidor andou desde a nossa base: nao sobrescreve.
        if (versaoNoServidor !== versaoBase) {
          conflito = {
            estado: atual.data()?.dados as EstadoPersistido,
            versao: versaoNoServidor,
          }
          return
        }

        novaVersao = versaoBase + 1
        tx.set(ref(uid), {
          dados: estado,
          versao: novaVersao,
          atualizadoEm: new Date().toISOString(),
        })
      })

      if (conflito) return { ok: false, conflito }
      return { ok: true, versao: novaVersao }
    },

    async gravarResumo(uid, resumo) {
      await fs.setDoc(fs.doc(db, 'resumos', uid), {
        ...resumo,
        sincronizadoEm: new Date().toISOString(),
      })
    },
  }
}

// ---------------------------------------------------------------------------
// A decisao de quando sincronizar — pura, testavel sem rede
// ---------------------------------------------------------------------------

/**
 * Intervalo entre tentativas automaticas.
 *
 * Cinco minutos porque uma sessao de estudo produz uns vinte eventos: mandar a
 * cada resposta seriam vinte envios de 160 KB, em dados moveis, com o aluno na
 * academia. Juntar e mandar de vez custa um atraso que ninguem percebe.
 */
export const INTERVALO_MS = 5 * 60 * 1000

export type Gatilho = 'abertura' | 'periodico' | 'saida' | 'manual'

/**
 * Vale tentar sincronizar agora?
 *
 * `abertura` e `manual` tentam sempre — a primeira porque pode haver coisa nova
 * no servidor mesmo sem nada local pendente, e a segunda porque a pessoa pediu.
 * Os outros dois so valem se houver algo para mandar.
 */
export function deveSincronizar({
  gatilho,
  sujo,
  online,
  sincronizando,
}: {
  gatilho: Gatilho
  sujo: boolean
  online: boolean
  sincronizando: boolean
}): boolean {
  // Sem rede nao ha o que tentar, e insistir gasta bateria para nada.
  if (!online) return false
  // Uma sincronizacao por vez: duas em paralelo produziriam conflito consigo
  // mesmas, e a segunda partiria de uma base que a primeira ja mudou.
  if (sincronizando) return false
  if (gatilho === 'abertura' || gatilho === 'manual') return true
  return sujo
}
