/**
 * AMOSTRA da folha do atestado, com o curriculo do 1o grau e sem rede.
 *
 * Esta pagina nao existia, e a falta dela custou o defeito que ele acabou de
 * apontar: eu troquei o texto obrigatorio por procedencia na matriz NOVA e
 * deixei a folha — a tela que ele usa — com o campo e com a frase dizendo que o
 * texto era obrigatorio. Sem uma amostra da folha, "compila e os testes passam"
 * nao mostrava isso.
 *
 * Fora do build: `index.html` aponta so para `main.tsx`.
 */
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Atestado } from './ui/components/Atestado'
import type { OrigemDaCompetencia, RegistroDeCompetencia } from '@faixa-azul/core/domain/competencia'
import { CURRICULO_1GRAU, modulosDoCurriculo } from '@faixa-azul/core/seed/curriculos'
import '@faixa-azul/core/tokens.css'
import './ui/central.css'

function Amostra() {
  const [registros, setRegistros] = useState<RegistroDeCompetencia[]>([])

  return (
    <main className="painel">
      <Atestado
        curriculo={CURRICULO_1GRAU}
        modulos={modulosDoCurriculo('1grau')}
        registros={registros}
        graduacoes={[]}
        meta="1grau"
        turma="RGI"
        origemDoCurriculo="prova"
        idDoCurriculo="1grau"
        aulasCumpridas={null}
        fase="pronta"
        mensagem={null}
        aoAtestar={(e: { itemId: string; competente: boolean; texto: string; origem: OrigemDaCompetencia }) =>
          setRegistros((atuais) => [
            ...atuais,
            {
              id: `r-${e.itemId}-${atuais.length}`,
              itemId: e.itemId,
              competente: e.competente,
              texto: e.texto,
              origem: e.origem,
              professorUid: 'prof',
              registradaEm: new Date().toISOString(),
            },
          ])
        }
        aoConceder={() => undefined}
      />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Amostra />
  </StrictMode>,
)
