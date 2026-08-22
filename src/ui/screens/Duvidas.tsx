/**
 * Duvidas — RF-07.
 *
 * A lista completa tem ~173 perguntas, o que e correto no modelo e inutil numa
 * aula. A tela nasce recortada por aula: voce escolhe a aula, ve so o que
 * interessa e leva o texto pronto.
 */

import { useMemo, useState } from 'react'
import { agruparDuvidas, duvidasDaAula, exportarDuvidas, resumoDeDuvidas } from '../../application/duvidas'
import type { AulaParticular, TeacherQuestion, TechniqueItem } from '../../domain/types'

export interface DuvidasProps {
  duvidas: TeacherQuestion[]
  itens: TechniqueItem[]
  aulas: AulaParticular[]
  aoAlterar: (
    id: string,
    mudanca: {
      status: TeacherQuestion['status']
      resposta?: string
      respondidaNaAulaNumero?: number
      respondidaAt?: string
    },
  ) => void
}

type Recorte = { tipo: 'aula'; numero: number } | { tipo: 'todas' } | { tipo: 'respondidas' }

export function Duvidas({ duvidas, itens, aulas, aoAlterar }: DuvidasProps) {
  const [recorte, setRecorte] = useState<Recorte>({ tipo: 'aula', numero: 1 })
  const [copiado, setCopiado] = useState(false)
  const [respondendo, setRespondendo] = useState<string | null>(null)
  const [resposta, setResposta] = useState('')

  const resumo = useMemo(() => resumoDeDuvidas(duvidas), [duvidas])

  const { visiveis, titulo } = useMemo(() => {
    if (recorte.tipo === 'todas') {
      return { visiveis: duvidas.filter((d) => d.status !== 'respondida'), titulo: 'Todas as dúvidas abertas' }
    }
    if (recorte.tipo === 'respondidas') {
      return { visiveis: duvidas.filter((d) => d.status === 'respondida'), titulo: 'Já respondidas' }
    }
    const aula = aulas.find((a) => a.numero === recorte.numero)
    return {
      visiveis: aula ? duvidasDaAula(aula, duvidas) : [],
      titulo: aula ? `Aula ${aula.numero} — ${aula.tema}` : 'Aula',
    }
  }, [recorte, duvidas, aulas])

  const grupos = useMemo(() => agruparDuvidas(visiveis, itens), [visiveis, itens])

  async function copiar() {
    const texto = exportarDuvidas({ titulo, duvidas: visiveis, itens })
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Sem permissao de clipboard: mostra o texto para copiar a mao.
      window.prompt('Copie o texto abaixo:', texto)
    }
  }

  function salvarResposta(d: TeacherQuestion) {
    if (!resposta.trim()) return
    aoAlterar(d.id, {
      status: 'respondida',
      resposta: resposta.trim(),
      respondidaNaAulaNumero: recorte.tipo === 'aula' ? recorte.numero : undefined,
      respondidaAt: new Date().toISOString(),
    })
    setRespondendo(null)
    setResposta('')
  }

  return (
    <div>
      <div className="card">
        <div className="linha-metricas">
          <div className="metrica">
            <div className="valor">{resumo.abertas}</div>
            <div className="rotulo">abertas</div>
          </div>
          <div className="metrica">
            <div className="valor">{resumo.levadas}</div>
            <div className="rotulo">levadas</div>
          </div>
          <div className="metrica">
            <div className="valor">{resumo.respondidas}</div>
            <div className="rotulo">respondidas</div>
          </div>
        </div>

        <label className="campo" style={{ marginTop: 'calc(var(--espacamento-base) * 2)' }}>
          <span>Recorte</span>
          <select
            value={recorte.tipo === 'aula' ? `aula-${recorte.numero}` : recorte.tipo}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'todas') setRecorte({ tipo: 'todas' })
              else if (v === 'respondidas') setRecorte({ tipo: 'respondidas' })
              else setRecorte({ tipo: 'aula', numero: Number(v.replace('aula-', '')) })
            }}
          >
            {aulas.map((a) => (
              <option key={a.numero} value={`aula-${a.numero}`}>
                Aula {a.numero} — {a.tema}
              </option>
            ))}
            <option value="todas">Todas as abertas ({resumo.abertas})</option>
            <option value="respondidas">Já respondidas ({resumo.respondidas})</option>
          </select>
        </label>

        <p className="instrucao" style={{ marginTop: 'var(--espacamento-base)' }}>
          {visiveis.length} pergunta{visiveis.length === 1 ? '' : 's'} neste recorte
          {recorte.tipo === 'todas' && visiveis.length > 40 && (
            <> — muitas para uma aula só. Prefira o recorte por aula.</>
          )}
        </p>

        {visiveis.length > 0 && (
          <button className="botao botao--principal" onClick={copiar}>
            {copiado ? 'Copiado ✓' : 'Copiar lista para levar à academia'}
          </button>
        )}
      </div>

      {grupos.length === 0 && (
        <div className="card vazio">
          <div className="emoji">🎉</div>
          <p style={{ fontWeight: 600, margin: '8px 0 0' }}>Nada pendente aqui</p>
        </div>
      )}

      {grupos.map((grupo) => (
        <div className="card" key={grupo.titulo + (grupo.itemId ?? '')}>
          <h3 className="detalhe-secao">{grupo.titulo}</h3>
          {grupo.posicao && grupo.posicao !== grupo.titulo && <p className="detalhe-slot">{grupo.posicao}</p>}

          <ul className="lista-duvidas">
            {grupo.duvidas.map((d) => (
              <li key={d.id}>
                <p className="duvida-pergunta">{d.pergunta}</p>

                {d.resposta && (
                  <p className="duvida-resposta">
                    <strong>Professor:</strong> {d.resposta}
                  </p>
                )}

                {d.status !== 'respondida' && (
                  <div className="acoes">
                    {d.status === 'aberta' && (
                      <button
                        className="botao botao--secundario"
                        onClick={() => aoAlterar(d.id, { status: 'levada_a_aula' })}
                      >
                        Levei à aula
                      </button>
                    )}
                    {respondendo === d.id ? (
                      <div className="form-validacao" style={{ width: '100%' }}>
                        <label>
                          <span>O que o professor respondeu</span>
                          <textarea value={resposta} onChange={(e) => setResposta(e.target.value)} rows={2} />
                        </label>
                        <div className="acoes">
                          <button
                            className="botao botao--principal"
                            onClick={() => salvarResposta(d)}
                            disabled={!resposta.trim()}
                          >
                            Salvar
                          </button>
                          <button className="botao botao--secundario" onClick={() => setRespondendo(null)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="botao botao--secundario"
                        onClick={() => {
                          setRespondendo(d.id)
                          setResposta('')
                        }}
                      >
                        Registrar resposta
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
