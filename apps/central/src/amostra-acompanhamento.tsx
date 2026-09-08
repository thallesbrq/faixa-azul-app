/**
 * AMOSTRA da matriz de acompanhamento, sem rede e com data fixa.
 *
 * POR QUE ELA EXISTE, e a licao e recente: a folha do atestado nao tinha amostra,
 * e a falta dela deixou passar um defeito que "compila e 741 testes passam" nao
 * mostrava. Toda tela desta Central que ninguem consegue abrir sem sessao de
 * professor precisa de uma pagina assim, ou a unica verificacao possivel e a
 * confianca.
 *
 * ---------------------------------------------------------------------------
 * O PROGRAMA AQUI E UM RETRATO DO PROGRAMA REAL DA RGI em 08/09/2026, e nao um
 * exemplo inventado. Isso importa porque o defeito que esta tela tinha SO aparece
 * na forma que o dado de producao tem:
 *
 *   - a aula 1 (ja dada) contem ids de AZUL, nao os `g1-*` que a matriz conta;
 *   - `g1-quedas--osoto-gari` esta numa aula LA NA FRENTE e sem data, enquanto
 *     `quedas--o-soto-gari` ja foi dado na aula 1. Nenhum teste inventado tinha
 *     essa forma, e foi ela que derrubou a primeira versao da regra.
 *
 * A unica divergencia deliberada esta em `ukemi-lateral`, deixado FORA do
 * programa para a tela mostrar o estado "falta parte · 2 de 3 partes" — que na
 * producao de hoje nao acontece e sem o qual esse caminho de renderizacao nao
 * teria como ser conferido.
 * ---------------------------------------------------------------------------
 *
 * Fora do build: `index.html` aponta so para `main.tsx`.
 */
import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { montarAcompanhamento } from '@faixa-azul/core/application/acompanhamento'
import type { ParaAtestar } from '@faixa-azul/core/application/acompanhamento'
import type { RegistroDeCompetencia } from '@faixa-azul/core/domain/competencia'
import { CURRICULO_1GRAU } from '@faixa-azul/core/seed/curriculos'
import { MODULOS_1GRAU } from '@faixa-azul/core/seed/primeiro-grau'
import { equivalentesDe } from '@faixa-azul/core/seed/equivalencia-1grau'
import { Acompanhamento } from './ui/components/Acompanhamento'
import '@faixa-azul/core/tokens.css'
import './ui/central.css'

/** 08/09/2026, o dia em que o defeito foi medido. Fixo: a tela e deterministica. */
const HOJE = new Date(2026, 8, 8, 12)

const AULAS = [
  /**
   * A AULA JA DADA, com ids de azul — o coracao do defeito. Ela ensinou tres
   * requisitos do 1o grau (rolamentos, fuga de quadril, o soto gari) e a matriz
   * dizia "0 de 29 itens ja foram dados em aula".
   */
  {
    numero: 1,
    slot: '2026-09-08T0800',
    itemIds: [
      'base-movimentacao--rolamento-para-frente',
      'base-movimentacao--rolamento-para-tras',
      'base-movimentacao--fuga-de-quadril-tradicional',
      'quedas--o-soto-gari',
      // Duas das tres partes do Ukemi. A terceira (`ukemi-lateral`) fica fora de
      // proposito: e o que produz "falta parte · 2 de 3 partes".
      'base-movimentacao--ukemi-frente',
      'base-movimentacao--ukemi-costas',
    ],
  },
  /** Aula futura com o requisito E o gemeo de azul juntos — como na producao. */
  {
    numero: 2,
    slot: '2026-09-10T0800',
    itemIds: [
      'g1-edu--levantada-tecnica',
      'base-movimentacao--levantada-tecnica',
      'quedas--single-leg',
    ],
  },
  { numero: 5, slot: '2026-09-22T0800', itemIds: ['g1-quedas--double-leg'] },
  /**
   * O REQUISITO SEM DATA, DEPOIS DE O GEMEO JA TER SIDO DADO. Esta linha e o
   * teste de regressao da tela: se a regra voltar a dar precedencia ao id
   * proprio, "Osoto gari" volta a aparecer como aula 15 e nao ensinado.
   */
  { numero: 15, slot: '', itemIds: ['g1-quedas--osoto-gari'] },
]

const ALUNOS = [
  { uid: 'demo-aluno-1grau', nome: 'Aluno Demo' },
  { uid: 'willian', nome: 'Willian' },
]

function Amostra() {
  const [porAluno, setPorAluno] = useState<Map<string, RegistroDeCompetencia[]>>(() => new Map())

  const dados = useMemo(
    () =>
      montarAcompanhamento({
        turma: 'RGI',
        alunos: ALUNOS,
        itens: CURRICULO_1GRAU.itens,
        modulos: MODULOS_1GRAU,
        aulas: AULAS,
        registrosPorAluno: porAluno,
        hoje: HOJE,
        equivalentes: equivalentesDe,
      }),
    [porAluno],
  )

  /** Grava em memoria o que a Central gravaria em `competencias`. */
  const atestar = (pares: readonly ParaAtestar[]) => {
    setPorAluno((atuais) => {
      const novo = new Map(atuais)
      for (const p of pares) {
        const lista = novo.get(p.alunoUid) ?? []
        novo.set(p.alunoUid, [
          ...lista,
          {
            id: `r-${p.itemId}-${lista.length}`,
            itemId: p.itemId,
            competente: true,
            texto: 'RGI · 08/09/2026',
            origem: 'aula_regular',
            professorUid: 'prof',
            registradaEm: new Date().toISOString(),
          },
        ])
      }
      return novo
    })
  }

  return (
    <main className="painel">
      <Acompanhamento dados={dados} gravando={false} aoAtestar={(pares) => atestar(pares)} />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Amostra />
  </StrictMode>,
)
