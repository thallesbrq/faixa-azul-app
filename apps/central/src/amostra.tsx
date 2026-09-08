/**
 * AMOSTRA: monta o Planner com o seed real, sem rede e sem login.
 *
 * POR QUE ISTO EXISTE. A Central so abre com sessao de professor, e a sessao vem
 * de um link magico no e-mail — nao ha como eu abrir a tela para conferir o
 * layout. Sem esta pagina, a unica verificacao possivel seria "compila e os
 * testes passam", que nao diz nada sobre 81 caixas numa grade.
 *
 * USA O SEED DE VERDADE (`CURRICULO_AZUL`, `ITENS_1GRAU`, `sugestaoDo1Grau`), e
 * nao dados inventados: o que quebra num planner e a quantidade real — 81 itens
 * no bolsao, 12 grupos, 25 aulas preenchidas com nomes de tamanho real.
 *
 * Nao entra no build: `main.tsx` e o unico entry do `index.html`.
 */

import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Planner } from './ui/Planner'
import {
  aulaVazia,
  montarPlanner,
  porItemNaAula,
  porRotulo,
  sugestaoDo1Grau,
  tirarItemDaAula,
  tirarRotulo,
} from '@faixa-azul/core/application/programa'
import type { AulaDoPrograma } from '@faixa-azul/core/application/programa'
import { CURRICULO_AZUL } from '@faixa-azul/core/seed/curriculos'
import { ITENS_1GRAU } from '@faixa-azul/core/seed/primeiro-grau'
import '@faixa-azul/core/tokens.css'
import './ui/central.css'

function Amostra() {
  const [aulas, setAulas] = useState<AulaDoPrograma[]>([])

  const planner = montarPlanner({
    turma: 'RGI',
    aulas,
    itensDoBolsao: CURRICULO_AZUL.itens,
    itensConhecidos: [...CURRICULO_AZUL.itens, ...ITENS_1GRAU],
  })

  const mudar = (numero: number, f: (a: AulaDoPrograma) => AulaDoPrograma) =>
    setAulas((atuais) => {
      const atual = atuais.find((a) => a.numero === numero) ?? aulaVazia(numero)
      return [...atuais.filter((a) => a.numero !== numero), f(atual)]
    })

  return (
    <Planner
      planner={planner}
      turma="RGI"
      gravando={false}
      mensagem={null}
      aoVoltar={() => undefined}
      aoAplicarSugestao={() =>
        setAulas([...sugestaoDo1Grau(ITENS_1GRAU)].map(([numero, itemIds]) => ({
          ...aulaVazia(numero),
          itemIds,
        })))
      }
      aoPorItem={(n, id) => mudar(n, (a) => porItemNaAula(a, id))}
      aoTirarItem={(n, id) => mudar(n, (a) => tirarItemDaAula(a, id))}
      aoAcrescentarRotulo={(n, r) => mudar(n, (a) => porRotulo(a, r))}
      aoRemoverRotulo={(n, id) => mudar(n, (a) => tirarRotulo(a, id))}
      aoMudarFoco={(n, foco) => mudar(n, (a) => ({ ...a, foco }))}
    />
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Amostra />
  </StrictMode>,
)
