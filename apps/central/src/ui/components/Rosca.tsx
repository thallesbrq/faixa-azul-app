/**
 * Rosca do progresso da turma.
 *
 * SVG A MAO, SEM BIBLIOTECA. E um arco: um circulo com `stroke-dasharray` do
 * comprimento total e `stroke-dashoffset` proporcional ao que falta. Trazer uma
 * biblioteca de graficos para isso custaria mais bytes que todo o resto da
 * pagina.
 *
 * O DENOMINADOR APARECE JUNTO, e nao e enfeite: "61%" sozinho e um numero com
 * denominador escondido, que e a forma mais facil de mentir com um dado
 * verdadeiro. "média de 5 dos 7" e o mesmo numero, honesto (ADR-015, decisao 7).
 */

import type { MediaDaTurma } from '@faixa-azul/core/application/central'
import { corDaFaixa, porcento } from '../formato'

const TAMANHO = 168
const ESPESSURA = 16

export function Rosca({ media, titulo }: { media: MediaDaTurma; titulo: string }) {
  const r = (TAMANHO - ESPESSURA) / 2
  const volta = 2 * Math.PI * r
  const fracao = media.progresso ?? 0
  const cor = corDaFaixa(media.faixa)

  return (
    <div className="rosca-caixa">
      <h3>{titulo}</h3>
      <svg
        viewBox={`0 0 ${TAMANHO} ${TAMANHO}`}
        width={TAMANHO}
        height={TAMANHO}
        role="img"
        aria-label={`${titulo}: ${porcento(media.progresso)}`}
      >
        <circle
          cx={TAMANHO / 2}
          cy={TAMANHO / 2}
          r={r}
          fill="none"
          stroke="var(--cor-borda)"
          strokeWidth={ESPESSURA}
        />
        {/* Sem progresso medivel nao desenhamos arco nenhum: um arco de tamanho
            zero e visualmente igual a "zero por cento", e nao e isso. */}
        {media.progresso !== null && (
          <circle
            cx={TAMANHO / 2}
            cy={TAMANHO / 2}
            r={r}
            fill="none"
            stroke={cor}
            strokeWidth={ESPESSURA}
            strokeLinecap="round"
            strokeDasharray={volta.toFixed(1)}
            strokeDashoffset={(volta * (1 - fracao)).toFixed(1)}
            transform={`rotate(-90 ${TAMANHO / 2} ${TAMANHO / 2})`}
          />
        )}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="rosca-valor"
          fill={cor}
        >
          {porcento(media.progresso)}
        </text>
      </svg>

      <p className="rosca-apoio">
        {media.progresso === null ? (
          media.fora['turma-sem-curriculo'] > 0 && media.fora['sem-dados'] === 0 ? (
            'Sem currículo desta faixa ainda'
          ) : media.total === 0 ? (
            'Nenhum aluno nesta turma'
          ) : (
            'Ninguém sincronizou ainda'
          )
        ) : (
          <>
            média de <strong>{media.considerados}</strong> {media.considerados === 1 ? 'aluno' : 'alunos'}
            {media.considerados !== media.total && <> de {media.total}</>}
          </>
        )}
      </p>

      {/* Quem ficou de fora, e por que. Sem isto o denominador diz que faltam
          dois alunos mas nao diz se e falta de dado ou falta de curriculo. */}
      {media.fora['sem-dados'] > 0 && (
        <p className="rosca-nota">
          {media.fora['sem-dados']}{' '}
          {media.fora['sem-dados'] === 1 ? 'aluno nunca sincronizou' : 'alunos nunca sincronizaram'}
        </p>
      )}
      {media.fora['turma-sem-curriculo'] > 0 && media.progresso !== null && (
        <p className="rosca-nota">
          {media.fora['turma-sem-curriculo']} em turma sem currículo próprio
        </p>
      )}
    </div>
  )
}
