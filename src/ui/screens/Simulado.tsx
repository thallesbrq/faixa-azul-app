/**
 * Simulado — RF-04.
 *
 * Reaproveita o componente de Revisao para executar os cartoes: a interacao e a
 * mesma, e isso e coerente com a decisao de que as respostas do simulado contam
 * como revisoes de verdade (ver application/simulado.ts).
 *
 * A diferenca esta no comeco e no fim: escolha de escopo antes, relatorio por
 * categoria depois.
 */

import { useMemo, useState } from 'react'
import { montarSimulado, relatorioDoSimulado } from '../../application/simulado'
import type { ConfigSimulado, ModoSimulado } from '../../application/simulado'
import type { Card, Modulo, Rating, ReviewEvent, TechniqueItem } from '../../domain/types'
import { Revisao } from './Revisao'

type Fase = 'config' | 'executando' | 'relatorio'

const MODOS: { id: ModoSimulado; rotulo: string; ajuda: string }[] = [
  { id: 'misto', rotulo: 'Misto', ajuda: 'técnicas e teoria, como na prova' },
  { id: 'tecnico', rotulo: 'Técnico', ajuda: 'só guardas e saídas' },
  { id: 'teorico', rotulo: 'Teórico', ajuda: 'valores, história e pontuação' },
]

const QUANTIDADES = [10, 20, 30]

export interface SimuladoProps {
  baralho: Card[]
  itens: TechniqueItem[]
  modulos: Modulo[]
  aoAvaliar: (entrada: { cardId: string; rating: Rating; usouDica: boolean }) => void
}

export function Simulado({ baralho, itens, modulos, aoAvaliar }: SimuladoProps) {
  const [fase, setFase] = useState<Fase>('config')
  const [modo, setModo] = useState<ModoSimulado>('misto')
  const [quantidade, setQuantidade] = useState(20)
  const [fila, setFila] = useState<Card[]>([])
  const [respostas, setRespostas] = useState<{ cartao: Card; evento: ReviewEvent }[]>([])

  const modulosAtivos = useMemo(() => {
    const comItens = new Set(itens.filter((i) => i.ativo).map((i) => i.moduloId))
    return modulos.filter((m) => comItens.has(m.id))
  }, [itens, modulos])

  function comecar() {
    const config: ConfigSimulado = { modo, quantidade }
    const sorteados = montarSimulado({ cartoes: baralho, itens, config })
    if (sorteados.length === 0) return
    setFila(sorteados)
    setRespostas([])
    setFase('executando')
  }

  /** Registra no app (conta como revisao) e guarda para o relatorio. */
  function responder({ cardId, rating, usouDica }: { cardId: string; rating: Rating; usouDica: boolean }) {
    aoAvaliar({ cardId, rating, usouDica })

    const cartao = fila.find((c) => c.id === cardId)
    if (!cartao) return

    // Updater puro: nada de setFase aqui dentro. Com StrictMode o updater roda
    // duas vezes, e disparar outro setState nele e efeito colateral em lugar
    // que o React nao garante. O fim do simulado e DERIVADO das contagens.
    setRespostas((atual) => [
      ...atual,
      {
        cartao,
        evento: {
          id: `sim-${cardId}`,
          cardId,
          side: 'unico' as const,
          rating,
          usouDica,
          createdAt: new Date().toISOString(),
        },
      },
    ])
  }

  const relatorio = useMemo(() => relatorioDoSimulado({ respostas, itens }), [respostas, itens])

  /** Terminou quando todos os cartoes sorteados foram respondidos. */
  const terminou = fila.length > 0 && respostas.length >= fila.length

  if (fase === 'executando' && !terminou) {
    return (
      <Revisao
        fila={fila}
        aoAvaliar={responder}
        // Sair no meio vai para o relatorio do que foi respondido, em vez de
        // descartar: o diagnostico parcial ainda vale.
        aoSair={() => setFase(respostas.length > 0 ? 'relatorio' : 'config')}
      />
    )
  }

  if (fase === 'relatorio' || (fase === 'executando' && terminou)) {
    const pct = Math.round(relatorio.taxa * 100)
    return (
      <div>
        <div className="card">
          <h2 className="detalhe-nome">Resultado</h2>
          <p className="contagem" style={{ marginTop: 'var(--espacamento-base)' }}>
            {relatorio.acertos}/{relatorio.total}
          </p>
          <p className="contagem-rotulo">
            {pct}% de acerto
            {relatorio.usouDica > 0 && <> · {relatorio.usouDica} com dica</>}
          </p>

          <p className="aviso" style={{ marginTop: 'calc(var(--espacamento-base) * 2)', marginBottom: 0 }}>
            <span aria-hidden="true">⚠️</span>
            <span>
              Este resultado mede o que você <strong>lembra</strong>, não o que a banca vai aceitar. As técnicas
              ainda são sugestões não validadas pelo Prof. João Eduardo.
            </span>
          </p>
        </div>

        {relatorio.porCategoria.length > 0 && (
          <div className="card">
            <h3 className="detalhe-secao">Por posição — do pior para o melhor</h3>
            <ul className="lista-barras">
              {relatorio.porCategoria.map((linha) => (
                <li key={linha.rotulo}>
                  <div className="barra-topo">
                    <span>{linha.rotulo}</span>
                    <span className="barra-valor">
                      {linha.acertos}/{linha.total}
                    </span>
                  </div>
                  <div className="barra-trilha">
                    <div style={{ width: `${(linha.acertos / linha.total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {relatorio.porTipoDeCartao.length > 0 && (
          <div className="card">
            <h3 className="detalhe-secao">Por tipo de pergunta</h3>
            <ul className="lista-barras">
              {relatorio.porTipoDeCartao.map((linha) => (
                <li key={linha.rotulo}>
                  <div className="barra-topo">
                    <span>{linha.rotulo}</span>
                    <span className="barra-valor">
                      {linha.acertos}/{linha.total}
                    </span>
                  </div>
                  <div className="barra-trilha">
                    <div style={{ width: `${(linha.acertos / linha.total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {relatorio.falhas.length > 0 && (
          <div className="card">
            <h3 className="detalhe-secao">O que falhou ({relatorio.falhas.length})</h3>
            <p className="instrucao">
              Estes cartões já voltaram para a fila com intervalo curto — não precisa anotar.
            </p>
            <ul className="resposta-lista">
              {relatorio.falhas.map((c) => (
                <li key={c.id}>{c.prompt}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          className="botao botao--principal"
          onClick={() => {
            setFila([])
            setRespostas([])
            setFase('config')
          }}
        >
          Novo simulado
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="card">
        <h2 className="detalhe-nome">Simulado</h2>
        <p className="instrucao" style={{ marginTop: 4 }}>
          Ordem aleatória e sem olhar a resposta antes — como na prova. O resultado sai por posição, para mostrar
          onde está a lacuna.
        </p>

        <fieldset className="escolhas">
          <legend>Modo</legend>
          {MODOS.map((m) => (
            <label className="radio" key={m.id}>
              <input type="radio" name="modo" checked={modo === m.id} onChange={() => setModo(m.id)} />
              <span>
                {m.rotulo} <small>— {m.ajuda}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="escolhas">
          <legend>Quantidade</legend>
          <div className="acoes">
            {QUANTIDADES.map((q) => (
              <button
                key={q}
                className={`botao ${quantidade === q ? 'botao--principal' : 'botao--secundario'}`}
                style={{ width: 'auto', flex: 1 }}
                onClick={() => setQuantidade(q)}
                aria-pressed={quantidade === q}
              >
                {q}
              </button>
            ))}
          </div>
        </fieldset>

        <p className="instrucao">
          Escopo: {modulosAtivos.map((m) => m.nome).join(' e ')}
        </p>

        <button className="botao botao--principal" onClick={comecar}>
          Começar simulado
        </button>
      </div>
    </div>
  )
}
