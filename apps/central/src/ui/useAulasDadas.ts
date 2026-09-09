/**
 * Quantas aulas a TURMA ja deu — as do programa com data no passado.
 *
 * ---------------------------------------------------------------------------
 * POR QUE ISTO EXISTE, e a razao e o fim de uma espera. `aulasCumpridas` chegava
 * `null` na folha do atestado, e o comentario dizia "o app ainda nao conta
 * presenca (fatia 3)". Em 09/09/2026 o professor descartou presenca: "nao vamos
 * nos preocupar com a presenca agora, o sistema que temos de validar se o aluno
 * tem a competencia ja resolve". Sem presenca, "aulas cumpridas POR ALUNO" nunca
 * sera calculavel — o `null` deixou de ser "ainda nao" e virou "nunca".
 *
 * O que E calculavel e a contagem da TURMA, e ela e util: 29 de 29 competencias
 * atestadas com 3 aulas dadas e uma combinacao que merece um segundo olhar, e
 * hoje a folha nao da esse sinal nenhum.
 *
 * NAO E PORTAO, E CONTEXTO. As aulas nao condicionam a aptidao — palavras dele:
 * "pode acontecer de um aluno se destacar e conseguir estar apto ao grau antes do
 * tempo, mas nao e regra, e algo esporadico". Ver `aptidaoAoGrau`.
 * ---------------------------------------------------------------------------
 *
 * HOOK PROPRIO E NAO UMA LEITURA NO `Central`, pelo mesmo motivo de
 * `AcompanhamentoDaTurma` e `GradeDaTurma`: um hook posto no componente de cima
 * "por enquanto" faria esta leitura acontecer em TODA abertura da Central,
 * inclusive na visao "Todas as turmas", onde nao ha folha nenhuma aberta.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FirebaseApp } from 'firebase/app'
import { comoDataLocal, partesDoSlot } from '@faixa-azul/core/application/agenda'
import { abrirProgramas } from '@faixa-azul/core/nuvem/programas'
import type { Programas } from '@faixa-azul/core/nuvem/programas'

/**
 * A data de hoje, uma vez por carregamento do modulo.
 *
 * MESMO PADRAO DE `HOJE` EM `App.tsx`, e pelo mesmo motivo: `new Date()` dentro
 * do corpo do componente e um valor novo a cada render, e ja foi essa classe de
 * instabilidade que fez a tela piscar em producao. Uma sessao aberta por mais de
 * um dia contaria a virada com um dia de atraso — custo aceitavel diante de um
 * laco de render.
 */
const LIMITE = comoDataLocal(new Date())

export function useAulasDadas({ app, turma }: { app: FirebaseApp; turma: string }): number | null {
  /**
   * `null` cobre TRES situacoes que a tela trata igual — e trata igual de
   * proposito: carregando, falhou a leitura, e turma sem programa. Nos tres a
   * resposta honesta e "o app nao sabe", que e o que a folha ja diz. Distinguir
   * "lendo" de "falhou" aqui poria um estado de carregamento numa linha de apoio
   * que ninguem esta esperando.
   */
  const [dadas, setDadas] = useState<number | null>(null)
  const programas = useRef<Programas | null>(null)

  const carregar = useCallback(async () => {
    try {
      if (!programas.current) programas.current = await abrirProgramas(app)
      const aulas = await programas.current.aulasDe(turma)
      /**
       * CONTA AULA COM DATA JA PASSADA, e nao `aulas.length`.
       *
       * O programa da RGI tem 25 aulas montadas e 5 com data. Contar as montadas
       * diria "25 de 35 aulas dadas" numa turma que comecou anteontem — e o
       * numero apareceria ao lado de "apto ao 1o grau", dando ao professor
       * exatamente a confirmacao errada.
       *
       * Comparacao de TEXTO `YYYY-MM-DD`, igual ao resto do app: a aula das 8h
       * conta como dada no proprio dia.
       */
      let n = 0
      for (const a of aulas) {
        const p = partesDoSlot(a.slot)
        if (p !== null && p.data <= LIMITE) n += 1
      }
      setDadas(n)
    } catch {
      // Falha de leitura fica `null`: a folha diz "o app nao conta isso, confira
      // voce", que e verdade. Zero seria uma afirmacao — "esta turma nunca teve
      // aula" — sobre uma turma que pode ter tido quarenta.
      setDadas(null)
    }
  }, [app, turma])

  useEffect(() => {
    void carregar()
  }, [carregar])

  return dadas
}
