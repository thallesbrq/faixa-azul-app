/**
 * Tela Hoje — spec 8.2.
 *
 * Uma decisao por tela: o que fazer agora. Tudo o mais e contexto curto.
 */

import type { Modulo } from '../../domain/types'
import type { FilaDoDia } from '../../application/fila'

export interface HojeProps {
  diasAteProva: number
  metaProvisoria: boolean
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
