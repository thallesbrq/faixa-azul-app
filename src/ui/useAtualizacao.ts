/**
 * Aviso de versao nova, e registro do service worker.
 *
 * POR QUE ESTE ARQUIVO EXISTE SEPARADO. Ele e o UNICO lugar do app que importa
 * `virtual:pwa-register/react` — um modulo que o vite-plugin-pwa cria em tempo
 * de build e que nao existe fora do Vite. Concentrado aqui, o resto da UI
 * continua importavel em teste sem precisar de mock nenhum; espalhado, cada
 * componente que tocasse nisso arrastaria o build inteiro para dentro do teste.
 *
 * O QUE MUDOU DE COMPORTAMENTO. Antes o app usava `autoUpdate`: o service worker
 * novo assumia sozinho e a pagina recarregava sem avisar. Agora ele espera. Ver
 * o comentario em ../../vite.config.ts para o porque.
 *
 * O PRECO DO `prompt`, tratado aqui. Se o aviso for facil de ignorar para
 * sempre, o aluno fica na versao antiga sem saber — que e pior do que a troca
 * silenciosa, porque ai nem o app nem ele sabem em que versao esta. Duas
 * medidas:
 *
 * 1. CHECAGEM PERIODICA. O navegador so procura versao nova quando a pagina
 *    carrega. Num PWA instalado, a pagina pode ficar aberta dias — e sem isto
 *    o aviso nunca apareceria nesse aparelho, que e justamente o do aluno.
 * 2. DISPENSAR VALE PARA A SESSAO, NAO PARA SEMPRE. Fechar o aviso e "agora
 *    nao", e ele volta na proxima abertura. Nao existe "nunca mais".
 */

import { useCallback, useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * De hora em hora. O app nao muda tantas vezes ao dia para justificar mais, e
 * cada checagem e uma requisicao de rede que na academia pode estar no 4G.
 */
const INTERVALO_DE_CHECAGEM_MS = 60 * 60 * 1000

export interface EstadoDaAtualizacao {
  /** Existe versao nova instalada, esperando permissao para assumir. */
  temAtualizacao: boolean
  /** O app acabou de ficar pronto para funcionar sem internet. */
  prontoOffline: boolean
  /** Aplica a versao nova e recarrega a pagina. */
  atualizar: () => void
  /** Esconde o aviso ATE A PROXIMA ABERTURA. Nao e "nunca mais". */
  dispensar: () => void
}

export function useAtualizacao(): EstadoDaAtualizacao {
  const timer = useRef<number | null>(null)

  const {
    needRefresh: [precisaAtualizar, setPrecisaAtualizar],
    offlineReady: [prontoOffline, setProntoOffline],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return
      timer.current = window.setInterval(() => {
        // Sem rede, `update()` falha e nao ha o que checar. Com instalacao em
        // andamento, checar de novo atropelaria a que esta acontecendo.
        if (!navigator.onLine) return
        if (registro.installing) return
        void registro.update()
      }, INTERVALO_DE_CHECAGEM_MS)
    },
  })

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current)
    }
  }, [])

  const atualizar = useCallback(() => {
    // `true` = manda o worker que esta esperando assumir e recarrega a pagina.
    // O estado do aluno vive no localStorage, entao recarregar nao perde nada.
    void updateServiceWorker(true)
  }, [updateServiceWorker])

  /**
   * Dispensar zera as bandeiras DO PLUGIN, e nao um `dispensado` proprio.
   *
   * Havia um `dispensado` aqui, e ele tinha um bug: era um so para as duas
   * mensagens. Dar "Ok" no aviso de "pronto para offline" — que e so uma
   * confirmacao — silenciava o aviso de versao nova pelo resto da sessao, que e
   * o que pede acao. Duas mensagens diferentes nao podem compartilhar um
   * interruptor.
   *
   * Sem ele, quem decide e o proprio plugin: se uma versao nova aparecer depois,
   * ele levanta `needRefresh` outra vez e o aviso volta. Menos estado, e o
   * comportamento certo de graca.
   */
  const dispensar = useCallback(() => {
    setPrecisaAtualizar(false)
    setProntoOffline(false)
  }, [setPrecisaAtualizar, setProntoOffline])

  return {
    temAtualizacao: precisaAtualizar,
    prontoOffline,
    atualizar,
    dispensar,
  }
}
