/**
 * Uma barra por aluno — onde a referencia tinha uma por funcionalidade.
 *
 * ESTA E A LEITURA QUE A TABELA NAO DA. A tabela e para procurar um aluno e ler
 * os detalhes dele; as barras sao para ver a FORMA da turma de um relance: se
 * todos estao juntos, se ha dois na frente e o resto parado, se ha um sozinho no
 * fim. Com vinte linhas de numeros isso nao salta; com vinte barras, salta.
 *
 * A ORDEM AQUI E POR PROGRESSO, e nao por atencao como na tabela — de proposito.
 * A tabela responde "quem precisa de mim"; a barra responde "como a turma se
 * distribui", e distribuicao ordenada por outra coisa nao se le.
 */

import type { LinhaDaCentral } from '@faixa-azul/core/application/central'
import { corDaFaixa, porcento } from '../formato'

export function Barras({
  linhas,
  aoEscolher,
}: {
  linhas: LinhaDaCentral[]
  aoEscolher: (uid: string) => void
}) {
  // Quem nao tem progresso medivel vai para o fim: sem numero nao ha posicao na
  // distribuicao, e intercalar tracinhos quebraria a leitura da forma.
  const ordenadas = [...linhas].sort((a, b) => {
    if (a.progresso === null && b.progresso === null) return a.nome.localeCompare(b.nome, 'pt-BR')
    if (a.progresso === null) return 1
    if (b.progresso === null) return -1
    return b.progresso - a.progresso
  })

  if (ordenadas.length === 0) {
    return (
      <div className="barras-caixa">
        <h3>Progresso por aluno</h3>
        <p className="apoio">Nenhum aluno nesta seleção.</p>
      </div>
    )
  }

  return (
    <div className="barras-caixa">
      <h3>Progresso por aluno</h3>
      {ordenadas.map((l) => (
        <button
          className="barra-linha"
          key={l.uid}
          onClick={() => aoEscolher(l.uid)}
          title={`Ver ${l.nome}`}
        >
          <span className="barra-nome">{l.nome}</span>
          <span className="barra-trilha">
            <span
              className="barra-cheia"
              style={{
                width: `${Math.round((l.progresso ?? 0) * 100)}%`,
                background: corDaFaixa(l.faixa),
              }}
            />
          </span>
          <span className="barra-valor" style={{ color: corDaFaixa(l.faixa) }}>
            {porcento(l.progresso)}
          </span>
        </button>
      ))}
    </div>
  )
}
