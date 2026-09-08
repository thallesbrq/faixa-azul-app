/**
 * AMOSTRA: monta o planner com o seed real, sem rede e sem login.
 *
 * POR QUE ISTO EXISTE. A Central so abre com sessao de professor, e a sessao vem
 * de um link magico no e-mail — nao ha como eu abrir a tela para conferir o
 * layout. Sem esta pagina, a unica verificacao possivel seria "compila e os
 * testes passam", que nao diz nada sobre 81 caixas numa grade.
 *
 * MONTA O `usePrograma` DE VERDADE, e essa mudanca e a correcao de uma falha do
 * proprio metodo de verificacao. A primeira versao chamava `montarPlanner` direto
 * com `useState` — ela exercitava o COMPONENTE e nunca o HOOK. Foi por isso que um
 * laco infinito no hook (array novo a cada render fechando a cadeia
 * `desenhar -> carregar -> useEffect -> setEstado`) passou por 658 testes, por uma
 * inspecao nesta tela, e chegou a producao piscando.
 *
 * Agora o hook roda contra uma loja EM MEMORIA que implementa a mesma interface
 * `Programas`. O que passa a ser exercitado: o carregamento, o `useMemo` do
 * planner, a gravacao aula por aula, o lote do "aplicar sugestao" e o caminho de
 * erro. Sem Firebase.
 *
 * USA O SEED DE VERDADE (`CURRICULO_AZUL`, `ITENS_1GRAU`), e nao dados
 * inventados: o que quebra num planner e a quantidade real — 81 itens no bolsao,
 * 12 grupos, 25 aulas preenchidas com nomes de tamanho real.
 *
 * Nao entra no build: `index.html` aponta so para `main.tsx`.
 */

import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { FirebaseApp } from 'firebase/app'
import { Planner } from './ui/Planner'
import { usePrograma } from './ui/usePrograma'
import type { Programas } from '@faixa-azul/core/nuvem/programas'
import type { AulaDoPrograma } from '@faixa-azul/core/application/programa'
import { CURRICULO_AZUL } from '@faixa-azul/core/seed/curriculos'
import { ITENS_1GRAU } from '@faixa-azul/core/seed/primeiro-grau'
import '@faixa-azul/core/tokens.css'
import './ui/central.css'

const ITENS_DO_BOLSAO = CURRICULO_AZUL.itens
/** Fixado na carga do modulo: `new Date()` por render alimenta laco de render. */
const HOJE = new Date()

/** Loja em memoria com a interface da nuvem. Mesmo contrato, zero rede. */
function lojaEmMemoria(): Programas {
  const guardadas = new Map<number, AulaDoPrograma>()
  return {
    async aulasDe() {
      return [...guardadas.values()]
    },
    async gravarAula(_turma, aula) {
      guardadas.set(aula.numero, aula)
    },
    async gravarVarias(_turma, aulas) {
      for (const a of aulas) guardadas.set(a.numero, a)
    },
  }
}

function Amostra() {
  /**
   * A loja em memoria, criada UMA VEZ.
   *
   * `useMemo(() => lojaEmMemoria(), [])` e nao `useMemo(lojaEmMemoria, [])`: a
   * segunda forma faz o oxlint enxergar o corpo da fabrica como corpo do memo e
   * exigir as variaveis internas dela como dependencias. Passar a fabrica como
   * callback direto e o tipo de atalho que o linter tem razao em recusar.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps -- a loja nao depende de nada
  const loja = useMemo(() => lojaEmMemoria(), [])
  const app = useMemo(() => ({}) as FirebaseApp, [])

  /**
   * CONTADOR DE RENDERS, visivel na tela.
   *
   * E o instrumento que faltava: um laco de render nao da erro, nao aparece no
   * console e nao quebra teste — ele so pisca. Um numero que sobe sozinho e a
   * unica forma de ver o defeito parado.
   */
  const renders = useRenders()

  const programa = usePrograma({
    app,
    turma: 'RGI',
    itensDoBolsao: ITENS_DO_BOLSAO,
    /**
     * AS DUAS INSTABILIDADES DE PROPOSITO, e esta e a razao de ser desta pagina.
     *
     * `itensConhecidos` e um array novo a cada render, e `abrir` e uma funcao
     * nova a cada render — exatamente as duas formas que fecharam o laco
     * infinito que chegou a producao. Passa-las estaveis aqui verificaria uma
     * variante mais gentil do que `App.tsx` faz, e foi assim que o defeito
     * escapou na primeira vez.
     *
     * O contador de renders no canto e o instrumento: se o numero subir sozinho,
     * o laco voltou. Medido: com `abrir` dentro das dependencias do efeito, ele
     * ia a ~85 renders por segundo; com ele numa ref, para em 4 (o StrictMode
     * duplica os 2 logicos).
     */
    itensConhecidos: [...CURRICULO_AZUL.itens, ...ITENS_1GRAU],
    itensDo1Grau: ITENS_1GRAU,
    abrir: async () => loja,
  })

  if (programa.estado.fase === 'carregando' || programa.estado.planner === null) {
    return <p style={{ padding: 24 }}>Abrindo…</p>
  }

  return (
    <>
      <p
        id="contador-de-renders"
        style={{
          position: 'fixed',
          right: 8,
          bottom: 8,
          zIndex: 99,
          margin: 0,
          padding: '4px 10px',
          background: '#111214',
          color: '#fff',
          borderRadius: 999,
          fontSize: 12,
          fontFamily: 'monospace',
        }}
      >
        renders: {renders}
      </p>
      <Planner
        planner={programa.estado.planner}
        turma="RGI"
        gravando={programa.estado.gravando}
        mensagem={programa.estado.mensagem}
        aoVoltar={() => undefined}
        aoAplicarSugestao={() => void programa.aplicarSugestao()}
        aoPorItem={(n, id) => void programa.porItem(n, id)}
        aoTirarItem={(n, id) => void programa.tirarItem(n, id)}
        aoAcrescentarRotulo={(n, r) => void programa.acrescentarRotulo(n, r)}
        aoRemoverRotulo={(n, id) => void programa.removerRotulo(n, id)}
        aoMudarFoco={(n, f) => void programa.mudarFoco(n, f)}
        aoDesignar={(n, slotId) => void programa.agendar(n, slotId)}
        aoDesagendar={(n) => void programa.desagendar(n)}
        hoje={HOJE}
      />
    </>
  )
}

/** Conta renders sem provocar render — por isso `useState` com um objeto mutavel. */
function useRenders(): number {
  const [caixa] = useState(() => ({ n: 0 }))
  caixa.n += 1
  return caixa.n
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Amostra />
  </StrictMode>,
)
