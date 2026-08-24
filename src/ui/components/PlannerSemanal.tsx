/**
 * Planner semanal — a rotina de segunda a sexta.
 *
 * Cada dia mostra DUAS coisas separadas, porque na vida real elas sao separadas:
 * a aula na academia as 8h (quando ha) e o estudo proprio do dia. No dia de aula
 * particular as duas acontecem, e juntar as duas numa linha unica esconderia
 * justamente o que o aluno precisa fazer depois de sair do tatame.
 *
 * A folga entre a ultima aula e a prova fica no topo porque foi ela que motivou
 * esta tela existir: lista de aulas nao tem data, e por isso nao mostrava que o
 * pacote em certos ritmos termina depois da prova.
 */

import { useState } from 'react'
import { HORARIO_AULA } from '../../application/planner'
import type { DiaDoPlanner, Planner } from '../../application/planner'
import type { TechniqueItem } from '../../domain/types'

const ROTULO_ESTUDO: Record<DiaDoPlanner['estudo']['papel'], string> = {
  prepara: 'prepara',
  consolida: 'consolida',
  livre: 'revisão livre',
}

const CLASSE_ESTUDO: Record<DiaDoPlanner['estudo']['papel'], string> = {
  prepara: 'papel--prepara',
  consolida: 'papel--consolida',
  livre: 'papel--livre',
}

function rotulo(item: TechniqueItem): string {
  return item.nome || item.slot
}

/** `2026-09-02` -> `02/09`. */
function diaMes(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

export function PlannerSemanal({ planner, hoje }: { planner: Planner; hoje: string }) {
  const [aberto, setAberto] = useState<string | null>(null)

  if (planner.semanas.length === 0) {
    return (
      <div className="card">
        <p className="instrucao" style={{ margin: 0 }}>
          Sem aulas planejadas ainda.
        </p>
      </div>
    )
  }

  const folga = planner.diasDeFolgaAteAProva

  return (
    <div>
      <div className="card">
        <h3 className="detalhe-secao">A rotina</h3>
        <ul className="rotina-legenda">
          <li>
            <span className="papel papel--aula">particular</span> segunda e quarta, {HORARIO_AULA} — conteúdo
            da prova
          </li>
          <li>
            <span className="papel papel--regular">regular</span> terça e quinta, {HORARIO_AULA} — conteúdo do
            mestre
          </li>
          <li>
            <span className="papel papel--prepara">prepara</span> /{' '}
            <span className="papel papel--consolida">consolida</span> seu estudo, nos cinco dias
          </li>
        </ul>

        {planner.ultimaAula && (
          <p className="instrucao">
            Última aula em <strong>{diaMes(planner.ultimaAula)}</strong>
            {folga !== null && (
              <>
                {' '}
                · sobram <strong>{folga} dias</strong> até a prova
              </>
            )}
          </p>
        )}

        {planner.aulasSemData > 0 && (
          <p className="aviso" style={{ marginBottom: 0 }}>
            <span aria-hidden="true">⚠️</span>
            <span>
              <strong>{planner.aulasSemData}</strong>{' '}
              {planner.aulasSemData === 1 ? 'aula não cabe' : 'aulas não cabem'} antes da prova neste ritmo.
              Aumente as aulas por semana ou ajuste a data-alvo.
            </span>
          </p>
        )}
      </div>

      {planner.semanas.map((semana) => (
        <div className="card" key={semana.inicio}>
          <h3 className="detalhe-secao">
            Semana {semana.numero} · {diaMes(semana.inicio)}
          </h3>

          <ul className="planner-dias">
            {semana.dias.map((dia) => {
              const ehHoje = dia.data === hoje
              const passou = dia.data < hoje
              const expandido = aberto === dia.data

              return (
                <li
                  key={dia.data}
                  className={['planner-dia', ehHoje ? 'planner-dia--hoje' : '', passou ? 'planner-dia--passou' : '']
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    className="planner-cabeca"
                    onClick={() => setAberto(expandido ? null : dia.data)}
                    aria-expanded={expandido}
                    disabled={dia.estudo.itens.length === 0}
                  >
                    <span className="planner-data">
                      <strong>{dia.nomeDoDia}</strong>
                      <small>{diaMes(dia.data)}</small>
                    </span>

                    <span className="planner-meio">
                      <span className="planner-chips">
                        {dia.aula ? (
                          <span className={`papel ${dia.aula.tipo === 'particular' ? 'papel--aula' : 'papel--regular'}`}>
                            {dia.aula.tipo === 'particular' ? `aula ${dia.aula.numero}` : 'regular'}
                          </span>
                        ) : dia.feriado ? (
                          <span className="papel papel--feriado">{dia.feriado}</span>
                        ) : null}
                        <span className={`papel ${CLASSE_ESTUDO[dia.estudo.papel]}`}>
                          {ROTULO_ESTUDO[dia.estudo.papel]}
                        </span>
                      </span>
                      <span className="planner-foco">{dia.estudo.foco}</span>
                    </span>

                    {dia.estudo.itens.length > 0 && (
                      <span className="planner-conta">
                        {dia.estudo.itens.length}
                        <small>itens</small>
                      </span>
                    )}
                  </button>

                  {expandido && (
                    <ul className="resposta-lista">
                      {dia.estudo.itens.map((i) => (
                        <li key={i.id}>
                          {rotulo(i)} <small>— {i.posicao}</small>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <p className="rodape-nota">
        A véspera de cada aula <strong>prepara</strong> ela — chegar sabendo corta o tempo da aula quase pela
        metade, e é isso que faz os 60 minutos darem conta. O dia da aula e o seguinte{' '}
        <strong>consolidam</strong>, enquanto a correção do mestre ainda está fresca.
      </p>
    </div>
  )
}
