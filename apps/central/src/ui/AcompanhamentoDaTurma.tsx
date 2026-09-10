/**
 * Junta programa + competencias + alunos na matriz de acompanhamento.
 *
 * COMPONENTE PROPRIO pelo mesmo motivo de `GradeDaTurma` e `PlannerDaTurma`: ele
 * le duas colecoes (o programa da turma e as competencias de cada aluno), e
 * chamar esses hooks no `Central` faria a leitura acontecer em TODA abertura da
 * Central — inclusive na visao "Todas as turmas", onde nao ha turma para
 * acompanhar. A regra dos hooks ja me pegou quatro vezes neste app, e tres delas
 * foram um hook novo posto no componente de cima "por enquanto".
 *
 * SO PARA TURMA COM CURRICULO DE ATESTADO. A matriz e sobre os 29 itens do 1o
 * grau; numa turma cujo curriculo e medido por cartoes ela nao tem o que mostrar,
 * e o certo e dizer isso em vez de desenhar uma grade vazia.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FirebaseApp } from 'firebase/app'
import { montarAcompanhamento } from '@faixa-azul/core/application/acompanhamento'
import type { ParaAtestar } from '@faixa-azul/core/application/acompanhamento'
import { procedenciaDaAtestacao } from '@faixa-azul/core/domain/competencia'
import type { RegistroDeCompetencia } from '@faixa-azul/core/domain/competencia'
import { abrirCompetencias } from '@faixa-azul/core/nuvem/competencias'
import type { Competencias } from '@faixa-azul/core/nuvem/competencias'
import { abrirProgramas } from '@faixa-azul/core/nuvem/programas'
import type { Programas } from '@faixa-azul/core/nuvem/programas'
import type { AulaDoPrograma } from '@faixa-azul/core/application/programa'
import { CURRICULO_1GRAU, curriculoPorId } from '@faixa-azul/core/seed/curriculos'
import { MODULOS_1GRAU } from '@faixa-azul/core/seed/primeiro-grau'
import { equivalentesDe } from '@faixa-azul/core/seed/equivalencia-1grau'
import { Acompanhamento } from './components/Acompanhamento'

/** Listas vazias FIXAS: `?? []` a cada render alimenta laco de dependencia. */
const SEM_AULAS: readonly AulaDoPrograma[] = []

export interface AlunoDaTurma {
  uid: string
  nome: string
  /** O curriculo que ele estuda — decide o que o app ensina, e nao a matriz. */
  estuda: string
  /** A PROVA que ele persegue — e ela que decide se ele entra na matriz. */
  meta: string
}

export function AcompanhamentoDaTurma({
  app,
  turma,
  alunos,
  professorUid,
  hoje,
}: {
  app: FirebaseApp
  turma: string
  alunos: readonly AlunoDaTurma[]
  professorUid: string
  hoje: Date
}) {
  const [aulas, setAulas] = useState<readonly AulaDoPrograma[]>(SEM_AULAS)
  const [registros, setRegistros] = useState<ReadonlyMap<string, readonly RegistroDeCompetencia[]>>(
    () => new Map(),
  )
  const [fase, setFase] = useState<'carregando' | 'pronto' | 'erro'>('carregando')
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [gravando, setGravando] = useState(false)

  const programas = useRef<Programas | null>(null)
  const comps = useRef<Competencias | null>(null)

  /**
   * OS ALUNOS QUE ENTRAM NA MATRIZ, e nao todos os da turma.
   *
   * ---------------------------------------------------------------------------
   * A CHAVE E `meta` E NAO `estuda`, e eu tinha escrito o contrario aqui.
   *
   * O comentario antigo dizia: "e o curriculo que decide o que ele treina. Um
   * aluno com `meta: '1grau'` e `estuda: '1grau'` entra; o Floki, com `estuda:
   * 'azul'`, fica fora — ele nao esta aprendendo os 29". Isso confundia duas
   * perguntas diferentes:
   *
   *   `estuda` -> QUAL CONTEUDO o app ensina, e como medir o progresso dele
   *   `meta`   -> QUAL PROVA ele persegue, e portanto qual e o PORTAO
   *
   * Esta matriz e sobre o PORTAO. Quem persegue o 1o grau precisa das 29
   * atestacoes, e isso vale independentemente de estudar a lista dos 29 ou o
   * curriculo de azul — o conteudo das 35 aulas esta dentro do de azul.
   *
   * O ERRO FICOU VISIVEL EM 10/09/2026, quando o Henrique entrou de verdade.
   * Com `estuda: '1grau'` o app nao tinha o que ensinar a ele (os 29 itens vem
   * sem passo a passo, entao geram ~18 cartoes de classificacao e nenhum de
   * execucao). A correcao foi po-lo em `estuda: 'azul'` como o Floki — e com o
   * filtro antigo ele SAIRIA desta matriz no mesmo instante, deixando o professor
   * sem a tela de acompanhamento do aluno que ela existe para acompanhar.
   *
   * `curriculoPorId(meta)?.medida === 'atestado'` E NAO `meta === '1grau'`: e a
   * mesma forma que `useLinhas` usa para decidir a medida do progresso, e pelo
   * mesmo motivo — cravar a meta funcionaria hoje e erraria em silencio no dia em
   * que o 2o grau chegasse.
   *
   * LIMITE CONHECIDO: a matriz mede contra `CURRICULO_1GRAU` fixo. Hoje ele e o
   * unico curriculo medido por atestado, entao o filtro e a medida coincidem. No
   * dia em que a lista do 2o grau chegar, uma turma com alunos dos dois graus
   * precisara de uma matriz por meta — e este filtro passaria a juntar gente
   * medida contra a lista errada.
   * ---------------------------------------------------------------------------
   */
  const daMatriz = useMemo(
    () => alunos.filter((a) => curriculoPorId(a.meta)?.medida === 'atestado'),
    [alunos],
  )
  const uids = useMemo(() => daMatriz.map((a) => a.uid).join('|'), [daMatriz])

  const carregar = useCallback(async () => {
    setFase('carregando')
    setMensagem(null)
    try {
      if (!programas.current) programas.current = await abrirProgramas(app)
      const doPrograma = await programas.current.aulasDe(turma)

      if (!comps.current) comps.current = await abrirCompetencias(app)
      const lista = uids === '' ? [] : uids.split('|')
      const pares = await Promise.all(
        lista.map(async (uid) => {
          try {
            return [uid, await comps.current!.registrosDe(uid)] as const
          } catch {
            /**
             * FALHA DE UM ALUNO NAO DERRUBA A MATRIZ, e entra como lista VAZIA —
             * que a tela mostra como "pendente". Isso e conservador na direcao
             * certa: mostrar pendente o que talvez esteja atestado faz o professor
             * conferir; o contrario o faria concluir que ja marcou.
             */
            return [uid, [] as RegistroDeCompetencia[]] as const
          }
        }),
      )
      setAulas(doPrograma)
      setRegistros(new Map(pares))
      setFase('pronto')
    } catch (e) {
      setFase('erro')
      setMensagem((e as Error)?.message ?? 'Não foi possível ler o acompanhamento.')
    }
    // `uids` e uma STRING derivada dos uids, e nao o array: array novo a cada
    // render reabriria o laco que fez a tela piscar em producao.
  }, [app, turma, uids])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const dados = useMemo(
    () =>
      montarAcompanhamento({
        turma,
        alunos: daMatriz,
        itens: CURRICULO_1GRAU.itens,
        modulos: MODULOS_1GRAU,
        aulas,
        registrosPorAluno: registros,
        hoje,
        /**
         * A TABELA DE EQUIVALENCIA ENTRA AQUI, e este e o unico lugar que a
         * conhece.
         *
         * Sem ela a matriz conta ids `g1-*` enquanto o Planner grava ids de azul,
         * e a aula que ensinou rolamentos e fuga de quadril aparece como "0 de 29
         * itens ja foram dados". `montarAcompanhamento` tem como padrao "nenhuma
         * equivalencia" de proposito: o `application` nao deve conhecer o seed de
         * um curriculo.
         */
        equivalentes: equivalentesDe,
      }),
    [turma, daMatriz, aulas, registros, hoje],
  )

  /**
   * A procedencia sai da AULA em que o item foi programado, e nao da data de
   * hoje.
   *
   * "Aula 5 · RGI · 22/09/2026" responde onde o professor viu. Usar a data de
   * hoje para um item da aula 5 dada semana passada gravaria a data em que ele
   * ARRUMOU o registro, e nao a da aula — e seis meses depois isso e a diferenca
   * entre um log que se le e um que confunde.
   */
  /**
   * De onde a procedencia sai: DA MATRIZ, e nao de um calculo proprio.
   *
   * Antes isto refazia a conta com `aulaDeCadaItem(aulas).get(itemId)` — uma
   * segunda implementacao da mesma regra. Com a equivalencia entre curriculos ela
   * passou a estar ERRADA sem dar erro: `g1-edu--rolamentos` nao esta em nenhuma
   * aula pelo proprio id, entao a busca devolvia `undefined` e a atestacao seria
   * gravada sem numero de aula — exatamente para o requisito que a aula 1 ensinou.
   *
   * Ler de `dados` faz a tela e o log concordarem por construcao: a aula que a
   * matriz mostra e a aula que o registro cita, inclusive a regra de que quem
   * completa o requisito e a ULTIMA parte.
   */
  const ondeFoiDado = useMemo(
    () =>
      new Map(
        dados.grupos
          .flatMap((g) => g.itens)
          .map((i) => [i.item.id, { aula: i.aula, data: i.data }] as const),
      ),
    [dados],
  )

  const textoDe = useCallback(
    (itemId: string): string => {
      const onde = ondeFoiDado.get(itemId)
      return procedenciaDaAtestacao({
        turma,
        aula: onde?.aula ?? null,
        data: onde?.data ?? null,
        agora: hoje,
      })
    },
    [ondeFoiDado, turma, hoje],
  )

  const atestar = useCallback(
    async (pares: readonly ParaAtestar[], oQue: string) => {
      if (pares.length === 0) return
      setGravando(true)
      setMensagem(null)
      try {
        if (!comps.current) comps.current = await abrirCompetencias(app)

        /**
         * UM LOTE POR TEXTO DE PROCEDENCIA, e nao um lote so.
         *
         * `atestarEmLote` grava o MESMO texto em todos os pares. Itens de aulas
         * diferentes tem procedencias diferentes, entao agrupar por texto e o que
         * mantem cada registro dizendo a aula certa. Um lote unico com um texto
         * medio gravaria "Aula 5" em item da aula 1.
         */
        const porTexto = new Map<string, ParaAtestar[]>()
        for (const p of pares) {
          const texto = textoDe(p.itemId)
          const lista = porTexto.get(texto)
          if (lista) lista.push(p)
          else porTexto.set(texto, [p])
        }

        for (const [texto, doTexto] of porTexto) {
          await comps.current.atestarEmLote(
            doTexto,
            { competente: true, texto, origem: 'aula_regular', professorUid },
            new Date(),
          )
        }

        await carregar()
        setMensagem(`Atestado: ${oQue}.`)
      } catch (e) {
        setMensagem(
          `Não consegui atestar ${oQue}: ${(e as Error)?.message ?? 'erro'}. Recarregue para ver o que foi salvo.`,
        )
      } finally {
        setGravando(false)
      }
    },
    [app, professorUid, textoDe, carregar],
  )

  if (fase === 'carregando') {
    return (
      <section className="cartao">
        <p className="apoio" style={{ marginBottom: 0 }}>
          Lendo o acompanhamento da turma…
        </p>
      </section>
    )
  }

  if (fase === 'erro') {
    return (
      <section className="cartao">
        <p className="aviso" style={{ marginBottom: 0 }}>
          {mensagem}
        </p>
      </section>
    )
  }

  return (
    <>
      {mensagem && <p className="aviso">{mensagem}</p>}
      <Acompanhamento dados={dados} gravando={gravando} aoAtestar={(p, q) => void atestar(p, q)} />
    </>
  )
}
