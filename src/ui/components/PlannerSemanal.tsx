/**
 * Planner semanal — visao de segunda a sexta.
 *
 * Os cinco dias aparecem com PAPEIS diferentes, nao como cinco dias iguais de
 * estudo: segunda e quarta sao da academia (conteudo do mestre) e levam a aula
 * particular; terca e quinta consolidam a aula do dia anterior; sexta prepara a
 * aula da segunda seguinte.
 *
 * A folga entre o fim do pacote e a prova fica no topo porque foi ela que
 * motivou esta tela existir: a lista de aulas nao tem data, e por isso nao
 * mostrava que o pacote num certo ritmo termina depois da prova.
 */

import { useState } from 'react'
import type { DiaDoPlanner, Planner } from '../../application/planner'
import type { TechniqueItem } from '../../domain/types'

const ROTULO_PAPEL: Record<DiaDoPlanner['papel'], string> = {
  aula_particular: 'aula',
  estudo_consolida: 'consolida',
  estudo_prepara: 'prepara',
}

const CLASSE_PAPEL: Record<DiaDoPlanner['papel'], string> = {
  aula_particular: 'papel--aula',
  estudo_consolida: 'papel--consolida',
  estudo_prepara: 'papel--prepara',
}

function rotulo(item: TechniqueItem): string {
  return item.nome || item.slot
}

/** `2026-08-24` -> `24/08`. */
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
        <h3 className="detalhe-secao">Pacote no calendário</h3>
        <p className="instrucao">
          {planner.semanas.length} semanas · 2 aulas por semana · termina em{' '}
          <strong>{diaMes(planner.ultimoDia ?? '')}</strong>
        </p>

        {folga !== null && folga < 0 ? (
          <p className="aviso" style={{ marginBottom: 0 }}>
            <span aria-hidden="true">⚠️</span>
            <span>
              Neste ritmo o pacote termina <strong>{Math.abs(folga)} dias depois da prova</strong>. Aumente as
              aulas por semana ou ajuste a data-alvo.
            </span>
          </p>
        ) : folga !== null ? (
          <p className="instrucao" style={{ marginBottom: 0 }}>
            Sobram <strong>{folga} dias</strong> entre a última aula e a prova — tempo para revisar e para o que
            o mestre ainda corrigir.
          </p>
        ) : null}
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
              const chave = dia.data
              const expandido = aberto === chave

              return (
                <li
                  key={chave}
                  className={[
                    'planner-dia',
                    ehHoje ? 'planner-dia--hoje' : '',
                    passou ? 'planner-dia--passou' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    className="planner-cabeca"
                    onClick={() => setAberto(expandido ? null : chave)}
                    aria-expanded={expandido}
                    disabled={dia.itens.length === 0}
                  >
                    <span className="planner-data">
                      <strong>{dia.nomeDoDia}</strong>
                      <small>{diaMes(dia.data)}</small>
                    </span>

                    <span className="planner-meio">
                      <span className={`papel ${CLASSE_PAPEL[dia.papel]}`}>
                        {dia.papel === 'aula_particular' && dia.aulaNumero
                          ? `aula ${dia.aulaNumero}`
                          : ROTULO_PAPEL[dia.papel]}
                      </span>
                      <span className="planner-foco">{dia.foco}</span>
                    </span>

                    {dia.itens.length > 0 && (
                      <span className="planner-conta">
                        {dia.itens.length}
                        <small>itens</small>
                      </span>
                    )}
                  </button>

                  {dia.naAcademia && (
                    <p className="planner-nota">
                      Também é dia de aula regular na Rilion — o conteúdo dessa aula é do mestre.
                    </p>
                  )}

                  {expandido && (
                    <ul className="resposta-lista">
                      {dia.itens.map((i) => (
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
        Segunda e quarta você já está na academia, então é ali que as particulares encaixam. Terça e quinta
        consolidam a aula do dia anterior; sexta prepara a de segunda — <strong>chegar estudado é o que faz a
        aula caber nos 60 minutos</strong>.
      </p>
    </div>
  )
}
