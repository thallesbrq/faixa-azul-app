/**
 * A Grade de Horario na pagina da turma, abaixo da rosca de progresso.
 *
 * COMPONENTE PROPRIO pelo mesmo motivo de `PlannerDaTurma`: ele precisa de
 * `usePrograma`, e chamar esse hook no `Central` faria ele ler as 81 aulas do
 * programa em TODA abertura da Central — inclusive na visao "Todas as turmas",
 * onde nao existe programa para ler. Componente proprio monta so quando ha turma
 * selecionada.
 *
 * A REGRA DOS HOOKS JA ME PEGOU QUATRO VEZES neste app, e tres delas foram
 * exatamente esta forma: um hook novo posto no componente de cima "por
 * enquanto".
 */

import { useMemo } from 'react'
import type { FirebaseApp } from 'firebase/app'
import { agendaDoPrograma, proximaAulaSemData, rotuloDaSemana, slotsDaSemana } from '@faixa-azul/core/application/agenda'
import { resumoDasAulas } from '@faixa-azul/core/application/programa'
import { CURRICULO_AZUL } from '@faixa-azul/core/seed/curriculos'
import { ITENS_1GRAU } from '@faixa-azul/core/seed/primeiro-grau'
import type { AulaNoPlanner } from '@faixa-azul/core/application/programa'
import { usePrograma } from './usePrograma'
import { useSemana } from './useSemana'
import { GradeDeHorario } from './components/GradeDeHorario'

/**
 * Constantes de MODULO, e nao expressoes no corpo do componente.
 *
 * Foi uma expressao inline (`[...azul, ...1grau]`) que fechou um laco infinito
 * em producao — a tela piscava sem conteudo. O hook hoje resiste a isso, e estas
 * constantes existem para nao refazer o trabalho a cada render.
 */
const ITENS_CONHECIDOS = [...CURRICULO_AZUL.itens, ...ITENS_1GRAU]

/**
 * A lista vazia de fallback, FIXA.
 *
 * `programa.estado.planner?.aulas ?? []` parece inofensivo e nao e: o `?? []`
 * cria um array NOVO a cada render enquanto o planner nao carregou, e ele entra
 * nas dependencias dos dois `useMemo` abaixo. E exatamente a forma que fechou o
 * laco infinito que chegou a producao e fez a tela piscar.
 *
 * O LINTER PEGOU ESTA — "dependency array that changes every render" — e foi a
 * primeira vez nesta sessao que a ferramenta achou antes de mim. Fica o registro
 * de que o aviso vale mais do que parece.
 */
const SEM_AULAS: readonly AulaNoPlanner[] = []

export function GradeDaTurma({
  app,
  turma,
  hoje,
}: {
  app: FirebaseApp
  turma: string
  hoje: Date
}) {
  const programa = usePrograma({
    app,
    turma,
    itensDoBolsao: CURRICULO_AZUL.itens,
    itensConhecidos: ITENS_CONHECIDOS,
    itensDo1Grau: ITENS_1GRAU,
  })
  const semana = useSemana(hoje)

  const aulas = programa.estado.planner?.aulas ?? SEM_AULAS

  const slots = useMemo(
    () =>
      slotsDaSemana({
        turma,
        domingo: semana.domingo,
        agenda: agendaDoPrograma(aulas),
        hoje,
      }),
    [turma, semana.domingo, aulas, hoje],
  )

  const proxima = useMemo(() => proximaAulaSemData(aulas), [aulas])
  const conteudo = useMemo(() => resumoDasAulas(aulas), [aulas])

  if (programa.estado.fase === 'carregando') {
    return (
      <section className="cartao">
        <p className="apoio" style={{ marginBottom: 0 }}>
          Lendo a grade de horário…
        </p>
      </section>
    )
  }

  if (programa.estado.fase === 'erro') {
    return (
      <section className="cartao">
        <p className="aviso" style={{ marginBottom: 0 }}>
          {programa.estado.mensagem ?? 'Não foi possível ler a grade desta turma.'}
        </p>
      </section>
    )
  }

  return (
    <>
      {programa.estado.mensagem && <p className="aviso">{programa.estado.mensagem}</p>}
      <GradeDeHorario
        turma={turma}
        slots={slots}
        conteudo={conteudo}
        rotulo={rotuloDaSemana(semana.domingo)}
        podeVoltar={semana.podeVoltar}
        podeAvancar={semana.podeAvancar}
        aoVoltar={semana.voltar}
        aoAvancar={semana.avancar}
        aoIrParaHoje={semana.irParaHoje}
        proximaSemData={proxima}
        gravando={programa.estado.gravando}
        aoDesignar={(slotId) => {
          // SEM FOCO, o clique designa a proxima aula sem data. Slot ocupado nao
          // e alvo aqui — ver o comentario em `GradeDeHorario`.
          if (proxima !== null) void programa.agendar(proxima, slotId)
        }}
        aoDesagendar={(numero) => void programa.desagendar(numero)}
      />
    </>
  )
}
