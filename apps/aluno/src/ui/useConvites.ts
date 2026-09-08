/**
 * Convites da academia, para a central.
 *
 * Carrega sob demanda e SO quando quem esta logado e professor — a lista de
 * convites nao interessa a um aluno, e as regras negariam a leitura de
 * qualquer forma. Tentar carregar de todo jeito produziria um erro de permissao
 * que pareceria defeito.
 */

import { useCallback, useEffect, useState } from 'react'
import type { Papel } from '@faixa-azul/core/domain/papeis'
import type { Convite, Dados } from '@faixa-azul/core/nuvem/pessoas'

export function useConvites(obterDados: () => Promise<Dados>, souProfessor: boolean) {
  const [convites, setConvites] = useState<Convite[]>([])
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    if (!souProfessor) return
    setCarregando(true)
    try {
      const d = await obterDados()
      setConvites(await d.listarConvites())
    } finally {
      setCarregando(false)
    }
  }, [obterDados, souProfessor])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  const convidar = useCallback(
    async (entrada: {
      email: string
      nome: string
      papel: Papel
      turma: string
      meta: string
      estuda: string
    }) => {
      const d = await obterDados()
      await d.convidar(entrada)
      await recarregar()
    },
    [obterDados, recarregar],
  )

  const cancelar = useCallback(
    async (email: string) => {
      const d = await obterDados()
      await d.cancelarConvite(email)
      await recarregar()
    },
    [obterDados, recarregar],
  )

  return { convites, carregando, convidar, cancelar, recarregar }
}
