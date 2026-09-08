/**
 * Navegacao de semanas da Grade de Horario.
 *
 * COMECA NA SEMANA DE HOJE, e o limite vai ate o FIM DO ANO — escolha dele para
 * o teste inicial ("vai ate o final do ano no momento para verificarmos como
 * funciona").
 *
 * O LIMITE E DERIVADO DA DATA DE HOJE (`fimDoAno`), e nao a string
 * `'2026-12-31'`: cravada, ela estaria errada em 1o de janeiro e o sintoma seria
 * a paginacao travada no passado — sem erro, e com a Grade parecendo quebrada.
 *
 * VOLTAR E PERMITIDO ATE A SEMANA DE HOJE, e nao antes. O professor precisa ver
 * a semana atual inteira (inclusive as aulas que ja passaram nela), e nao precisa
 * agendar no passado. Deixar voltar sem limite ofereceria designar a aula 6 para
 * uma terca de julho.
 */

import { useCallback, useMemo, useState } from 'react'
import { domingoDaSemana, fimDoAno, semanasEntre } from '@faixa-azul/core/application/agenda'

const SEMANA_MS = 7 * 86_400_000

export function useSemana(hoje: Date) {
  /**
   * `hoje` chega como parametro e entra num `useMemo` com a data em TEXTO.
   *
   * Um `new Date()` no corpo do componente seria um objeto novo a cada render, e
   * as dependencias que derivam dele mudariam sem parar. Esta sessao ja gastou um
   * deploy num laco de render exatamente por isso — a lição fica no dado: a
   * identidade que importa e o DIA, e o dia e uma string.
   */
  const dia = `${hoje.getFullYear()}-${hoje.getMonth()}-${hoje.getDate()}`

  const { primeira, limite } = useMemo(
    () => ({ primeira: domingoDaSemana(hoje), limite: fimDoAno(hoje) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `dia` e a identidade estavel de `hoje`
    [dia],
  )

  const total = useMemo(() => semanasEntre(primeira, limite), [primeira, limite])
  const [indice, setIndice] = useState(0)

  const domingo = useMemo(
    () => new Date(primeira.getTime() + indice * SEMANA_MS),
    [primeira, indice],
  )

  return {
    domingo,
    /** Quantas semanas de hoje ao fim do ano. Serve para a tela dizer o alcance. */
    total,
    indice,
    podeVoltar: indice > 0,
    podeAvancar: indice < total - 1,
    voltar: useCallback(() => setIndice((i) => Math.max(0, i - 1)), []),
    avancar: useCallback(() => setIndice((i) => Math.min(total - 1, i + 1)), [total]),
    irParaHoje: useCallback(() => setIndice(0), []),
    /** Salta para a semana que contem esta data, se ela estiver no alcance. */
    irPara: useCallback(
      (quando: Date) => {
        const alvo = domingoDaSemana(quando)
        const passos = Math.round((alvo.getTime() - primeira.getTime()) / SEMANA_MS)
        if (passos < 0 || passos >= total) return
        setIndice(passos)
      },
      [primeira, total],
    ),
  }
}
