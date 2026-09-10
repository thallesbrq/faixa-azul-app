/**
 * DIAGNOSTICO: monta a arvore REAL da Central, com sessao de mentira.
 *
 * POR QUE ESTA PAGINA EXISTE, e ela e resposta a uma falha minha e nao a um
 * pedido: a Central so abre com sessao de professor. A pagina de `amostra`
 * montava apenas o componente `Planner`, e por isso um laco infinito no
 * `usePrograma` passou por 658 testes, por uma inspecao na tela E por um deploy.
 * Verificar a folha nao verifica a arvore.
 *
 * Aqui monta-se `Central` INTEIRO — a rota, os quatro `useMemo`, `useLinhas`, o
 * `PlannerDaTurma` e o `usePrograma` — contra uma sessao e uma camada de dados de
 * mentira. O que NAO e de mentira e o codigo sob teste.
 *
 * `useLinhas` vai falhar (o `app` falso nao abre Firestore) e cair em
 * `fase: 'erro'`. Isso e proposital: o laco que procuramos esta na arvore, nao no
 * sucesso da leitura, e um erro tratado e mais parecido com produção ruim do que
 * um caminho felizmente mockado.
 *
 * O CONTADOR DE RENDERS no canto e o instrumento. Laco de render nao da erro, nao
 * aparece no console e nao quebra teste — so pisca.
 *
 * Nao entra no build: `index.html` aponta so para `main.tsx`.
 */

import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { FirebaseApp } from 'firebase/app'
import { Central } from './ui/App'
import { CONTADORES, observarMutacoes, totalDeMutacoes } from './ui/diagnostico'
import type { Cadastro, Convite, Dados } from '@faixa-azul/core/nuvem/pessoas'

/**
 * A rota vem do CAMINHO, entao o caminho e trocado antes de montar.
 *
 * `useRota` le `window.location.pathname` no inicializador do `useState`. Sem
 * este `replaceState`, a pagina cairia na tabela de turmas e nao no planner —
 * exatamente a tela que nao esta piscando.
 */
const ALVO = new URLSearchParams(window.location.search).get('rota') ?? '/central/turma/RGI'
window.history.replaceState({}, '', ALVO)

const CADASTRO: Cadastro = {
  uid: 'diag-professor',
  nome: 'Diagnóstico',
  papel: 'professor',
  academiaId: 'rilion-garopaba',
  ativo: true,
  turma: '',
  meta: '',
  estuda: '',
  temParticulares: false,
  demo: false,
  aulasDoGrau: 0,
}

/** Camada de dados de mentira, com a interface `Dados` inteira. */
const DADOS: Dados = {
  async cadastroDe() {
    return CADASTRO
  },
  async criarDoConvite() {
    return CADASTRO
  },
  async convidar() {},
  async listarConvites(): Promise<Convite[]> {
    return []
  },
  async cancelarConvite() {},
  async listarPessoas() {
    return [CADASTRO]
  },
  async atualizarNome() {},
  async atualizarTurma() {},
  async atualizarMeta() {},
  async atualizarEstuda() {},
  async atualizarParticulares() {},
  async atualizarAulasDoGrau() {},
}

/**
 * A SESSAO E UMA CONSTANTE DE MODULO, e nao um objeto no corpo do componente.
 *
 * `sessao.app` entra nas dependencias de todo efeito de carga da arvore. Um
 * objeto novo a cada render dispararia o laco que esta pagina existe para
 * detectar, e o diagnostico acusaria a si mesmo.
 */
const SESSAO = {
  fase: 'pronto' as const,
  sessao: { uid: 'diag-professor', email: 'diag@exemplo.test' },
  cadastro: CADASTRO,
  dados: DADOS,
  app: {} as FirebaseApp,
}

function Diagnostico() {
  const renders = useRenders()
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
      <Central sessao={SESSAO} aoSair={() => undefined} />
    </>
  )
}

/**
 * Conta renders do PAI, e por isso o numero pode ficar parado enquanto um filho
 * gira. O contador da arvore de verdade fica no `MutationObserver` abaixo.
 */
function useRenders(): number {
  const [caixa] = useState(() => ({ n: 0 }))
  caixa.n += 1
  return caixa.n
}

/**
 * CONTADOR DE MUTACOES DO DOM, e nao so de renders do componente de topo.
 *
 * Um laco dentro de `PlannerDaTurma` nao renderiza o pai — e o contador de cima
 * ficaria em 2 enquanto a tela pisca. Mutacao no DOM e o que o olho ve, e e o
 * que "piscando" descreve.
 */
observarMutacoes()
;(window as unknown as { medir: () => unknown }).medir = () => ({
  ...CONTADORES,
  mutacoesDoDom: totalDeMutacoes(),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Diagnostico />
  </StrictMode>,
)
