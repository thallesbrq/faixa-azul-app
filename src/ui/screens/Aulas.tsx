/**
 * Aulas particulares — RF-07.
 *
 * A tela responde uma pergunta so: "o que eu levo pro mestre na proxima aula?"
 *
 * Tudo o mais e contexto para essa resposta. O plano das 10 aulas fica visivel
 * porque foi decidido que ele seria mostrado ao Prof. Joao Eduardo de uma vez,
 * e o saldo do pacote fica visivel porque quando ele aponta deficit nenhuma
 * priorizacao resolve — a conversa passa a ser sobre o que fica de fora.
 */

import { useMemo, useState } from 'react'
import {
  MINUTOS_POR_AULA,
  gerarPlano,
  pautaDaAula,
  repescagensPendentes,
  saldoDoPacote,
} from '../../application/aulas'
import { progressoPorItem } from '../../application/progresso'
import type { Card, Dificuldade, ReviewState, TechniqueItem, ValidacaoDoProfessor } from '../../domain/types'
import type { AulaParticular } from '../../domain/types'

export interface AulasProps {
  itens: TechniqueItem[]
  baralho: Card[]
  revisoes: ReviewState[]
  aulas: AulaParticular[]
  validacoes: ValidacaoDoProfessor[]
  /** Dificuldade marcada pelo aluno — entra na estimativa de minutos. */
  dificuldades: ReadonlyMap<string, Dificuldade>
  aoMarcarRealizada: (numero: number, realizada: boolean) => void
  aoAbrirItem?: (itemId: string) => void
}

function rotulo(item: TechniqueItem): string {
  return item.nome || item.slot
}

export function Aulas({
  itens,
  baralho,
  revisoes,
  aulas,
  validacoes,
  dificuldades,
  aoMarcarRealizada,
  aoAbrirItem,
}: AulasProps) {
  const [expandida, setExpandida] = useState<number | null>(null)

  const progresso = useMemo(
    () => progressoPorItem(itens, baralho, revisoes, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itens, baralho, revisoes],
  )

  const plano = useMemo(
    () => gerarPlano({ progresso, totalAulas: aulas.length, dificuldades }),
    [progresso, aulas.length, dificuldades],
  )
  const repescagens = useMemo(() => repescagensPendentes(validacoes), [validacoes])
  const saldo = useMemo(
    () => saldoDoPacote(aulas, progresso, MINUTOS_POR_AULA, dificuldades),
    [aulas, progresso, dificuldades],
  )

  /** Proxima aula = a de menor numero ainda nao realizada. */
  const proxima = aulas.find((a) => !a.realizadaEm)
  const planoDaProxima = proxima ? plano.aulas.find((a) => a.numero === proxima.numero) : undefined

  const pauta = useMemo(
    () =>
      planoDaProxima
        ? pautaDaAula({ aula: planoDaProxima, repescagens, progresso, dificuldades })
        : { linhas: [], minutos: 0, estourou: false },
    [planoDaProxima, repescagens, progresso, dificuldades],
  )

  return (
    <div>
      {/* ---------- Proxima aula: a resposta que a tela existe para dar ---------- */}
      {proxima && planoDaProxima ? (
        <div className="card">
          <h2 className="detalhe-nome">Aula {proxima.numero} — o que levar</h2>
          <p className="instrucao" style={{ marginTop: 4 }}>
            {pauta.minutos} min estimados de {MINUTOS_POR_AULA} · {pauta.linhas.length} itens
          </p>

          {pauta.estourou && (
            <p className="aviso">
              <span aria-hidden="true">⚠️</span>
              <span>
                Passa dos {MINUTOS_POR_AULA} minutos. O plano cobre todos os itens da prova, então o app não
                corta nada para caber — estude antes: item que você já executa custa menos da metade do tempo
                de um item cru.
              </span>
            </p>
          )}

          <ol className="pauta">
            {pauta.linhas.map((linha) => (
              <li key={linha.item.id} className={linha.repescagem ? 'pauta-item pauta-item--volta' : 'pauta-item'}>
                <button
                  className="pauta-botao"
                  onClick={() => aoAbrirItem?.(linha.item.id)}
                  disabled={!aoAbrirItem}
                >
                  <span className="pauta-nome">{rotulo(linha.item)}</span>
                  <span className="pauta-meta">
                    {linha.item.posicao}
                    {linha.repescagem && <> · corrigida na aula {linha.corrigidoNaAula}</>}
                  </span>
                </button>
                <span className="pauta-min">{Math.round(linha.minutos)}′</span>
              </li>
            ))}
          </ol>

          {repescagens.length > 0 && (
            <p className="instrucao">
              {repescagens.length === 1 ? (
                <>A primeira é repescagem</>
              ) : (
                <>
                  As <strong>{repescagens.length}</strong> primeiras são repescagem
                </>
              )}
              : o mestre já corrigiu e você marcou que ainda não executava.{' '}
              {repescagens.length === 1 ? 'É rápida' : 'São rápidas'} — é só mostrar de novo.
            </p>
          )}

          <button className="botao botao--principal" onClick={() => aoMarcarRealizada(proxima.numero, true)}>
            Marcar aula {proxima.numero} como feita
          </button>
        </div>
      ) : (
        <div className="card">
          <h2 className="detalhe-nome">Pacote concluído</h2>
          <p className="instrucao" style={{ marginTop: 4 }}>
            As {aulas.length} aulas do pacote foram marcadas como realizadas.
          </p>
        </div>
      )}

      {/* ---------- Saldo: a verdade desconfortavel, quando existe ---------- */}
      <div className="card">
        <h3 className="detalhe-secao">Saldo do pacote</h3>
        <div className="dois-eixos">
          <div>
            <div className="eixo-valor">{saldo.restantes}</div>
            <div className="eixo-rotulo">
              aulas restantes
              <small>{saldo.minutosRestantes} min com o mestre</small>
            </div>
          </div>
          <div>
            <div className="eixo-valor">{saldo.naoValidados}</div>
            <div className="eixo-rotulo">
              itens sem validação
              <small>~{saldo.minutosNecessarios} min necessários</small>
            </div>
          </div>
        </div>

        {saldo.deficit > 0 ? (
          <p className="aviso" style={{ marginBottom: 0 }}>
            <span aria-hidden="true">⚠️</span>
            <span>
              Faltam <strong>{saldo.deficit} min</strong> de aula para validar tudo no ritmo atual. Cada ponto
              de domínio que você sobe estudando sozinho devolve tempo do mestre — item cru custa ~12 min de
              aula, item que você já executa custa ~5.
            </span>
          </p>
        ) : (
          <p className="instrucao" style={{ marginBottom: 0 }}>
            No ritmo atual o pacote dá conta do que falta validar.
          </p>
        )}
      </div>

      {/* ---------- O que nao cabe ---------- */}
      {plano.foraDoPlano.length > 0 && (
        <div className="card">
          <h3 className="detalhe-secao">Fora do pacote ({plano.foraDoPlano.length})</h3>
          <p className="instrucao">
            Não há vaga para estes itens nas {aulas.length} aulas. O conteúdo avançado sai primeiro, por decisão
            sua — eles ficam para a aula regular de seg/qua ou para um pacote seguinte.
          </p>
          <ul className="resposta-lista">
            {plano.foraDoPlano.map((i) => (
              <li key={i.id}>
                {rotulo(i)} <small>— {i.posicao}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------- Plano completo, para mostrar ao professor ---------- */}
      <div className="card">
        <h3 className="detalhe-secao">Plano das {aulas.length} aulas</h3>
        <p className="instrucao">
          Uma saída em toda aula desde a primeira, e cada posição dividida em duas passagens afastadas — a
          segunda cai quando a memória já começou a falhar, que é onde ela fixa melhor.
        </p>
        <ul className="lista-aulas">
          {plano.aulas.map((a) => {
            const registro = aulas.find((x) => x.numero === a.numero)
            const feita = Boolean(registro?.realizadaEm)
            const aberta = expandida === a.numero
            return (
              <li key={a.numero} className={feita ? 'aula-linha aula-linha--feita' : 'aula-linha'}>
                <button
                  className="aula-cabeca"
                  onClick={() => setExpandida(aberta ? null : a.numero)}
                  aria-expanded={aberta}
                >
                  <span className="aula-numero">{feita ? '✓' : a.numero}</span>
                  <span className="aula-titulo">
                    {a.posicoes.join(' + ') || 'sem itens'}
                    <small>
                      {a.itens.length} itens · {a.minutosEstimados} min
                    </small>
                  </span>
                  <span aria-hidden="true">{aberta ? '▾' : '▸'}</span>
                </button>
                {aberta && (
                  <>
                    <ul className="resposta-lista">
                      {a.itens.map((i) => (
                        <li key={i.id}>
                          {rotulo(i)} <small>— {i.posicao}</small>
                        </li>
                      ))}
                    </ul>
                    {feita && (
                      <button
                        className="botao botao--secundario"
                        onClick={() => aoMarcarRealizada(a.numero, false)}
                      >
                        Desmarcar como feita
                      </button>
                    )}
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <p className="rodape-nota">
        O plano é uma <strong>proposta</strong> e se recalcula conforme você estuda: item que você já executa
        custa menos minutos de aula, então estudar antes é o que faz o pacote cobrir a prova.
      </p>
    </div>
  )
}
