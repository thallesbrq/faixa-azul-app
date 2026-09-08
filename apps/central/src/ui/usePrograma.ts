/**
 * Carrega e grava o programa de uma turma.
 *
 * GRAVA AULA POR AULA, e nao o programa inteiro: cada aula e um documento
 * (ver `nuvem/programas`), entao editar a aula 4 nao toca na aula 12. Isso e o
 * que permite dois professores montarem a mesma turma sem um apagar o outro.
 *
 * O ESTADO LOCAL ANDA NA FRENTE DA REDE. Clicar num item do bolsao atualiza a
 * tela na hora e grava em seguida; se a gravacao falhar, a mensagem aparece e o
 * botao de recarregar desfaz. A alternativa — esperar o Firestore a cada clique —
 * faria montar 25 aulas parecer travamento, e montar e uma sequencia de dezenas
 * de cliques.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FirebaseApp } from 'firebase/app'
import { abrirProgramas } from '@faixa-azul/core/nuvem/programas'
import type { Programas } from '@faixa-azul/core/nuvem/programas'
import {
  aulaVazia,
  montarPlanner,
  porItemNaAula,
  porRotulo,
  sugestaoDo1Grau,
  tirarItemDaAula,
  tirarRotulo,
} from '@faixa-azul/core/application/programa'
import type { AulaDoPrograma, EstadoDoPlanner, RotuloDaAula } from '@faixa-azul/core/application/programa'
import type { TechniqueItem } from '@faixa-azul/core/domain/types'

export interface EstadoDoProgramaNaTela {
  fase: 'carregando' | 'pronto' | 'erro'
  planner: EstadoDoPlanner | null
  mensagem: string | null
  /** Uma gravacao em curso. A tela desabilita o que nao pode competir com ela. */
  gravando: boolean
}

export function usePrograma({
  app,
  turma,
  itensDoBolsao,
  itensConhecidos,
  itensDo1Grau,
}: {
  app: FirebaseApp
  turma: string
  itensDoBolsao: readonly TechniqueItem[]
  itensConhecidos: readonly TechniqueItem[]
  /** Os 29 do 1o grau, para o botao de aplicar a sugestao. */
  itensDo1Grau: readonly TechniqueItem[]
}) {
  const [estado, setEstado] = useState<EstadoDoProgramaNaTela>({
    fase: 'carregando',
    planner: null,
    mensagem: null,
    gravando: false,
  })
  const nuvem = useRef<Programas | null>(null)
  /**
   * As aulas GUARDADAS, separadas do que a tela desenha.
   *
   * `montarPlanner` produz 81 caixas a partir de poucas aulas guardadas; guardar
   * a saida dele e reconstruir as aulas a partir dela seria derivar duas vezes,
   * na direcao errada. A fonte e esta lista.
   */
  const aulas = useRef<AulaDoPrograma[]>([])

  const desenhar = useCallback(() => {
    setEstado((a) => ({
      ...a,
      fase: 'pronto',
      planner: montarPlanner({ turma, aulas: aulas.current, itensDoBolsao, itensConhecidos }),
    }))
  }, [turma, itensDoBolsao, itensConhecidos])

  const carregar = useCallback(async () => {
    setEstado((a) => ({ ...a, fase: 'carregando', mensagem: null }))
    try {
      if (!nuvem.current) nuvem.current = await abrirProgramas(app)
      aulas.current = await nuvem.current.aulasDe(turma)
      desenhar()
    } catch (e) {
      setEstado((a) => ({
        ...a,
        fase: 'erro',
        mensagem: (e as Error)?.message ?? 'Não foi possível ler o programa desta turma.',
      }))
    }
  }, [app, turma, desenhar])

  useEffect(() => {
    void carregar()
  }, [carregar])

  /** Aplica uma mudanca numa aula: local primeiro, rede depois. */
  const mudar = useCallback(
    async (numero: number, f: (a: AulaDoPrograma) => AulaDoPrograma) => {
      const atual = aulas.current.find((a) => a.numero === numero) ?? aulaVazia(numero)
      const nova = f(atual)
      // Sem mudanca real (clique repetido no mesmo item) nao grava nada.
      if (nova === atual) return

      aulas.current = [...aulas.current.filter((a) => a.numero !== numero), nova]
      desenhar()

      setEstado((a) => ({ ...a, gravando: true, mensagem: null }))
      try {
        if (!nuvem.current) nuvem.current = await abrirProgramas(app)
        await nuvem.current.gravarAula(turma, nova)
      } catch (e) {
        setEstado((a) => ({
          ...a,
          mensagem: `Não consegui gravar a aula ${numero}: ${(e as Error)?.message ?? 'erro'}. Recarregue para ver o que está salvo.`,
        }))
      } finally {
        setEstado((a) => ({ ...a, gravando: false }))
      }
    },
    [app, turma, desenhar],
  )

  /**
   * Aplica a sugestao do 1o grau nas 25 primeiras aulas.
   *
   * NAO SOBRESCREVE AULA QUE JA TEM CONTEUDO. Aplicar duas vezes por engano, ou
   * aplicar depois de o professor ja ter montado a aula 4, apagaria o trabalho
   * dele — e a sugestao existe para poupar trabalho, nao para destrui-lo.
   */
  const aplicarSugestao = useCallback(async () => {
    setEstado((a) => ({ ...a, gravando: true, mensagem: null }))
    try {
      const plano = sugestaoDo1Grau(itensDo1Grau)
      const ocupadas = new Set(
        aulas.current.filter((a) => a.itemIds.length > 0 || a.rotulos.length > 0).map((a) => a.numero),
      )
      const novas: AulaDoPrograma[] = []
      for (const [numero, itemIds] of plano) {
        if (ocupadas.has(numero)) continue
        novas.push({ ...aulaVazia(numero), itemIds })
      }
      if (novas.length === 0) {
        setEstado((a) => ({
          ...a,
          gravando: false,
          mensagem: 'As aulas do 1º grau já têm conteúdo — nada foi sobrescrito.',
        }))
        return
      }

      if (!nuvem.current) nuvem.current = await abrirProgramas(app)
      // EM LOTE: sao ~25 documentos, e um laco deixaria a turma pela metade se a
      // rede caisse no meio.
      await nuvem.current.gravarVarias(turma, novas)
      aulas.current = [
        ...aulas.current.filter((a) => !novas.some((n) => n.numero === a.numero)),
        ...novas,
      ]
      desenhar()
      setEstado((a) => ({
        ...a,
        gravando: false,
        mensagem: `Sugestão aplicada em ${novas.length} ${novas.length === 1 ? 'aula' : 'aulas'}. Mova o que quiser.`,
      }))
    } catch (e) {
      setEstado((a) => ({
        ...a,
        gravando: false,
        mensagem: (e as Error)?.message ?? 'Não foi possível aplicar a sugestão.',
      }))
    }
  }, [app, turma, itensDo1Grau, desenhar])

  return {
    estado,
    recarregar: carregar,
    aplicarSugestao,
    porItem: (numero: number, itemId: string) => mudar(numero, (a) => porItemNaAula(a, itemId)),
    tirarItem: (numero: number, itemId: string) => mudar(numero, (a) => tirarItemDaAula(a, itemId)),
    acrescentarRotulo: (numero: number, r: RotuloDaAula) => mudar(numero, (a) => porRotulo(a, r)),
    removerRotulo: (numero: number, id: string) => mudar(numero, (a) => tirarRotulo(a, id)),
    mudarFoco: (numero: number, foco: string) => mudar(numero, (a) => ({ ...a, foco })),
  }
}
