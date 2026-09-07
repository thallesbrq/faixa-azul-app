/**
 * Os alunos da academia, no aparelho do professor.
 *
 * O GEMEO ENXUTO do `useLinhas` da Central. As duas telas leem os mesmos
 * documentos e montam as linhas com a MESMA funcao do core
 * (`linhasDaAcademia`) — a diferenca esta so no que cada uma desenha: aqui o
 * professor precisa de nome, turma, progresso e quem parou; no computador ele
 * tem a tabela inteira.
 *
 * CARREGA SOB DEMANDA, e nao na abertura do app. O app do aluno abre para todo
 * mundo, inclusive sem conta e sem rede; puxar a academia na abertura faria
 * quem nao e professor pagar por uma leitura que as regras negariam. Quem
 * chama isto ja sabe que e professor.
 *
 * NAO GUARDA OS ESTADOS. A Central guarda porque tem pagina por aluno; aqui nao
 * ha detalhe para abrir, e vinte estados de 160 KB no `localStorage` de um
 * celular seria pagar caro por nada.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { CONFIG_ALUNO } from '@faixa-azul/core/nuvem/config'
import { APP_ALUNO } from '@faixa-azul/core/chaves'
import { conectar } from '@faixa-azul/core/nuvem/cliente'
import type { Nuvem } from '@faixa-azul/core/nuvem/cliente'
import { abrirCentral } from '@faixa-azul/core/nuvem/central'
import type { DadosDaCentral } from '@faixa-azul/core/nuvem/central'
import { linhasDaAcademia } from '@faixa-azul/core/application/central'
import type { Curriculo, LinhaDaCentral } from '@faixa-azul/core/application/central'
import type { Dados } from '@faixa-azul/core/nuvem/pessoas'

export interface EstadoDaAcademia {
  fase: 'ociosa' | 'carregando' | 'pronta' | 'erro'
  linhas: LinhaDaCentral[]
  /** Leitura que falhou. Erro, e nao ausencia de estudo. */
  falhas: number
  lidoEm: Date | null
  mensagem: string | null
}

export function useAcademia({
  obterDados,
  souProfessor,
  curriculoDaMeta,
}: {
  obterDados: () => Promise<Dados>
  souProfessor: boolean
  /** Um curriculo por meta: a turma nao decide a prova (ADR-016, decisao 3). */
  curriculoDaMeta: (meta: string) => Curriculo | null
}) {
  const [estado, setEstado] = useState<EstadoDaAcademia>({
    fase: 'ociosa',
    linhas: [],
    falhas: 0,
    lidoEm: null,
    mensagem: null,
  })
  const nuvem = useRef<Nuvem | null>(null)
  const central = useRef<DadosDaCentral | null>(null)

  const carregar = useCallback(async () => {
    if (!souProfessor) return
    setEstado((a) => ({ ...a, fase: 'carregando', mensagem: null }))
    try {
      const d = await obterDados()
      const pessoas = await d.listarPessoas()

      if (!nuvem.current) nuvem.current = await conectar(CONFIG_ALUNO, APP_ALUNO)
      if (!central.current) central.current = await abrirCentral(nuvem.current.app)

      const alunos = pessoas.filter((p) => p.papel === 'aluno' && p.ativo)
      const { porUid, falhas } = await central.current.estadosDe(alunos.map((p) => p.uid))

      setEstado({
        fase: 'pronta',
        linhas: linhasDaAcademia({
          cadastros: pessoas,
          estados: porUid,
          curriculoDaMeta,
          agora: new Date(),
        }),
        falhas: falhas.length,
        lidoEm: new Date(),
        mensagem: null,
      })
    } catch (e) {
      setEstado((a) => ({
        ...a,
        fase: 'erro',
        mensagem: (e as Error)?.message ?? 'Não foi possível ler a academia agora.',
      }))
    }
  }, [obterDados, souProfessor, curriculoDaMeta])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { estado, recarregar: carregar }
}
