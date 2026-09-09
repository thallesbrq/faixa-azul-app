/**
 * AMOSTRA da tabela de alunos, com uma linha por estado de `Aptidao`.
 *
 * POR QUE ELA EXISTE. A etiqueta "apto ao grau" nasceu em 09/09/2026 e nao havia
 * como olhar para ela: a `Tabela` so e montada pelo `App`, que exige sessao de
 * professor e dados de producao com 29 competencias atestadas. A licao desta
 * sessao foi exatamente essa — a folha do atestado nao tinha amostra, e a falta
 * dela deixou passar um defeito que "compila e os testes passam" nao mostrava. Na
 * matriz de acompanhamento, a amostra pegou dois defeitos de tela na primeira
 * olhada.
 *
 * AS QUATRO LINHAS COBREM OS QUATRO ESTADOS, e nao um exemplo bonito:
 *
 *   apto                 -> etiqueta verde
 *   faltam-competencias  -> nenhuma etiqueta (o estado normal de todo aluno; uma
 *                           etiqueta aqui poria ruido em toda a tabela)
 *   nao-se-aplica        -> nenhuma etiqueta, e e a MAIORIA das linhas: quem
 *                           estuda azul e medido por cartao, e "apto" nao e
 *                           afirmacao que dominio de cartao sustenta
 *   convidado            -> nenhuma etiqueta, e a coluna Progresso mostra `—`
 *
 * Fora do build: `index.html` aponta so para `main.tsx`.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import type { LinhaDaCentral } from '@faixa-azul/core/application/central'
import { Tabela } from './ui/components/Tabela'
import '@faixa-azul/core/tokens.css'
import './ui/central.css'

/** Uma linha com o minimo, para cada caso mudar UMA coisa. */
const base: LinhaDaCentral = {
  uid: 'u',
  nome: '',
  turma: 'RGI',
  meta: '1grau',
  estuda: '1grau',
  progresso: 0,
  medidaUsada: 'atestado',
  aptidao: 'faltam-competencias',
  motivo: null,
  faixa: 'baixa',
  porGrupo: {},
  validado: null,
  aguardandoValidacao: null,
  diasSemEstudar: null,
  duvidasAbertas: 0,
  aulasFeitas: 0,
  totalDeAulas: 0,
  situacao: null,
  demo: false,
  temParticulares: false,
}

const LINHAS: LinhaDaCentral[] = [
  {
    ...base,
    uid: 'willian',
    nome: 'Willian',
    progresso: 1,
    faixa: 'alta',
    aptidao: 'apto',
    situacao: 'em-dia',
  },
  {
    ...base,
    uid: 'henrique',
    nome: 'Henrique',
    progresso: 12 / 29,
    faixa: 'media',
    aptidao: 'faltam-competencias',
    situacao: 'em-dia',
  },
  {
    // Quem estuda azul: medido por CARTAO, e a palavra "apto" nao se aplica.
    ...base,
    uid: 'floki',
    nome: 'Floki Fenrrirson',
    meta: '1grau',
    estuda: 'azul',
    progresso: 0.57,
    medidaUsada: 'cartoes',
    aptidao: 'nao-se-aplica',
    faixa: 'media',
    situacao: 'parado',
    diasSemEstudar: 3,
    demo: true,
  },
  {
    ...base,
    uid: 'roberto@exemplo.com',
    nome: 'Roberto',
    progresso: null,
    medidaUsada: null,
    aptidao: 'nao-se-aplica',
    motivo: 'convidado',
    faixa: null,
  },
]

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="painel">
      <Tabela linhas={LINHAS} grupos={[]} mostrarTurma={false} aoEscolher={() => undefined} />
    </main>
  </StrictMode>,
)
