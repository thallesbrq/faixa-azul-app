/**
 * Armazenamento dos alunos na central do professor.
 *
 * UMA CHAVE POR ALUNO, mais um indice leve. O indice existe para a lista da
 * central abrir sem ler vinte estados de 160 KB cada — sem ele, montar a tela
 * custaria 3 MB de JSON.parse a cada abertura.
 *
 * ATRAS DE UMA INTERFACE, de proposito. Hoje isto e `localStorage`, escolhido
 * por ser sincrono e simples. Quando a Fase 3 trouxer um banco, troca-se a
 * implementacao e a Torre nao muda uma linha — e o mesmo motivo pelo qual o
 * dominio nao conhece persistencia.
 *
 * O TETO E REAL E ESTA MEDIDO. `localStorage` costuma dar 5 MB por origem, e
 * um aluno com tres meses de uso ocupa ~160 KB: vinte alunos sao ~3,2 MB. Com
 * entrada gradual isso demora a apertar, mas aperta. Por isso `espacoUsado`
 * existe e por isso a gravacao FALHA ALTO em vez de perder dado em silencio —
 * quota estourada e o unico jeito de a central perder o trabalho de um aluno.
 */

import type { EstadoPersistido } from './repositorio'
import type { Deposito } from './deposito'
import type { ResumoDoAluno } from '../application/torre'

const PREFIXO = 'faixa_azul_aluno_'
const CHAVE_INDICE = 'faixa_azul_torre_indice'

/** Acima disto a central avisa. 5 MB e o teto tipico; 70% e onde da tempo. */
export const LIMITE_DE_ALERTA_BYTES = 3_500_000

export interface RepositorioDeAlunos {
  listar(): ResumoDoAluno[]
  ler(id: string): EstadoPersistido | null
  gravar(estado: EstadoPersistido, resumo: ResumoDoAluno): void
  remover(id: string): void
  espacoUsado(): { bytes: number; alunos: number; apertado: boolean }
}

export class QuotaEstourada extends Error {
  constructor(readonly nome: string) {
    super(
      `Não foi possível guardar ${nome}: o armazenamento do navegador está cheio. ` +
        'Remova um aluno já concluído ou exporte antes de continuar.',
    )
    this.name = 'QuotaEstourada'
  }
}

function chaveDo(id: string): string {
  return PREFIXO + id
}

export function repositorioDeAlunos(deposito: Deposito): RepositorioDeAlunos {
  function lerIndice(): ResumoDoAluno[] {
    const bruto = deposito.ler(CHAVE_INDICE)
    if (!bruto) return []
    try {
      const lido = JSON.parse(bruto) as unknown
      return Array.isArray(lido) ? (lido as ResumoDoAluno[]) : []
    } catch {
      // Indice corrompido nao pode derrubar a central: ele e DERIVADO, e os
      // estados dos alunos continuam intactos nas chaves proprias.
      return []
    }
  }

  function gravarIndice(indice: ResumoDoAluno[]): void {
    deposito.escrever(CHAVE_INDICE, JSON.stringify(indice))
  }

  return {
    listar: lerIndice,

    ler(id) {
      const bruto = deposito.ler(chaveDo(id))
      if (!bruto) return null
      try {
        return JSON.parse(bruto) as EstadoPersistido
      } catch {
        return null
      }
    },

    gravar(estado, resumo) {
      const texto = JSON.stringify(estado)
      try {
        deposito.escrever(chaveDo(resumo.id), texto)
      } catch {
        // Falha ALTO. Guardar meio aluno, ou nao guardar e seguir como se
        // tivesse guardado, e a unica forma de a central perder trabalho sem
        // ninguem notar.
        throw new QuotaEstourada(resumo.nome)
      }

      const indice = lerIndice().filter((r) => r.id !== resumo.id)
      indice.push(resumo)
      try {
        gravarIndice(indice)
      } catch {
        // O estado ja esta salvo; o indice e reconstruivel. Ainda assim avisa,
        // senao o aluno sumiria da lista sem explicacao.
        throw new QuotaEstourada(resumo.nome)
      }
    },

    remover(id) {
      deposito.remover(chaveDo(id))
      gravarIndice(lerIndice().filter((r) => r.id !== id))
    },

    espacoUsado() {
      const indice = lerIndice()
      let bytes = 0
      for (const r of indice) {
        bytes += (deposito.ler(chaveDo(r.id)) ?? '').length
      }
      return { bytes, alunos: indice.length, apertado: bytes >= LIMITE_DE_ALERTA_BYTES }
    },
  }
}
