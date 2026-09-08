/**
 * AMOSTRA da tela `Programa` no celular, sem rede e sem login.
 *
 * O app do aluno so mostra esta tela para quem tem papel de professor na nuvem,
 * e a sessao vem de um link magico no e-mail — nao ha como eu abrir a tela para
 * conferir o layout em 375px. Sem esta pagina, a verificacao possivel seria
 * "compila", que nao diz nada sobre nomes de tecnica longos num aparelho
 * estreito.
 *
 * Fora do build: `index.html` aponta so para `main.tsx`.
 */
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Programa } from './ui/screens/Programa'
import type { AulaDoPrograma } from '@faixa-azul/core/application/programa'
import { aulaVazia, sugestaoDo1Grau } from '@faixa-azul/core/application/programa'
import { idDoSlot } from '@faixa-azul/core/application/agenda'
import { ITENS_1GRAU } from '@faixa-azul/core/seed/primeiro-grau'
import '@faixa-azul/core/tokens.css'
import './ui/app.css'

const HOJE = new Date()

/**
 * Aulas agendadas de verdade: a sugestao do 1o grau, com as primeiras postas nas
 * tercas e quintas a partir de hoje. Dados inventados nao testariam o que
 * quebra — nomes reais de tecnica sao longos.
 */
function agendadas(): AulaDoPrograma[] {
  const plano = [...sugestaoDo1Grau(ITENS_1GRAU)].sort((a, b) => a[0] - b[0])
  const saida: AulaDoPrograma[] = []
  let d = new Date(HOJE.getFullYear(), HOJE.getMonth(), HOJE.getDate(), 12)
  for (const [numero, itemIds] of plano.slice(0, 6)) {
    // Anda ate a proxima terca (2) ou quinta (4).
    while (d.getDay() !== 2 && d.getDay() !== 4) d.setDate(d.getDate() + 1)
    const data = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    saida.push({ ...aulaVazia(numero), itemIds, slot: idDoSlot(data, '08:00') })
    d.setDate(d.getDate() + 1)
  }
  // Uma aula agendada e VAZIA, para ver o aviso do substituto.
  while (d.getDay() !== 2 && d.getDay() !== 4) d.setDate(d.getDate() + 1)
  const data = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  saida.push({ ...aulaVazia(30), slot: idDoSlot(data, '08:00') })
  return saida
}

function Amostra() {
  const [aulas] = useState(agendadas)
  return <Programa logado hoje={HOJE} aulasDeTeste={aulas} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Amostra />
  </StrictMode>,
)
