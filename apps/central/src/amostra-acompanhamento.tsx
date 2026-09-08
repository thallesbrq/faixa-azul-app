/**
 * AMOSTRA da matriz de acompanhamento, com o seed real e sem rede.
 *
 * A Central so abre com sessao de professor. Sem esta pagina a verificacao
 * possivel seria "compila", que nao diz nada sobre uma tabela de 29 linhas x
 * quatro colunas com nomes de tecnica de tamanho real.
 *
 * MONTA O COMPONENTE com dados que reproduzem a situacao de producao: o programa
 * da RGI com 25 aulas (5 com data), tres alunos, e o Floki com 6 itens atestados.
 *
 * Fora do build: `index.html` aponta so para `main.tsx`.
 */
import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Acompanhamento } from './ui/components/Acompanhamento'
import { montarAcompanhamento } from '@faixa-azul/core/application/acompanhamento'
import type { ParaAtestar } from '@faixa-azul/core/application/acompanhamento'
import { procedenciaDaAtestacao } from '@faixa-azul/core/domain/competencia'
import type { RegistroDeCompetencia } from '@faixa-azul/core/domain/competencia'
import { CURRICULO_1GRAU } from '@faixa-azul/core/seed/curriculos'
import { ITENS_1GRAU, MODULOS_1GRAU } from '@faixa-azul/core/seed/primeiro-grau'
import { aulaVazia, sugestaoDo1Grau } from '@faixa-azul/core/application/programa'
import { idDoSlot } from '@faixa-azul/core/application/agenda'
import '@faixa-azul/core/tokens.css'
import './ui/central.css'

const HOJE = new Date()
const ALUNOS = [
  { uid: 'willian', nome: 'Willian' },
  { uid: 'henrique', nome: 'Henrique' },
  { uid: 'eduardo', nome: 'Eduardo' },
]

/** O programa da RGI como esta em producao: 25 aulas, as 5 primeiras com data. */
function aulas() {
  const plano = [...sugestaoDo1Grau(ITENS_1GRAU)].sort((a, b) => a[0] - b[0])
  let d = new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate() - 14, 12)
  return plano.map(([numero, itemIds], i) => {
    if (i >= 5) return { ...aulaVazia(numero), itemIds }
    while (d.getDay() !== 2 && d.getDay() !== 4) d.setDate(d.getDate() + 1)
    const data = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    d.setDate(d.getDate() + 1)
    return { ...aulaVazia(numero), itemIds, slot: idDoSlot(data, '08:00') }
  })
}

function Amostra() {
  // `useMemo(() => aulas(), [])` e nao `useMemo(aulas, [])`: a segunda forma faz
  // o oxlint enxergar o corpo da fabrica como corpo do memo e exigir as
  // variaveis internas dela como dependencias.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- as aulas nao dependem de nada
  const asAulas = useMemo(() => aulas(), [])
  const [registros, setRegistros] = useState<Map<string, RegistroDeCompetencia[]>>(() => new Map())

  const dados = useMemo(
    () =>
      montarAcompanhamento({
        turma: 'RGI',
        alunos: ALUNOS,
        itens: CURRICULO_1GRAU.itens,
        modulos: MODULOS_1GRAU,
        aulas: asAulas,
        registrosPorAluno: registros,
        hoje: HOJE,
      }),
    [asAulas, registros],
  )

  return (
    <main className="painel">
      <Acompanhamento
        dados={dados}
        gravando={false}
        aoAtestar={(pares: readonly ParaAtestar[]) => {
          setRegistros((atuais) => {
            const novo = new Map(atuais)
            for (const p of pares) {
              const lista = [...(novo.get(p.alunoUid) ?? [])]
              lista.push({
                id: `r-${p.alunoUid}-${p.itemId}`,
                itemId: p.itemId,
                competente: true,
                texto: procedenciaDaAtestacao({ turma: 'RGI', aula: null, data: null, agora: HOJE }),
                origem: 'aula_regular',
                professorUid: 'prof',
                registradaEm: new Date().toISOString(),
              })
              novo.set(p.alunoUid, lista)
            }
            return novo
          })
        }}
      />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Amostra />
  </StrictMode>,
)
