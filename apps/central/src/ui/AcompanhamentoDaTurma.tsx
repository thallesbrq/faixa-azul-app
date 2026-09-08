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
import { partesDoSlot } from '@faixa-azul/core/application/agenda'
import { aulaDeCadaItem } from '@faixa-azul/core/application/acompanhamento'
import { procedenciaDaAtestacao } from '@faixa-azul/core/domain/competencia'
import type { RegistroDeCompetencia } from '@faixa-azul/core/domain/competencia'
import { abrirCompetencias } from '@faixa-azul/core/nuvem/competencias'
import type { Competencias } from '@faixa-azul/core/nuvem/competencias'
import { abrirProgramas } from '@faixa-azul/core/nuvem/programas'
import type { Programas } from '@faixa-azul/core/nuvem/programas'
import type { AulaDoPrograma } from '@faixa-azul/core/application/programa'
import { CURRICULO_1GRAU } from '@faixa-azul/core/seed/curriculos'
import { MODULOS_1GRAU } from '@faixa-azul/core/seed/primeiro-grau'
import { Acompanhamento } from './components/Acompanhamento'

/** Listas vazias FIXAS: `?? []` a cada render alimenta laco de dependencia. */
const SEM_AULAS: readonly AulaDoPrograma[] = []

export interface AlunoDaTurma {
  uid: string
  nome: string
  /** O curriculo que ele estuda — decide se ele entra na matriz. */
  estuda: string
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
   * A matriz mede os 29 itens do 1o grau. Quem estuda outro curriculo (o Floki
   * estuda azul) nao tem esses itens no caminho dele, e po-lo numa coluna daria
   * 29 traços — uma coluna inteira dizendo "nao se aplica".
   *
   * A CHAVE E `estuda` E NAO `meta`: e o curriculo que decide o que ele treina.
   * Um aluno com `meta: '1grau'` e `estuda: '1grau'` (o caso do Willian e do
   * Henrique) entra; o Floki, com `estuda: 'azul'`, fica fora — e isso e o certo,
   * ele nao esta aprendendo os 29.
   */
  const daMatriz = useMemo(() => alunos.filter((a) => a.estuda === '1grau'), [alunos])
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
  const textoDe = useCallback(
    (itemId: string): string => {
      const aulaDoItem = aulaDeCadaItem(aulas).get(itemId) ?? null
      const slot = aulas.find((a) => a.numero === aulaDoItem)?.slot ?? ''
      return procedenciaDaAtestacao({
        turma,
        aula: aulaDoItem,
        data: partesDoSlot(slot)?.data ?? null,
        agora: hoje,
      })
    },
    [aulas, turma, hoje],
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
