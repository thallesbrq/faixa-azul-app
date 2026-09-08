/**
 * Le o programa de UMA turma no app do celular.
 *
 * DIFERENTE DO `usePrograma` DA CENTRAL, e nao por duplicacao: aquele MONTA — ele
 * grava aula por aula, aplica sugestao em lote, desaloja ocupante de slot. Este
 * so LE. Reaproveitar o da Central traria toda a maquinaria de escrita para uma
 * tela que nao escreve, e com ela a superficie de erro dela.
 *
 * ESTE HOOK RESISTE A CHAMADOR DESATENTO, e a licao e cara: um array novo a cada
 * render na Central fechou um laco infinito que chegou a producao e fez a tela
 * piscar. Aqui o efeito depende de `[logado, turma]` e mais nada — dois valores
 * primitivos, que nao tem identidade para mudar sozinha.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { conectar } from '@faixa-azul/core/nuvem/cliente'
import type { Nuvem } from '@faixa-azul/core/nuvem/cliente'
import { CONFIG_ALUNO } from '@faixa-azul/core/nuvem/config'
import { APP_ALUNO } from '@faixa-azul/core/chaves'
import { abrirProgramas } from '@faixa-azul/core/nuvem/programas'
import type { Programas } from '@faixa-azul/core/nuvem/programas'
import type { AulaDoPrograma } from '@faixa-azul/core/application/programa'

export interface EstadoDoProgramaDaTurma {
  fase: 'carregando' | 'pronto' | 'erro'
  aulas: readonly AulaDoPrograma[]
  mensagem: string | null
}

/** Lista vazia FIXA: `?? []` a cada render alimenta laco de dependencia. */
const VAZIO: readonly AulaDoPrograma[] = []

export function useProgramaDaTurma({
  logado,
  turma,
}: {
  /**
   * Ha sessao na nuvem?
   *
   * SEM CONTA NAO HA O QUE LER, e as regras negariam: `programas` exige
   * `souAtivo()`, que precisa de cadastro. O hook nao TENTA — tentar produziria
   * um erro de permissao que a tela mostraria como falha tecnica, quando a
   * resposta certa e "entre na sua conta".
   */
  logado: boolean
  /** `''` quando nao ha turma escolhida — o hook nao le nada. */
  turma: string
}) {
  const [estado, setEstado] = useState<EstadoDoProgramaDaTurma>({
    fase: 'carregando',
    aulas: VAZIO,
    mensagem: null,
  })
  /**
   * A CONEXAO MORA AQUI, como em `useAcademia`.
   *
   * Receber o `FirebaseApp` por parametro seria mais testavel e obrigaria a
   * tela a conhecer a nuvem — e a tela nao conhece. `conectar` e idempotente
   * pelo nome do app, entao chamar de novo devolve a mesma instancia.
   */
  const conexao = useRef<Nuvem | null>(null)
  const programas = useRef<Programas | null>(null)

  const carregar = useCallback(async () => {
    if (!logado || turma === '') {
      setEstado({ fase: 'pronto', aulas: VAZIO, mensagem: null })
      return
    }
    setEstado((a) => ({ ...a, fase: 'carregando', mensagem: null }))
    try {
      if (!conexao.current) conexao.current = await conectar(CONFIG_ALUNO, APP_ALUNO)
      if (!programas.current) programas.current = await abrirProgramas(conexao.current.app)
      setEstado({ fase: 'pronto', aulas: await programas.current.aulasDe(turma), mensagem: null })
    } catch (e) {
      setEstado({
        fase: 'erro',
        aulas: VAZIO,
        // Sem conexao NAO E "a turma nao tem programa": a frase precisa cobrar a
        // rede, senao o substituto conclui que o professor nao montou nada.
        mensagem:
          (e as Error)?.message ?? 'Não consegui ler o programa desta turma. Tente de novo.',
      })
    }
  }, [logado, turma])

  useEffect(() => {
    let cancelado = false
    void (async () => {
      if (cancelado) return
      await carregar()
    })()
    return () => {
      cancelado = true
    }
  }, [carregar])

  return { estado, recarregar: carregar }
}
