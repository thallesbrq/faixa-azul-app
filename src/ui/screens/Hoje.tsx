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
}: HojeProps) {
  const nomeDoModuloEmRisco = risco ? modulos.find((m) => m.id === risco.moduloId)?.nome : undefined
  const temFila = fila.cartoes.length > 0

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
