/**
 * Orquestra a sincronizacao do estado do aluno.
 *
 * O CICLO, e o passo 3 e o que reaproveita tudo que a POC construiu:
 *
 *   1. entrou?              -> puxa o que o servidor tem
 *   2. juntou local+remoto  -> `mesclarEstados` (codigo da POC)
 *   3. empurra com a versao base
 *   4. recusado (409)?      -> baixa, mescla de novo, tenta outra vez
 *   5. gravou?              -> grava o resumo, que e o que a central le
 *
 * A VERSAO REMOTA MORA FORA DO ESTADO, numa chave propria. Ela e metadado de
 * sincronizacao, nao dado do aluno: guardar dentro do blob faria com que
 * mesclar dois estados tivesse que decidir qual "versao do servidor" e a certa
 * — uma pergunta sem resposta, porque a versao e do servidor e nao dos estados.
 *
 * TENTATIVAS LIMITADAS. Se o conflito repetir tres vezes, para e avisa. Sem
 * limite, dois aparelhos escrevendo ao mesmo tempo entrariam em laco: cada um
 * mescla, envia, e e recusado pelo outro, para sempre.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { APP_ALUNO } from '@faixa-azul/core/chaves'
import { CONFIG_ALUNO } from '@faixa-azul/core/nuvem/config'
import { conectar } from '@faixa-azul/core/nuvem/cliente'
import type { Nuvem } from '@faixa-azul/core/nuvem/cliente'
import { abrirSincronizador, INTERVALO_MS, deveSincronizar } from '@faixa-azul/core/nuvem/sincronizacao'
import type { Gatilho, Sincronizador } from '@faixa-azul/core/nuvem/sincronizacao'
import { mesclarEstados } from '@faixa-azul/core/application/juncao'
import { resumoDoAluno } from '@faixa-azul/core/application/torre'
import type { EstadoPersistido } from '@faixa-azul/core/persistence/repositorio'
import type { DepositoSimples } from '@faixa-azul/core/nuvem/autenticacao'

/** Versao remota conhecida, por aluno — metadado, nao dado. */
const chaveDaVersao = (uid: string) => `faixa_azul_versao_remota__${uid}`

/** Quantas vezes tentar antes de desistir de um conflito. */
const MAX_TENTATIVAS = 3

export type EstadoDaSincronizacao =
  | { fase: 'desligada' }
  | { fase: 'ociosa'; ultimaEm: string | null; pendente: boolean }
  | { fase: 'sincronizando' }
  | { fase: 'erro'; mensagem: string; ultimaEm: string | null }

export function useSincronizacao({
  uid,
  ativo,
  deposito,
  estadoLocal,
  aoReceber,
}: {
  /** `null` enquanto ninguem entrou: sem conta nao ha o que sincronizar. */
  uid: string | null
  /** Cadastro ativo. Aluno desativado nao consegue escrever (as regras negam). */
  ativo: boolean
  deposito: DepositoSimples
  /** Sempre o estado local mais recente, numa funcao para nao capturar antigo. */
  estadoLocal: () => EstadoPersistido
  /** Chamado quando a juncao muda o estado — quem manda aplicar e o dono dele. */
  aoReceber: (estado: EstadoPersistido) => void
}) {
  const [estado, setEstado] = useState<EstadoDaSincronizacao>({ fase: 'desligada' })
  const sinc = useRef<Sincronizador | null>(null)
  const nuvem = useRef<Nuvem | null>(null)
  const sujo = useRef(false)
  const emAndamento = useRef(false)
  const ultimaEm = useRef<string | null>(null)

  const marcarSujo = useCallback(() => {
    sujo.current = true
  }, [])

  const obter = useCallback(async (): Promise<Sincronizador> => {
    if (!nuvem.current) nuvem.current = await conectar(CONFIG_ALUNO, APP_ALUNO)
    if (!sinc.current) sinc.current = await abrirSincronizador(nuvem.current.app)
    return sinc.current
  }, [])

  const sincronizar = useCallback(
    async (gatilho: Gatilho) => {
      if (!uid || !ativo) return
      if (
        !deveSincronizar({
          gatilho,
          sujo: sujo.current,
          online: navigator.onLine,
          sincronizando: emAndamento.current,
        })
      ) {
        return
      }

      emAndamento.current = true
      setEstado({ fase: 'sincronizando' })
      try {
        const s = await obter()
        const chave = chaveDaVersao(uid)
        let base = Number(deposito.ler(chave) ?? '0')
        if (!Number.isFinite(base)) base = 0

        // Junta o que veio antes de mandar: o servidor pode ter a grade que o
        // professor montou, e enviar sem juntar a apagaria.
        let local = estadoLocal()
        const remoto = await s.puxar(uid)
        if (remoto) {
          const j = mesclarEstados({ local, recebido: remoto.estado })
          if (j.mudou) {
            aoReceber(j.estado)
            local = j.estado
          }
          base = remoto.versao
        }

        let tentativa = 0
        for (;;) {
          const r = await s.empurrar(uid, local, base)
          if (r.ok) {
            deposito.escrever(chave, String(r.versao))
            sujo.current = false
            break
          }

          tentativa += 1
          if (tentativa >= MAX_TENTATIVAS) {
            throw new Error(
              'Outro aparelho está gravando ao mesmo tempo. Tentaremos de novo em alguns minutos.',
            )
          }
          // Recusado: alguem escreveu antes. Junta com o que ele tem e repete.
          const j = mesclarEstados({ local, recebido: r.conflito.estado })
          local = j.estado
          if (j.mudou) aoReceber(j.estado)
          base = r.conflito.versao
        }

        // O resumo e o que a central le. Escrito pelo proprio aluno, porque as
        // regras nao deixam o professor escrever no estado e nao ha servidor
        // nosso para calcular.
        const agora = new Date()
        await s.gravarResumo(
          uid,
          resumoDoAluno(local, {
            importadoEm: agora.toISOString(),
            exportadoEm: agora.toISOString(),
            agora,
          }),
        )

        ultimaEm.current = new Date().toISOString()
        setEstado({ fase: 'ociosa', ultimaEm: ultimaEm.current, pendente: false })
      } catch (e) {
        setEstado({
          fase: 'erro',
          mensagem: (e as Error)?.message ?? 'Não foi possível sincronizar agora.',
          ultimaEm: ultimaEm.current,
        })
      } finally {
        emAndamento.current = false
      }
    },
    [uid, ativo, deposito, estadoLocal, aoReceber, obter],
  )

  // Numa ref para os ouvintes registrados uma vez nao congelarem a versao do
  // render em que foram criados.
  const sincronizarRef = useRef(sincronizar)
  useEffect(() => {
    sincronizarRef.current = sincronizar
  }, [sincronizar])

  // Ao entrar: puxa o que houver.
  useEffect(() => {
    if (uid && ativo) void sincronizarRef.current('abertura')
    else if (!uid) setEstado({ fase: 'desligada' })
  }, [uid, ativo])

  // Periodico e na saida.
  useEffect(() => {
    if (!uid || !ativo) return
    const t = window.setInterval(() => void sincronizarRef.current('periodico'), INTERVALO_MS)

    // `visibilitychange` e nao `beforeunload`: em celular o app raramente e
    // "fechado", ele e escondido — e `beforeunload` nao dispara de forma
    // confiavel em iOS.
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden') void sincronizarRef.current('saida')
    }
    document.addEventListener('visibilitychange', aoEsconder)

    // Voltou a ter rede: tenta o que ficou pendente.
    const aoVoltarRede = () => void sincronizarRef.current('periodico')
    window.addEventListener('online', aoVoltarRede)

    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', aoEsconder)
      window.removeEventListener('online', aoVoltarRede)
    }
  }, [uid, ativo])

  return {
    estado,
    marcarSujo,
    sincronizarAgora: useCallback(() => void sincronizar('manual'), [sincronizar]),
  }
}
