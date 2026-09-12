/**
 * AMOSTRA da pagina de um aluno na Central, sem rede e sem login.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ELA EXISTE. Em 10/09/2026 o pedido foi: 'na pagina do aluno na central
 * do aluno, troque "0/10 aula do pacote" por "0/35 aulas para seu 1 Grau"'. Eu
 * nao tinha como abrir essa pagina — ela exige sessao de professor e um aluno com
 * dado — e a Central so abre com link magico no e-mail.
 *
 * O RISCO CONCRETO dessa mudanca: trocar so o rotulo poria a contagem das aulas
 * PARTICULARES (o pacote de dez) embaixo de um rotulo de graduacao. Um numero
 * errado sob um rotulo certo e pior que o par errado que estava la, porque parece
 * consertado. Esta pagina mostra as duas contas lado a lado.
 * ---------------------------------------------------------------------------
 *
 * O SELETOR DE META E A FERRAMENTA: com `azul` a prova nao conta aulas
 * (`aulasExigidas` devolve `null`) e o fato TEM DE SUMIR em vez de mostrar
 * "12 / —". Esse e o ramo que ninguem abre.
 *
 * Fora do build: `index.html` aponta so para `main.tsx`.
 */
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Aluno } from './ui/components/Aluno'
import type { LinhaDaCentral } from '@faixa-azul/core/application/central'
import { CURRICULO_AZUL } from '@faixa-azul/core/seed/curriculos'
import { estadoInicial } from '@faixa-azul/core/persistence/repositorio'
import '@faixa-azul/core/tokens.css'
import './ui/central.css'

const AGORA = new Date()

/** O Henrique: 12 aulas, meses parado, dez competencias atestadas. */
const HENRIQUE: LinhaDaCentral = {
  uid: 'u-henrique',
  nome: 'Henrique',
  turma: 'RGI',
  meta: '1grau',
  estuda: 'azul',
  progresso: 10 / 29,
  medidaUsada: 'atestado',
  aptidao: 'faltam-competencias',
  motivo: null,
  faixa: 'media',
  porGrupo: {},
  validado: 0.1,
  aguardandoValidacao: 0.2,
  diasSemEstudar: 90,
  duvidasAbertas: 1,
  // As do PACOTE de particulares — a conta que estava sob o rotulo errado.
  aulasFeitas: 0,
  totalDeAulas: 10,
  // As da GRADUACAO, mantidas pelo professor.
  aulasDoGrau: 12,
  situacao: 'parado',
  demo: false,
  temParticulares: false,
}

function Amostra() {
  const [meta, setMeta] = useState('1grau')
  const [particulares, setParticulares] = useState(false)
  const [aulas, setAulas] = useState(12)

  return (
    <main className="painel">
      <div className="abas-turma" role="tablist" aria-label="Variações">
        {['1grau', '2grau', 'azul'].map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={meta === id}
            className={meta === id ? 'aba-turma aba-turma--ativa' : 'aba-turma'}
            onClick={() => setMeta(id)}
          >
            meta {id}
          </button>
        ))}
        <button
          className={particulares ? 'aba-turma aba-turma--ativa' : 'aba-turma'}
          onClick={() => setParticulares((p) => !p)}
        >
          {particulares ? 'com particulares' : 'sem particulares'}
        </button>
      </div>

      <Aluno
        linha={{ ...HENRIQUE, meta, temParticulares: particulares, aulasDoGrau: aulas }}
        estado={estadoInicial(AGORA)}
        curriculo={CURRICULO_AZUL}
        /* `null` sem particulares — e o que o `App` faz. Passar o no sempre aqui
           esconderia justamente o comportamento que esta amostra verifica. */
        aulas={
          particulares ? <p className="apoio">(as aulas particulares entram aqui)</p> : null
        }
        atestado={<p className="apoio">(a folha do atestado entra aqui)</p>}
        aoVoltar={() => undefined}
        aoTrocarTurma={async () => undefined}
        aoTrocarMeta={async (m) => setMeta(m)}
        aoTrocarEstuda={async () => undefined}
        aoTrocarParticulares={async (t) => setParticulares(t)}
        aoTrocarAulasDoGrau={async (n) => setAulas(n)}
      />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Amostra />
  </StrictMode>,
)
