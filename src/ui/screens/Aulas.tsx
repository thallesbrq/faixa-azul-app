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
  AULOES,
  MINUTOS_POR_AULA,
  auloesDoPacote,
  pautaDaAula,
  planoVigente,
  repescagensPendentes,
  saldoDoPacote,
} from '../../application/aulas'
import type { AtribuicaoDeItens } from '../../application/aulas'
import { dataLocalISO, montarPlanner } from '../../application/planner'
import { progressoPorItem } from '../../application/progresso'
import { PlannerSemanal } from '../components/PlannerSemanal'
import type { Card, Dificuldade, ReviewState, TechniqueItem, ValidacaoDoProfessor } from '../../domain/types'
import type { AulaParticular } from '../../domain/types'

/**
 * Primeiro dia do pacote — PROVISORIO. O aluno deixou datas e horarios em aberto
 * com o professor, entao isto e so uma referencia para o planner ter um eixo de
 * tempo. Quando as datas forem combinadas, viram campo no estado.
 */
const INICIO_DO_PACOTE = '2026-09-02'

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
  /** Data-alvo da prova, ISO — para o planner medir a folga. */
  dataAlvo: string
  /**
   * Tela de montagem, montada por quem tem acesso ao estado. Chega pronta
   * porque esta tela nao precisa conhecer anotacoes nem o callback de arrastar —
   * ela so decide QUAL visao mostrar.
   */
  montar: React.ReactNode
  /**
   * A grade montada pelo professor. Esta tela PRECISA dela, e por isso o
   * comentario acima encolheu: enquanto o plano vinha so do gerador, a tela
   * mostrava uma grade que o professor nao montou depois de ele ter montado a
   * dele. Aqui a montagem tem precedencia; a sugestao e fallback.
   */
  atribuicao: AtribuicaoDeItens
}

type Visao = 'plano' | 'planner' | 'montar'

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
  dataAlvo,
  montar,
  atribuicao,
}: AulasProps) {
  const [expandida, setExpandida] = useState<number | null>(null)
  const [visao, setVisao] = useState<Visao>('plano')
  const hoje = dataLocalISO(new Date())

  const progresso = useMemo(
    () => progressoPorItem(itens, baralho, revisoes, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itens, baralho, revisoes],
  )

  const plano = useMemo(
    () => planoVigente({ atribuicao, progresso, totalAulas: aulas.length, dificuldades }),
    [atribuicao, progresso, aulas.length, dificuldades],
  )
  const repescagens = useMemo(() => repescagensPendentes(validacoes), [validacoes])
  const auloes = useMemo(
    () => auloesDoPacote({ foraDoPlano: plano.foraDoPlano, progresso }),
    [plano.foraDoPlano, progresso],
  )
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

  const planner = useMemo(
    () => montarPlanner({ plano, inicio: INICIO_DO_PACOTE, hoje, dataDaProva: dataAlvo.slice(0, 10) }),
    [plano, hoje, dataAlvo],
  )

  return (
    <div>
      <div className="alternador" role="tablist" aria-label="Visão das aulas">
        <button
          role="tab"
          aria-selected={visao === 'plano'}
          className={visao === 'plano' ? 'alternador-item alternador-item--ativo' : 'alternador-item'}
          onClick={() => setVisao('plano')}
        >
          Plano
        </button>
        <button
          role="tab"
          aria-selected={visao === 'planner'}
          className={visao === 'planner' ? 'alternador-item alternador-item--ativo' : 'alternador-item'}
          onClick={() => setVisao('planner')}
        >
          Planner
        </button>
        <button
          role="tab"
          aria-selected={visao === 'montar'}
          className={visao === 'montar' ? 'alternador-item alternador-item--ativo' : 'alternador-item'}
          onClick={() => setVisao('montar')}
        >
          Montar
        </button>
      </div>

      {visao === 'montar' ? (
        montar
      ) : (
        <>
          {/*
            De onde vem a grade. Isto nao e enfeite: o Plano e o Planner sao
            identicos nas duas fontes, e sem o rotulo o aluno nao tem como saber
            se esta olhando a decisao do mestre ou um chute do app.
          */}
          {plano.fonte === 'montagem' ? (
            plano.naoAtribuidos.length > 0 ? (
              <p className="aviso">
                <span aria-hidden="true">⚠️</span>
                <span>
                  Grade montada pelo mestre, mas <strong>{plano.naoAtribuidos.length}</strong>{' '}
                  {plano.naoAtribuidos.length === 1 ? 'técnica ainda está' : 'técnicas ainda estão'} fora de
                  qualquer aula. Termine em <strong>Montar</strong> antes de usar isto como plano.
                </span>
              </p>
            ) : (
              <p className="instrucao">
                Grade montada pelo mestre — as {plano.aulas.length} aulas cobrem os{' '}
                {plano.aulas.reduce((s, a) => s + a.itens.length, 0)} itens da prova.
              </p>
            )
          ) : (
            <p className="instrucao">
              <strong>Sugestão do app</strong>, não a grade do mestre. Ele ainda não montou nada — abra{' '}
              <strong>Montar</strong> para distribuir as técnicas, ou use isto como ponto de partida na conversa.
            </p>
          )}

          {visao === 'planner' ? (
            <PlannerSemanal planner={planner} hoje={hoje} />
          ) : (
            <>

      {/* ---------- Proxima aula: a resposta que a tela existe para dar ---------- */}
      {proxima && planoDaProxima ? (
        <div className="card">
          <h2 className="detalhe-nome">Aula {proxima.numero} — o que levar</h2>
          <p className="instrucao" style={{ marginTop: 4 }}>
            {pauta.minutos} min estimados de {MINUTOS_POR_AULA} · {pauta.linhas.length} itens
          </p>

          {pauta.estourou && (
            <p className="instrucao">
              A estimativa passa dos {MINUTOS_POR_AULA} min, e isso é só referência — as técnicas não custam o
              mesmo, e a pauta é montada por <strong>quantidade</strong>. Chegar estudado é o que aperta o
              tempo real.
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

      {/* ---------- Auloes de revisao: destino do que nao cabe ---------- */}
      {auloes.some((a) => a.itens.length > 0 || a.reforco.length > 0) && (
        <div className="card">
          <h3 className="detalhe-secao">
            Aulões de revisão ({AULOES} dias)
          </h3>
          <p className="instrucao">
            {plano.foraDoPlano.length > 0 ? (
              <>
                <strong>{plano.foraDoPlano.length} itens</strong> não couberam nas {aulas.length} particulares e
                vêm para cá, junto com o que você não levou a 100%.
              </>
            ) : (
              <>
                As {aulas.length} particulares cobrem os {plano.aulas.flatMap((a) => a.itens).length} itens da
                prova, então o aulão não recebe conteúdo novo — ele é para <strong>reforçar o que ainda não
                está firme</strong>.
              </>
            )}
          </p>

          {auloes.map((aulao) => (
            <div key={aulao.numero} className="aulao">
              <h4 className="aulao-titulo">
                Aulão {aulao.numero}
                <small>
                  {aulao.itens.length > 0 && (
                    <>
                      {aulao.itens.length} {aulao.itens.length === 1 ? 'item novo' : 'itens novos'}
                      {aulao.reforco.length > 0 && ' · '}
                    </>
                  )}
                  {aulao.reforco.length > 0
                    ? `${aulao.reforco.length} de reforço`
                    : aulao.itens.length === 0 && 'nada pendente ainda'}
                </small>
              </h4>

              {aulao.itens.length > 0 && (
                <ul className="resposta-lista">
                  {aulao.itens.map((i) => (
                    <li key={i.id}>
                      {rotulo(i)} <small>— {i.posicao}</small>
                    </li>
                  ))}
                </ul>
              )}

              {aulao.reforco.length > 0 && (
                <>
                  <p className="instrucao instrucao--apertada">
                    Reforço — passou na particular e ainda não fixou:
                  </p>
                  <ul className="resposta-lista resposta-lista--fraca">
                    {aulao.reforco.slice(0, 8).map((i) => (
                      <li key={i.id}>
                        {rotulo(i)} <small>— {i.posicao}</small>
                      </li>
                    ))}
                    {aulao.reforco.length > 8 && (
                      <li>
                        <small>e mais {aulao.reforco.length - 8}…</small>
                      </li>
                    )}
                  </ul>
                </>
              )}
            </div>
          ))}

          <p className="instrucao" style={{ marginBottom: 0 }}>
            A lista de reforço muda conforme você estuda — ela mostra o que ainda não está firme{' '}
            <strong>hoje</strong>, não o que estará no dia do aulão.
          </p>
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

      {/*
        A nota mudava de veracidade com a fonte: chamar a grade do mestre de
        "proposta do app" seria falso, e foi por deixar uma frase verdadeira
        virar mentira depois de uma mudanca que o documento do professor
        precisou de correcao.
      */}
      <p className="rodape-nota">
        {plano.fonte === 'montagem' ? (
          <>
            A <strong>ordem</strong> e a divisão são do mestre. O que se recalcula conforme você estuda são os
            minutos estimados: item que você já executa custa ~5 min de aula, item cru custa ~12.
          </>
        ) : (
          <>
            O plano é uma <strong>proposta</strong> e se recalcula conforme você estuda: item que você já executa
            custa menos minutos de aula, então estudar antes é o que faz o pacote cobrir a prova.
          </>
        )}
      </p>
            </>
          )}
        </>
      )}
    </div>
  )
}
