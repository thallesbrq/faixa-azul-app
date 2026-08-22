/**
 * Registro de treino — RF-06.
 *
 * Entra pelo Hoje, nao por aba propria: registrar treino e uma acao do dia
 * (segunda e quarta na Rilion), nao um lugar onde se navega. Uma sexta aba
 * apertaria a barra em 375px para servir uma tela usada duas vezes por semana.
 *
 * A tela e curta de proposito. Ela e preenchida depois de duas horas de treino,
 * de pe no vestiario ou no carro — cada campo a mais e uma chance de o registro
 * nao acontecer, e um registro que nao acontece nao vale nada.
 */

import { useMemo, useState } from 'react'
import { criarObservacao } from '../../application/treino'
import type { PracticeObservation, TechniqueItem } from '../../domain/types'

const RESISTENCIAS: { id: PracticeObservation['resistencia']; rotulo: string }[] = [
  { id: 'sem', rotulo: 'sem' },
  { id: 'leve', rotulo: 'leve' },
  { id: 'media', rotulo: 'média' },
  { id: 'alta', rotulo: 'alta' },
]

const RESULTADOS: { id: PracticeObservation['resultado']; rotulo: string }[] = [
  { id: 'nao_saiu', rotulo: 'não saiu' },
  { id: 'saiu_com_ajuda', rotulo: 'saiu com ajuda' },
  { id: 'saiu', rotulo: 'saiu' },
  { id: 'saiu_com_resistencia', rotulo: 'saiu contra resistência' },
]

export interface TreinoProps {
  itens: TechniqueItem[]
  aoSalvar: (entrada: {
    parceiro?: string
    notaDoProfessor?: string
    observacoes: PracticeObservation[]
  }) => void
  aoSair: () => void
}

function rotulo(item: TechniqueItem): string {
  return item.nome || item.slot
}

export function Treino({ itens, aoSalvar, aoSair }: TreinoProps) {
  const [parceiro, setParceiro] = useState('')
  const [notaDoProfessor, setNotaDoProfessor] = useState('')
  const [observacoes, setObservacoes] = useState<PracticeObservation[]>([])

  // Formulario da observacao em edicao
  const [busca, setBusca] = useState('')
  const [itemId, setItemId] = useState('')
  const [resistencia, setResistencia] = useState<PracticeObservation['resistencia']>('leve')
  const [resultado, setResultado] = useState<PracticeObservation['resultado']>('saiu')
  const [limitacao, setLimitacao] = useState('')

  const ativos = useMemo(() => itens.filter((i) => i.ativo), [itens])
  const porId = useMemo(() => new Map(ativos.map((i) => [i.id, i])), [ativos])

  /** Busca por nome, slot ou posicao — o aluno lembra por qualquer um dos tres. */
  const sugestoes = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return []
    return ativos
      .filter((i) =>
        [rotulo(i), i.posicao, i.slot, ...i.aliases].some((t) => t.toLowerCase().includes(q)),
      )
      .slice(0, 8)
  }, [ativos, busca])

  function adicionar() {
    if (!itemId) return
    setObservacoes((atual) => [
      ...atual,
      criarObservacao({ itemId, resistencia, resultado, limitacao }),
    ])
    setItemId('')
    setBusca('')
    setLimitacao('')
  }

  function remover(indice: number) {
    setObservacoes((atual) => atual.filter((_, i) => i !== indice))
  }

  const selecionado = itemId ? porId.get(itemId) : undefined

  return (
    <div>
      <button
        className="botao botao--secundario"
        onClick={aoSair}
        style={{ marginBottom: 'var(--espacamento-base)' }}
      >
        ← Voltar
      </button>

      <div className="card">
        <h2 className="detalhe-nome">Registrar treino</h2>
        <p className="instrucao" style={{ marginTop: 4 }}>
          O que você conseguiu fazer no rolamento — que é diferente de lembrar os passos e diferente de o
          mestre aprovar. Anote só o que lembrar; incompleto vale mais que nada.
        </p>

        <label className="campo">
          <span>Parceiro (opcional)</span>
          <input value={parceiro} onChange={(e) => setParceiro(e.target.value)} placeholder="Ex.: Pedro" />
        </label>

        <label className="campo">
          <span>O mestre falou algo? (opcional)</span>
          <textarea
            value={notaDoProfessor}
            onChange={(e) => setNotaDoProfessor(e.target.value)}
            rows={2}
            placeholder="Ex.: hoje foi passagem de guarda, insistiu na pressão do ombro."
          />
        </label>
      </div>

      {/* ---------- Observacoes ja adicionadas ---------- */}
      {observacoes.length > 0 && (
        <div className="card">
          <h3 className="detalhe-secao">Neste treino ({observacoes.length})</h3>
          <ul className="lista-observacoes">
            {observacoes.map((o, i) => {
              const item = porId.get(o.itemId)
              const funcionou = o.resultado === 'saiu_com_resistencia'
              return (
                <li key={`${o.itemId}-${i}`} className={funcionou ? 'obs obs--forte' : 'obs'}>
                  <div className="obs-texto">
                    <span className="obs-nome">{item ? rotulo(item) : o.itemId}</span>
                    <span className="obs-meta">
                      {RESULTADOS.find((r) => r.id === o.resultado)?.rotulo} · resistência{' '}
                      {RESISTENCIAS.find((r) => r.id === o.resistencia)?.rotulo}
                      {o.limitacao && <> · {o.limitacao}</>}
                    </span>
                  </div>
                  <button className="obs-remover" onClick={() => remover(i)} aria-label="Remover">
                    ✕
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ---------- Nova observacao ---------- */}
      <div className="card">
        <h3 className="detalhe-secao">Adicionar técnica</h3>

        {selecionado ? (
          <p className="instrucao">
            <strong>{rotulo(selecionado)}</strong> — {selecionado.posicao}{' '}
            <button className="link-limpar" onClick={() => setItemId('')}>
              trocar
            </button>
          </p>
        ) : (
          <>
            <label className="campo">
              <span>Qual técnica</span>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Nome, posição ou slot da prova"
              />
            </label>
            {sugestoes.length > 0 && (
              <ul className="sugestoes">
                {sugestoes.map((i) => (
                  <li key={i.id}>
                    <button onClick={() => setItemId(i.id)}>
                      <span>{rotulo(i)}</span>
                      <small>{i.posicao}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {busca.trim() && sugestoes.length === 0 && (
              <p className="instrucao">Nenhuma técnica das Seções 4 e 5 com esse nome.</p>
            )}
          </>
        )}

        {selecionado && (
          <>
            <fieldset className="escolhas">
              <legend>Resistência do parceiro</legend>
              <div className="acoes">
                {RESISTENCIAS.map((r) => (
                  <button
                    key={r.id}
                    className={`botao ${resistencia === r.id ? 'botao--principal' : 'botao--secundario'}`}
                    style={{ width: 'auto', flex: 1 }}
                    onClick={() => setResistencia(r.id)}
                    aria-pressed={resistencia === r.id}
                  >
                    {r.rotulo}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="escolhas">
              <legend>Resultado</legend>
              {RESULTADOS.map((r) => (
                <label className="radio" key={r.id}>
                  <input
                    type="radio"
                    name="resultado"
                    checked={resultado === r.id}
                    onChange={() => setResultado(r.id)}
                  />
                  <span>{r.rotulo}</span>
                </label>
              ))}
            </fieldset>

            <label className="campo">
              <span>Alguma limitação hoje? (opcional)</span>
              <input
                value={limitacao}
                onChange={(e) => setLimitacao(e.target.value)}
                placeholder="Ex.: ombro esquerdo travando"
              />
            </label>
            <p className="instrucao">
              O app guarda isso como você escreveu e não interpreta nada. Dor é assunto para o mestre e para
              profissional de saúde.
            </p>

            <button className="botao botao--principal" onClick={adicionar}>
              Adicionar ao treino
            </button>
          </>
        )}
      </div>

      <button
        className="botao botao--principal"
        onClick={() => aoSalvar({ parceiro, notaDoProfessor, observacoes })}
        disabled={observacoes.length === 0 && !notaDoProfessor.trim()}
      >
        Salvar treino
      </button>
      {observacoes.length === 0 && !notaDoProfessor.trim() && (
        <p className="instrucao" style={{ textAlign: 'center' }}>
          Adicione ao menos uma técnica ou uma nota do mestre.
        </p>
      )}
    </div>
  )
}
