/**
 * Carrega os alunos e calcula as linhas da central.
 *
 * DUAS ETAPAS, E A PRIMEIRA JA VALE TELA: `pessoas` responde quem existe e em
 * que turma, e e uma leitura de colecao (rapida). Os `estados` sao um `getDoc`
 * por aluno, e e o que demora. Mostrar os nomes assim que chegam, com as celulas
 * carregando, e a diferenca entre "abriu" e "travou" para quem tem vinte alunos.
 *
 * RECARREGA SO QUANDO PEDIDO. Nao ha `setInterval`: o dado muda quando um ALUNO
 * sincroniza, o que acontece a cada poucos minutos no aparelho dele — e um
 * professor olhando a tabela nao precisa dela se mexendo sozinha. O botao de
 * recarregar diz quando foi a ultima leitura, que e a informacao que importa.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dados } from '@faixa-azul/core/nuvem/pessoas'
import { abrirCentral } from '@faixa-azul/core/nuvem/central'
import type { DadosDaCentral } from '@faixa-azul/core/nuvem/central'
import { linhasDaAcademia, linhaSemDados } from '@faixa-azul/core/application/central'
import type { Curriculo, LinhaDaCentral } from '@faixa-azul/core/application/central'
import type { EstadoPersistido } from '@faixa-azul/core/persistence/repositorio'
import type { FirebaseApp } from 'firebase/app'

export interface EstadoDasLinhas {
  fase: 'carregando-pessoas' | 'carregando-estados' | 'pronto' | 'erro'
  linhas: LinhaDaCentral[]
  /**
   * Os estados crus, guardados para a pagina de um aluno abrir sem reler.
   *
   * A central JA baixa tudo ao abrir (e a arquitetura escolhida), entao o
   * detalhe de um aluno e um `get` num mapa que ja esta na memoria — clique
   * instantaneo. Um link direto para /central/aluno/x espera a mesma leitura
   * inicial, e nao uma leitura propria: um caminho, nao dois.
   */
  estados: Map<string, EstadoPersistido>
  /** Quantos alunos nao pudemos ler. Erro, e nao ausencia de dado. */
  falhas: { uid: string; motivo: string }[]
  lidoEm: Date | null
  mensagem: string | null
}

export function useLinhas({
  app,
  dados,
  curriculoDaMeta,
}: {
  app: FirebaseApp
  dados: Dados
  /**
   * O curriculo de cada meta. FUNCAO e nao um curriculo so: alunos da mesma
   * turma podem perseguir graduacoes diferentes (ADR-016, decisao 3).
   */
  curriculoDaMeta: (meta: string) => Curriculo | null
}) {
  const [estado, setEstado] = useState<EstadoDasLinhas>({
    fase: 'carregando-pessoas',
    linhas: [],
    estados: new Map(),
    falhas: [],
    lidoEm: null,
    mensagem: null,
  })
  const central = useRef<DadosDaCentral | null>(null)

  const carregar = useCallback(async () => {
    setEstado((a) => ({ ...a, fase: 'carregando-pessoas', mensagem: null }))
    try {
      const pessoas = await dados.listarPessoas()
      // So aluno: o professor tem cadastro em `pessoas` e apareceria como uma
      // linha sem progresso, que nao e um aluno parado — e um professor.
      const alunos = pessoas.filter((p) => p.papel === 'aluno' && p.ativo)

      // Primeiro os nomes, com as celulas ainda vazias.
      setEstado((a) => ({
        ...a,
        fase: 'carregando-estados',
        linhas: alunos.map((p) =>
          linhaSemDados({ uid: p.uid, nome: p.nome, turma: p.turma, meta: p.meta }),
        ),
      }))

      if (!central.current) central.current = await abrirCentral(app)
      const { porUid, falhas } = await central.current.estadosDe(alunos.map((p) => p.uid))

      const agora = new Date()
      // A montagem e do core: a aba do professor no celular usa a MESMA funcao,
      // para as duas telas nao discordarem sobre a mesma academia.
      const linhas = linhasDaAcademia({ cadastros: alunos, estados: porUid, curriculoDaMeta, agora })

      setEstado({ fase: 'pronto', linhas, estados: porUid, falhas, lidoEm: agora, mensagem: null })
    } catch (e) {
      setEstado((a) => ({
        ...a,
        fase: 'erro',
        mensagem: (e as Error)?.message ?? 'Não foi possível carregar os alunos.',
      }))
    }
  }, [app, dados, curriculoDaMeta])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return { estado, recarregar: carregar }
}
