/**
 * Arrastar com Pointer Events, funcionando no toque.
 *
 * POR QUE NAO O DRAG-AND-DROP NATIVO. A API `draggable` do HTML nao dispara em
 * tela de toque — funciona so com mouse. Como esta tela vai ser usada no celular,
 * na academia, o arraste tem de ser feito com Pointer Events na mao.
 *
 * DUAS DECISOES QUE FAZEM ISTO FUNCIONAR NO DEDO:
 *
 * 1. ALCA de arraste, nao a linha inteira. `touch-action: none` e o que impede o
 *    navegador de roubar o gesto para rolar a pagina, mas ele tambem impede a
 *    rolagem NORMAL no elemento. Aplicado a linha toda, o dedo nao rolaria mais
 *    a lista de 56 itens. Aplicado a uma alca pequena, a lista rola e o arraste
 *    funciona.
 *
 * 2. LIMIAR de movimento. Sem ele, todo toque na alca viraria arraste e o toque
 *    simples deixaria de funcionar. Passando de LIMIAR_PX o gesto e arraste;
 *    abaixo disso e toque, e o fluxo de dois toques continua valendo — inclusive
 *    para quem usa teclado, que nao arrasta nada.
 *
 * O alvo e descoberto com `elementFromPoint`, nao com retangulos guardados: a
 * pagina rola e muda de tamanho durante o gesto, e coordenada guardada envelhece.
 * O fantasma que segue o dedo precisa de `pointer-events: none`, senao ele
 * intercepta o proprio ponto e o alvo nunca e encontrado.
 */

import { useCallback, useRef, useState } from 'react'

/** Movimento minimo para o gesto contar como arraste, e nao como toque. */
const LIMIAR_PX = 8

/** Atributo que marca um alvo de soltura. O valor e passado ao callback. */
export const ATRIBUTO_ALVO = 'data-alvo'

export interface EstadoDoArraste {
  itemId: string
  /** Posicao atual do dedo/cursor, para desenhar o fantasma. */
  x: number
  y: number
  /** Valor do `data-alvo` sob o dedo agora, ou null. */
  alvo: string | null
}

export function useArrastar({
  aoSoltar,
  aoTocar,
}: {
  /** Chamado quando solta sobre um alvo valido. */
  aoSoltar: (itemId: string, alvo: string) => void
  /** Chamado quando o gesto nao passou do limiar — foi toque, nao arraste. */
  aoTocar: (itemId: string) => void
}) {
  const [arraste, setArraste] = useState<EstadoDoArraste | null>(null)
  const inicio = useRef<{ x: number; y: number; itemId: string; virouArraste: boolean } | null>(null)

  const alvoEm = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)
    return el?.closest(`[${ATRIBUTO_ALVO}]`)?.getAttribute(ATRIBUTO_ALVO) ?? null
  }

  /** Ligue no `onPointerDown` da ALCA, nunca na linha inteira. */
  const aoPegar = useCallback(
    (itemId: string) => (e: React.PointerEvent) => {
      // Botao direito e outros nao iniciam arraste.
      if (e.button !== 0 && e.pointerType === 'mouse') return
      inicio.current = { x: e.clientX, y: e.clientY, itemId, virouArraste: false }
      // Captura garante receber move/up mesmo se o dedo sair do elemento.
      e.currentTarget.setPointerCapture?.(e.pointerId)
    },
    [],
  )

  const aoMover = useCallback((e: React.PointerEvent) => {
    const i = inicio.current
    if (!i) return

    const dx = e.clientX - i.x
    const dy = e.clientY - i.y

    if (!i.virouArraste && Math.hypot(dx, dy) < LIMIAR_PX) return
    if (!i.virouArraste) i.virouArraste = true

    // Depois de virar arraste, o gesto e nosso: sem isso o navegador ainda
    // tenta selecionar texto no caminho.
    e.preventDefault()
    setArraste({
      itemId: i.itemId,
      x: e.clientX,
      y: e.clientY,
      alvo: alvoEm(e.clientX, e.clientY),
    })
  }, [])

  const aoLargar = useCallback(
    (e: React.PointerEvent) => {
      const i = inicio.current
      inicio.current = null
      if (!i) return

      if (!i.virouArraste) {
        // Nao passou do limiar: foi toque.
        aoTocar(i.itemId)
        setArraste(null)
        return
      }

      const alvo = alvoEm(e.clientX, e.clientY)
      if (alvo !== null) aoSoltar(i.itemId, alvo)
      setArraste(null)
    },
    [aoSoltar, aoTocar],
  )

  /** Gesto interrompido pelo sistema (chamada, notificacao, gesto do OS). */
  const aoCancelar = useCallback(() => {
    inicio.current = null
    setArraste(null)
  }, [])

  /**
   * Props para a alca. `touch-action: none` fica AQUI e so aqui — e o que
   * separa "arrastar este item" de "rolar a pagina".
   */
  const propsDaAlca = useCallback(
    (itemId: string) => ({
      onPointerDown: aoPegar(itemId),
      onPointerMove: aoMover,
      onPointerUp: aoLargar,
      onPointerCancel: aoCancelar,
      style: { touchAction: 'none' as const },
    }),
    [aoPegar, aoMover, aoLargar, aoCancelar],
  )

  return { arraste, propsDaAlca }
}
