/**
 * AMOSTRA da tela `Hoje` com CADA META, sem rede e sem login.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ELA EXISTE, e o custo de nao existir foi medido. Em 10/09/2026 o
 * Henrique entrou pela primeira vez e viu "44 dias" na contagem grande — a data
 * provisoria de exame de AZUL do dono do app, cravada em `estadoInicial` e
 * herdada por todo aluno novo. A meta dele e o 1o grau, que nao tem data.
 *
 * Ninguem tinha olhado esta tela como um aluno NOVO olha. Este arquivo faz isso
 * ser possivel em dois segundos, e com as duas metas lado a lado — porque o que
 * quebra aqui e o ramo que a gente nao esta olhando.
 * ---------------------------------------------------------------------------
 *
 * Fora do build: `index.html` aponta so para `main.tsx`.
 */
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Hoje } from './ui/screens/Hoje'
import type { FilaDoDia } from '@faixa-azul/core/application/fila'
import { METAS, SEM_META } from '@faixa-azul/core/domain/metas'
import { MODULOS } from '@faixa-azul/core/seed'
import '@faixa-azul/core/tokens.css'
import './ui/app.css'

/** Fila vazia: o caso do aluno novo, que e justamente quem viu o numero errado. */
const FILA: FilaDoDia = { cartoes: [], vencidosTotal: 0, novos: 0, vencidosAdiados: 0 }

const AS_METAS = [SEM_META, ...METAS.map((m) => m.id)]

function Amostra() {
  const [meta, setMeta] = useState<string>('1grau')

  return (
    <div className="app">
      <div className="conteudo">
        {/* O SELETOR E A FERRAMENTA: o defeito estava no ramo que ninguem abria. */}
        <div className="alternador" role="tablist" aria-label="Meta do aluno">
          {AS_METAS.map((id) => (
            <button
              key={id || 'sem'}
              role="tab"
              aria-selected={meta === id}
              className={meta === id ? 'alternador-item alternador-item--ativo' : 'alternador-item'}
              onClick={() => setMeta(id)}
            >
              {id === SEM_META ? 'sem meta' : id}
            </button>
          ))}
        </div>

        <Hoje
          /* 44 dias: exatamente o que o Henrique viu, para o ramo errado ficar
             reconhecivel se ele voltar. */
          diasAteProva={44}
          metaProvisoria
          meta={meta}
          aulasDoGrau={12}
          fila={FILA}
          revisadosHoje={0}
          taxaSemDica={undefined}
          risco={undefined}
          modulos={MODULOS}
          armazenamentoPersistente
          aoComecar={() => undefined}
          resumoTreino={{ sessoes: 0, itensTreinados: 0, itensAtivos: 81, funcionamSobPressao: 0 }}
          aoRegistrarTreino={() => undefined}
        />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Amostra />
  </StrictMode>,
)
