/**
 * A grade de um aluno, do lado do professor.
 *
 * GRAVAR E ATO EXPLICITO, e nao salvamento a cada arrasto. Duas razoes:
 *
 * 1. montar uma grade sao dezenas de movimentos, e gravar cada um seria dezenas
 *    de escritas — o aluno veria a grade mudar debaixo dele enquanto o professor
 *    ainda pensa;
 * 2. a grade chegando ao aluno MUDA O APP DELE. Isso merece um momento decidido,
 *    com o professor vendo quantas aulas vao junto.
 *
 * GRAVA SO O QUE MUDOU. `pendentes` compara a atribuicao atual com a que foi
 * carregada; salvar reescreve apenas essas aulas. Reescrever as dez a cada
 * salvamento incrementaria a `versao` da marca de aulas que ninguem tocou, e
 * uma aula sem mudanca nao deveria ganhar procedencia nova.
 *
 * DE ONDE A GRADE E CARREGADA, e a ordem importa: de `grades/` quando ha algo
 * la, e do ESTADO DO ALUNO quando nao ha. O segundo caso existe porque grades
 * montadas antes desta tela viajaram por arquivo e vivem no estado dele —
 * comecar do zero as apagaria no primeiro salvamento.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FirebaseApp } from 'firebase/app'
import { abrirGrades } from '@faixa-azul/core/nuvem/grades'
import type { Grades } from '@faixa-azul/core/nuvem/grades'
import { atribuir, TOTAL_DE_AULAS } from '@faixa-azul/core/application/montagem'
import type { Atribuicao } from '@faixa-azul/core/application/montagem'
import type { AlteracaoAula, EstadoPersistido } from '@faixa-azul/core/persistence/repositorio'

/** `itemIds` por aula, ignorando aulas sem itens definidos. */
function comoAtribuicao(aulas: readonly AlteracaoAula[]): Map<number, string[]> {
  const mapa = new Map<number, string[]>()
  for (const a of aulas) {
    if (a.itemIds !== undefined) mapa.set(a.numero, [...a.itemIds])
  }
  return mapa
}

function iguais(a: readonly string[] | undefined, b: readonly string[] | undefined): boolean {
  if (a === undefined || b === undefined) return a === b
  if (a.length !== b.length) return false
  return a.every((x, i) => x === b[i])
}

export type FaseDaGrade = 'carregando' | 'pronta' | 'salvando' | 'erro'

export function useGrade({
  app,
  alunoUid,
  estadoDoAluno,
}: {
  app: FirebaseApp
  alunoUid: string
  /** `null` quando o aluno nunca sincronizou: nao ha grade anterior para herdar. */
  estadoDoAluno: EstadoPersistido | null
}) {
  const [fase, setFase] = useState<FaseDaGrade>('carregando')
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [atribuicao, setAtribuicao] = useState<Atribuicao>(new Map())
  /** O que esta gravado na nuvem, para saber o que ainda nao esta. */
  const [salvo, setSalvo] = useState<Map<number, string[]>>(new Map())
  const grades = useRef<Grades | null>(null)

  const obter = useCallback(async () => {
    if (!grades.current) grades.current = await abrirGrades(app)
    return grades.current
  }, [app])

  useEffect(() => {
    let cancelado = false
    void (async () => {
      setFase('carregando')
      setMensagem(null)
      try {
        const g = await obter()
        const daNuvem = await g.lerGrade(alunoUid)
        if (cancelado) return

        // Grade montada antes desta tela viajou por arquivo e vive no estado do
        // aluno. Herdar dela evita apagar o trabalho de antes.
        const base =
          daNuvem.length > 0
            ? comoAtribuicao(daNuvem)
            : comoAtribuicao(estadoDoAluno?.aulas ?? [])

        setAtribuicao(new Map(base))
        // `salvo` reflete o que a NUVEM tem. Herdar do estado do aluno nao conta
        // como gravado — se contasse, o botao diria "nada a salvar" com a nuvem
        // vazia, e a grade nunca chegaria de volta ao aluno.
        setSalvo(daNuvem.length > 0 ? new Map(base) : new Map())
        setFase('pronta')
      } catch (e) {
        if (cancelado) return
        setFase('erro')
        setMensagem((e as Error)?.message ?? 'Não foi possível ler a grade.')
      }
    })()
    return () => {
      cancelado = true
    }
  }, [obter, alunoUid, estadoDoAluno])

  /** Aulas cuja lista difere do que esta na nuvem. */
  const pendentes = useMemo(() => {
    const numeros: number[] = []
    for (let n = 1; n <= TOTAL_DE_AULAS; n += 1) {
      const agora = atribuicao.get(n)
      const antes = salvo.get(n)
      // Aula que nunca teve itens e continua sem: nada pendente.
      if (agora === undefined && antes === undefined) continue
      if (!iguais(agora, antes)) numeros.push(n)
    }
    return numeros
  }, [atribuicao, salvo])

  const mover = useCallback((itemId: string, aula: number | null) => {
    setAtribuicao((a) => atribuir(a, itemId, aula))
  }, [])

  const salvar = useCallback(async () => {
    if (pendentes.length === 0) return
    setFase('salvando')
    setMensagem(null)
    try {
      const g = await obter()
      const agora = new Date()
      for (const numero of pendentes) {
        // `?? []` e deliberado: uma aula esvaziada grava lista VAZIA, que
        // significa "tirei tudo dela" — diferente de nunca montada.
        await g.gravarAula(alunoUid, { numero, itemIds: [...(atribuicao.get(numero) ?? [])] }, agora)
      }
      setSalvo(new Map([...atribuicao].map(([n, ids]) => [n, [...ids]])))
      setFase('pronta')
      setMensagem(
        `Gravado. ${pendentes.length === 1 ? 'A aula chega' : 'As aulas chegam'} no app dele na próxima sincronização.`,
      )
    } catch (e) {
      setFase('erro')
      setMensagem((e as Error)?.message ?? 'Não foi possível gravar a grade.')
    }
  }, [pendentes, obter, alunoUid, atribuicao])

  return { fase, mensagem, atribuicao, pendentes, mover, salvar }
}
