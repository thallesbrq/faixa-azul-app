/**
 * Estado da aplicacao na UI.
 *
 * Unico ponto que conversa com o armazenamento. Os calculos vem todos das
 * camadas de dominio e aplicacao, que nao sabem que React existe.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import { montarFilaDoDia, moduloDeMaiorRisco } from '../application/fila'
import { registrarRevisao, revisadosHoje, taxaDeAcertoSemDica } from '../application/revisar'
import type { EntradaRevisao } from '../application/revisar'
import { gerarBaralho } from '../domain/cards'
import { diasAteProva as calcularDiasAteProva } from '../domain/scheduler'
import { aplicarValidacoes, criarValidacao } from '../domain/validacao'
import type { ValidationStatus } from '../domain/types'
import { depositoEmMemoria, depositoLocalStorage } from '../persistence/deposito'
import { carregar, salvar } from '../persistence/repositorio'
import type { EstadoPersistido } from '../persistence/repositorio'
import { AULAS, CARTOES_TEORIA, CONTEUDOS, ITENS, MODULOS, REQUISITOS } from '../seed'

/**
 * Sem localStorage o app segue funcionando na sessao, mas o progresso nao
 * sobrevive ao fechamento — e a UI avisa, em vez de perder dados em silencio.
 */
const depositoDoNavegador = depositoLocalStorage()
const deposito = depositoDoNavegador ?? depositoEmMemoria()
export const armazenamentoPersistente = depositoDoNavegador !== null

export function useApp() {
  const [estado, setEstado] = useState<EstadoPersistido>(() => carregar(deposito, new Date()))
  const contadorId = useRef(0)

  const atualizar = useCallback((proximo: EstadoPersistido) => {
    salvar(deposito, proximo)
    setEstado(proximo)
  }, [])

  /** Itens com as correcoes do professor ja aplicadas. */
  const itens = useMemo(() => aplicarValidacoes(ITENS, estado.validacoes), [estado.validacoes])

  const baralho = useMemo(
    () =>
      gerarBaralho({
        itens,
        conteudos: CONTEUDOS,
        requisitos: REQUISITOS,
        cartoesTeoria: CARTOES_TEORIA,
      }),
    [itens],
  )

  const agora = new Date()
  const diasAteProva = calcularDiasAteProva(agora, estado.planoExame.dataAlvo)

  const fila = useMemo(
    () => montarFilaDoDia({ cartoes: baralho, itens, revisoes: estado.revisoes, agora, config: estado.config }),
    // `agora` muda a cada render; recalcular a fila por minuto e desnecessario,
    // entao dependemos so do que de fato altera o resultado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baralho, itens, estado.revisoes, estado.config],
  )

  const registrar = useCallback(
    (entrada: Omit<EntradaRevisao, 'agora' | 'diasAteProva' | 'gerarId'>) => {
      const momento = new Date()
      const proximo = registrarRevisao(estado, {
        ...entrada,
        agora: momento,
        diasAteProva: calcularDiasAteProva(momento, estado.planoExame.dataAlvo),
        gerarId: () => `ev-${momento.getTime()}-${++contadorId.current}`,
      })
      atualizar(proximo)
    },
    [estado, atualizar],
  )

  const definirDataAlvo = useCallback(
    (dataISO: string, provisoria: boolean) => {
      atualizar({ ...estado, planoExame: { ...estado.planoExame, dataAlvo: dataISO, provisoria } })
    },
    [estado, atualizar],
  )

  /**
   * Registra o que o professor corrigiu. E o unico caminho para um item chegar a
   * `validado_pelo_professor` — e nao apaga nada: a validacao anterior fica no
   * historico (append-only).
   */
  const registrarValidacao = useCallback(
    (entrada: {
      itemId: string
      texto: string
      novoStatus: ValidationStatus
      origem: 'aula_particular' | 'aula_regular'
      aulaNumero?: number
    }) => {
      const momento = new Date()
      const validacao = criarValidacao({
        id: `val-${momento.getTime()}-${++contadorId.current}`,
        ...entrada,
        agora: momento,
      })
      atualizar({ ...estado, validacoes: [...estado.validacoes, validacao] })
    },
    [estado, atualizar],
  )

  return {
    estado,
    itens,
    conteudos: CONTEUDOS,
    modulos: MODULOS,
    aulas: AULAS,
    requisitos: REQUISITOS,
    baralho,
    fila,
    diasAteProva,
    revisadosHoje: revisadosHoje(estado.eventos, agora),
    taxaSemDica: taxaDeAcertoSemDica(estado.eventos),
    risco: moduloDeMaiorRisco(baralho, itens, estado.revisoes),
    registrar,
    definirDataAlvo,
    registrarValidacao,
  }
}

export type AppEstado = ReturnType<typeof useApp>
