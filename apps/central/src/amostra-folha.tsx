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

/** Um registro de atestacao, como o `useAtestado` devolveria. */
const atestacao = (itemId: string, n: number): RegistroDeCompetencia => ({
  id: `r-${itemId}-${n}`,
  itemId,
  competente: true,
  texto: 'RGI · 08/09/2026',
  origem: 'aula_regular',
  professorUid: 'prof',
  registradaEm: '2026-09-08T11:00:00.000Z',
})

function Amostra() {
  const [registros, setRegistros] = useState<RegistroDeCompetencia[]>([])

  /**
   * ATALHO PARA O ESTADO "APTO", e ele existe porque sem atalho a unica forma de
   * conferir o selo verde e o bloco de conceder e clicar 29 vezes. Foi
   * exatamente esse custo que deixou o defeito do campo obrigatorio escapar: a
   * tela nao era aberta porque abrir era caro.
   */
  const atestarTudo = () =>
    setRegistros(CURRICULO_1GRAU.itens.map((i, n) => atestacao(i.id, n)))

  return (
    <main className="painel">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className="botao botao--pequeno" onClick={atestarTudo}>
          atestar os 29 (ver o estado “apto”)
        </button>
        <button className="botao botao--pequeno botao--secundario" onClick={() => setRegistros([])}>
          limpar
        </button>
      </div>

      <Atestado
        curriculo={CURRICULO_1GRAU}
        modulos={modulosDoCurriculo('1grau')}
        registros={registros}
        graduacoes={[]}
        meta="1grau"
        turma="RGI"
        origemDoCurriculo="prova"
        idDoCurriculo="1grau"
        /* 12 de 35: o caso que a linha das aulas existe para mostrar — apto pelas
           competencias com a turma no meio do caminho. */
        aulasCumpridas={12}
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
