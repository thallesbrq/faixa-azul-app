/**
 * Tela de revisao — spec 8.3.
 *
 * ADR-003: a resposta NUNCA aparece sozinha. O aluno precisa tentar lembrar e
 * pedir para ver. Por isso a maquina de estados tem apenas dois estagios, e o
 * segundo exige um gesto explicito.
 */

import { useMemo, useState } from 'react'
import type { Card, Rating } from '../../domain/types'

const ROTULO_TIPO: Record<Card['type'], string> = {
  explicacao: 'Explique',
  sequencia: 'Ordene as etapas',
  classificacao: 'Classifique',
  requisito: 'Requisito da prova',
  teoria: 'Teoria',
}

const INSTRUCAO: Record<Card['type'], string> = {
  explicacao: 'Explique em voz alta, do início ao fim, antes de conferir.',
  sequencia: 'Diga a ordem das etapas em voz alta antes de conferir.',
  classificacao: 'Responda em voz alta antes de conferir.',
  requisito: 'Responda o número antes de conferir.',
  teoria: 'Responda com suas palavras antes de conferir.',
}

const NOTAS: { rating: Rating; titulo: string; ajuda: string; classe: string }[] = [
  { rating: 'again', titulo: 'Não lembrei', ajuda: 'volta hoje', classe: 'nota--again' },
  { rating: 'hard', titulo: 'Com esforço', ajuda: 'volta amanhã', classe: 'nota--hard' },
  { rating: 'good', titulo: 'Lembrei', ajuda: 'volta em dias', classe: 'nota--good' },
  { rating: 'easy', titulo: 'Com folga', ajuda: 'volta mais tarde', classe: 'nota--easy' },
]

export interface RevisaoProps {
  fila: Card[]
  aoAvaliar: (entrada: { cardId: string; rating: Rating; usouDica: boolean }) => void
  aoSair: () => void
}

export function Revisao({ fila, aoAvaliar, aoSair }: RevisaoProps) {
  const [indice, setIndice] = useState(0)
  const [revelado, setRevelado] = useState(false)
  const [usouDica, setUsouDica] = useState(false)

  const cartao = fila[indice]
  const total = fila.length

  // A ordem embaralhada do cartao de sequencia precisa ser estavel enquanto o
  // cartao esta na tela — recalcular a cada render trocaria as etapas de lugar
  // no meio da tentativa do aluno.
  const embaralhado = useMemo(() => {
    if (!cartao || cartao.type !== 'sequencia') return []
    return [...cartao.resposta]
      .map((p, i) => ({ p, ordem: (i * 7919 + cartao.id.length * 31) % cartao.resposta.length }))
      .sort((a, b) => a.ordem - b.ordem)
      .map((x) => x.p)
  }, [cartao])

  if (!cartao) {
    return (
      <div className="card vazio">
        <div className="emoji">🥋</div>
        <h2>Sessão concluída</h2>
        <p className="instrucao">Você respondeu todos os cartões da fila de hoje.</p>
        <button className="botao botao--principal" onClick={aoSair}>
          Voltar
        </button>
      </div>
    )
  }

  function avaliar(rating: Rating) {
    aoAvaliar({ cardId: cartao.id, rating, usouDica })
    setIndice((i) => i + 1)
    setRevelado(false)
    setUsouDica(false)
  }

  const naoValidado = cartao.validationStatus !== 'validado_pelo_professor'

  return (
    <div>
      <div className="revisao-cabecalho">
        <span>
          Cartão {indice + 1} de {total}
        </span>
        <button className="botao botao--secundario" onClick={aoSair} style={{ minHeight: 32, fontSize: '0.8rem' }}>
          Sair
        </button>
      </div>

      <div className="progresso-trilha" role="progressbar" aria-valuenow={indice} aria-valuemin={0} aria-valuemax={total}>
        <div style={{ width: `${(indice / total) * 100}%` }} />
      </div>

      <div className="card">
        <span className="etiqueta">{ROTULO_TIPO[cartao.type]}</span>
        <p className="pergunta">{cartao.prompt}</p>

        {!revelado && (
          <>
            <p className="instrucao">{INSTRUCAO[cartao.type]}</p>

            {cartao.type === 'sequencia' && (
              <ol className="resposta-lista" aria-label="Etapas fora de ordem">
                {embaralhado.map((passo) => (
                  <li key={passo}>{passo}</li>
                ))}
              </ol>
            )}

            {cartao.dica && !usouDica && (
              <button
                className="botao botao--secundario"
                onClick={() => setUsouDica(true)}
                style={{ marginTop: 'var(--espacamento-base)' }}
              >
                Ver dica
              </button>
            )}
            {usouDica && cartao.dica && (
              <p className="instrucao" style={{ marginTop: 'var(--espacamento-base)' }}>
                <strong>Dica:</strong> {cartao.dica}
              </p>
            )}

            <button
              className="botao botao--principal"
              onClick={() => setRevelado(true)}
              style={{ marginTop: 'calc(var(--espacamento-base) * 2)' }}
            >
              Já tentei — ver resposta
            </button>
          </>
        )}

        {revelado && (
          <>
            {naoValidado && (
              <p className="aviso">
                <span aria-hidden="true">⚠️</span>
                <span>
                  Conteúdo <strong>ainda não validado</strong> pelo professor. Trate como sugestão e confirme na
                  academia.
                </span>
              </p>
            )}

            <ol className="resposta-lista">
              {cartao.resposta.map((linha) => (
                <li key={linha}>{linha}</li>
              ))}
            </ol>

            <p className="instrucao" style={{ marginTop: 'calc(var(--espacamento-base) * 2)' }}>
              Como foi a sua tentativa?{usouDica ? ' (você usou a dica)' : ''}
            </p>

            <div className="notas">
              {NOTAS.map((n) => (
                <button
                  key={n.rating}
                  className={`nota ${n.classe}`}
                  onClick={() => avaliar(n.rating)}
                  aria-label={`${n.titulo} — ${n.ajuda}`}
                >
                  {n.titulo}
                  <small>{n.ajuda}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
