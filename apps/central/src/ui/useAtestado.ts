/**
 * A folha de atestacao de um aluno, do lado do professor.
 *
 * ATESTAR EXIGE TEXTO, e a exigencia vem do DOMINIO (`criarCompetencia`) e das
 * REGRAS, nao desta tela. Aqui so coletamos. Se a tela fosse a unica guarda,
 * bastaria abrir o console para gravar uma atestacao sem justificativa — e
 * atestacao sem justificativa nao serve como evidencia de graduacao.
 *
 * RECARREGA A FOLHA INTEIRA depois de cada escrita, em vez de mexer no estado
 * local. Sao dezenas de documentos pequenos e a escrita e rara (um clique do
 * professor, nao um arrasto): ler de novo custa pouco e elimina a classe de bug
 * em que a tela e o servidor discordam sobre o que foi atestado.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FirebaseApp } from 'firebase/app'
import { abrirCompetencias } from '@faixa-azul/core/nuvem/competencias'
import type { Competencias, RegistroDeGraduacao } from '@faixa-azul/core/nuvem/competencias'
import type { OrigemDaCompetencia, RegistroDeCompetencia } from '@faixa-azul/core/domain/competencia'

export type FaseDoAtestado = 'carregando' | 'pronta' | 'gravando' | 'erro'

export function useAtestado({
  app,
  alunoUid,
  professorUid,
}: {
  app: FirebaseApp
  alunoUid: string
  professorUid: string
}) {
  const [fase, setFase] = useState<FaseDoAtestado>('carregando')
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [registros, setRegistros] = useState<RegistroDeCompetencia[]>([])
  const [graduacoes, setGraduacoes] = useState<RegistroDeGraduacao[]>([])
  const comp = useRef<Competencias | null>(null)

  const obter = useCallback(async () => {
    if (!comp.current) comp.current = await abrirCompetencias(app)
    return comp.current
  }, [app])

  const carregar = useCallback(async () => {
    setFase('carregando')
    setMensagem(null)
    try {
      const c = await obter()
      const [regs, grads] = await Promise.all([
        c.registrosDe(alunoUid),
        c.graduacoesDe(alunoUid),
      ])
      setRegistros(regs)
      setGraduacoes(grads)
      setFase('pronta')
    } catch (e) {
      setFase('erro')
      setMensagem((e as Error)?.message ?? 'Não foi possível ler as competências.')
    }
  }, [obter, alunoUid])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const atestar = useCallback(
    async (entrada: {
      itemId: string
      competente: boolean
      texto: string
      origem: OrigemDaCompetencia
    }) => {
      setFase('gravando')
      setMensagem(null)
      try {
        const c = await obter()
        await c.atestar(alunoUid, { ...entrada, professorUid }, new Date())
        await carregar()
      } catch (e) {
        setFase('erro')
        setMensagem((e as Error)?.message ?? 'Não foi possível gravar.')
      }
    },
    [obter, alunoUid, professorUid, carregar],
  )

  const conceder = useCallback(
    async (entrada: { meta: string; texto: string; aulasConfirmadas: number | null }) => {
      setFase('gravando')
      setMensagem(null)
      try {
        const c = await obter()
        await c.conceder(alunoUid, { ...entrada, professorUid }, new Date())
        await carregar()
      } catch (e) {
        setFase('erro')
        setMensagem((e as Error)?.message ?? 'Não foi possível conceder.')
      }
    },
    [obter, alunoUid, professorUid, carregar],
  )

  return { fase, mensagem, registros, graduacoes, atestar, conceder, recarregar: carregar }
}
