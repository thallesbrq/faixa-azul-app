/**
 * Tela Hoje — spec 8.2.
 *
 * Uma decisao por tela: o que fazer agora. Tudo o mais e contexto curto.
 */

import type { Modulo } from '@faixa-azul/core/domain/types'
import type { FilaDoDia } from '@faixa-azul/core/application/fila'
import { aulasExigidas, nomeDaMeta } from '@faixa-azul/core/domain/metas'

export interface HojeProps {
  diasAteProva: number
  metaProvisoria: boolean
  /**
   * A PROVA que este aluno persegue, vinda do cadastro na nuvem.
   *
   * ---------------------------------------------------------------------------
   * POR QUE ISTO EXISTE. Em 10/09/2026 o Henrique entrou pela primeira vez e viu
   * "44 dias" na contagem grande desta tela. Os 44 dias eram
   * `META_PROVISORIA_PADRAO = 2026-10-24` — a data provisoria de exame de AZUL do
   * dono do app, cravada em `estadoInicial`. Todo aluno novo nascia com ela.
   *
   * A meta do Henrique e o 1o GRAU, e o 1o grau NAO TEM DATA: ele tem 35 aulas e
   * 29 competencias atestadas (`domain/metas` ja registrava isso — `aulasExigidas`
   * devolve 35 para os graus e `null` para o azul, "porque a prova de azul e a
   * prova, e nao tem contagem de aulas").
   *
   * Uma contagem regressiva para uma prova que ele nao vai fazer nao e um numero
   * imperfeito: e informacao errada no lugar mais visivel do app.
   * ---------------------------------------------------------------------------
   */
  meta: string
  fila: FilaDoDia
  revisadosHoje: number
  taxaSemDica: number | undefined
  risco: { moduloId: string; lapses: number } | undefined
  modulos: Modulo[]
  armazenamentoPersistente: boolean
  aoComecar: () => void
  /** Resumo do registro de treino — o terceiro eixo (RF-06). */
  resumoTreino: { sessoes: number; itensTreinados: number; itensAtivos: number; funcionamSobPressao: number }
  aoRegistrarTreino: () => void
}

export function Hoje({
  diasAteProva,
  metaProvisoria,
  meta,
  fila,
  revisadosHoje,
  taxaSemDica,
  risco,
  modulos,
  armazenamentoPersistente,
  aoComecar,
  resumoTreino,
  aoRegistrarTreino,
}: HojeProps) {
  const nomeDoModuloEmRisco = risco ? modulos.find((m) => m.id === risco.moduloId)?.nome : undefined
  /** `null` = a meta e por PROVA COM DATA (o azul), ou nao ha meta definida. */
  const porAulas = aulasExigidas(meta)
  const temFila = fila.cartoes.length > 0

  /**
   * Segunda e quarta sao os dias de aula na Rilion. O app nao agenda nada
   * nesses dias — o conteudo e do mestre — mas e neles que faz sentido oferecer
   * o registro em destaque, em vez de esperar que o aluno procure a tela.
   */
  const diaDaSemana = new Date().getDay()
  const diaDeAcademia = diaDaSemana === 1 || diaDaSemana === 3

  return (
    <div>
      {!armazenamentoPersistente && (
        <p className="aviso aviso--risco">
          <span aria-hidden="true">⚠️</span>
          <span>
            Este navegador não permite salvar dados. Seu progresso vale só nesta sessão e será perdido ao fechar.
          </span>
        </p>
      )}

      <div className="card">
        {/*
          A CONTAGEM GRANDE SEGUE A META, e nao uma data cravada.

          `aulasExigidas(meta)` responde qual dos dois mundos e este:
            um NUMERO (35 para os graus)  -> a graduacao se conquista por AULAS
            `null` (o azul)               -> a graduacao tem prova com DATA

          O `??` do lado de fora e o caso "sem meta definida" e o de quem abriu o
          app sem conta: aí a data provisoria local e o unico horizonte que
          existe, e ela continua servindo — o app funciona sem cadastro.
        */}
        {porAulas === null ? (
          <>
            <div className="contagem">{diasAteProva} dias</div>
            <div className="contagem-rotulo">
              {metaProvisoria ? (
                <>
                  até a meta <strong>provisória</strong> — o professor ainda não marcou a data
                </>
              ) : (
                <>até a prova</>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="contagem">{porAulas} aulas</div>
            {/*
              NAO E CONTAGEM REGRESSIVA, e a frase diz por que: o app nao sabe a
              quantas aulas ele foi. Sem presenca, quem conta e o professor — e
              inventar "faltam 23" aqui seria trocar uma data falsa por um saldo
              falso. O que o app pode afirmar e a EXIGENCIA.
            */}
            <div className="contagem-rotulo">
              é o que o <strong>{nomeDaMeta(meta)}</strong> pede. O professor conta as aulas e
              atesta as técnicas — não há data marcada.
            </div>
          </>
        )}

        <div className="linha-metricas">
          <div className="metrica">
            <div className="valor">{fila.vencidosTotal}</div>
            <div className="rotulo">vencidos</div>
          </div>
          <div className="metrica">
            <div className="valor">{revisadosHoje}</div>
            <div className="rotulo">feitos hoje</div>
          </div>
          <div className="metrica">
            <div className="valor">{taxaSemDica === undefined ? '—' : `${Math.round(taxaSemDica * 100)}%`}</div>
            <div className="rotulo">acerto sem dica</div>
          </div>
        </div>
      </div>

      <div className={diaDeAcademia ? 'card card--destaque' : 'card'}>
        <h3 className="detalhe-secao">Treino na academia</h3>
        <p className="instrucao">
          {diaDeAcademia ? (
            <>
              Hoje é dia de aula com o mestre. Depois do treino, registre o que <strong>funcionou no
              rolamento</strong> — é o único eixo que lembrar os passos não mede.
            </>
          ) : (
            <>
              As aulas são segunda e quarta. Se treinou em outro dia, registre aqui do mesmo jeito.
            </>
          )}
        </p>

        {resumoTreino.sessoes > 0 && (
          <div className="linha-metricas">
            <div className="metrica">
              <div className="valor">{resumoTreino.sessoes}</div>
              <div className="rotulo">treinos</div>
            </div>
            <div className="metrica">
              <div className="valor">
                {resumoTreino.itensTreinados}/{resumoTreino.itensAtivos}
              </div>
              <div className="rotulo">já no rolamento</div>
            </div>
            <div className="metrica">
              <div className="valor">{resumoTreino.funcionamSobPressao}</div>
              <div className="rotulo">sob pressão</div>
            </div>
          </div>
        )}

        <button
          className={diaDeAcademia ? 'botao botao--principal' : 'botao botao--secundario'}
          onClick={aoRegistrarTreino}
        >
          Registrar treino
        </button>
      </div>

      <div className="card">
        {temFila ? (
          <>
            <p className="instrucao" style={{ marginBottom: 'var(--espacamento-base)' }}>
              Sessão de hoje: <strong>{fila.cartoes.length} cartões</strong>
              {fila.novos > 0 && <> — {fila.novos} novos</>}
              {fila.vencidosAdiados > 0 && <>, {fila.vencidosAdiados} adiados para amanhã</>}
            </p>
            <button className="botao botao--principal" onClick={aoComecar}>
              Começar agora
            </button>
          </>
        ) : (
          <div className="vazio">
            <div className="emoji">✅</div>
            <p style={{ margin: '8px 0 0', fontWeight: 600 }}>Nada vencido agora</p>
            <p className="instrucao" style={{ marginTop: 4 }}>
              Volte mais tarde ou amanhã — o espaçamento é parte do método.
            </p>
          </div>
        )}
      </div>

      {nomeDoModuloEmRisco && (
        <p className="aviso aviso--risco">
          <span aria-hidden="true">📌</span>
          <span>
            Módulo de maior risco: <strong>{nomeDoModuloEmRisco}</strong> — {risco?.lapses} falhas acumuladas.
          </span>
        </p>
      )}

      <p className="rodape-nota">
        Os passo a passo do app são <strong>sugestões não validadas</strong> pelo Prof. João Eduardo. Ele é a
        autoridade sobre nomes, variações e execução correta.
      </p>
    </div>
  )
}
