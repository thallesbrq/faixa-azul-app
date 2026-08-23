/**
 * Persistencia do progresso do aluno.
 *
 * Guarda SOMENTE o que o aluno produziu (revisoes, eventos, validacoes, notas).
 * O curriculo e os cartoes vem do seed versionado e nao sao copiados para o
 * armazenamento — assim uma correcao no seed chega ao aluno sem migracao, e o
 * armazenamento nao envelhece junto com o conteudo.
 *
 * Para entidades que existem no seed mas o aluno modifica (aulas, duvidas),
 * guardamos apenas as ALTERACOES. O merge acontece na leitura.
 *
 * ADR-010: `eventos` e append-only. Nada aqui reescreve historico.
 */

import type {
  Dificuldade,
  ExamPlan,
  PracticeSession,
  ReviewEvent,
  ReviewState,
  TeacherQuestion,
  ValidacaoDoProfessor,
} from '../domain/types'
import type { Deposito } from './deposito'

export const CHAVE = 'faixa_azul_v1'
export const VERSAO_ATUAL = 1

/** Alteracoes do aluno sobre uma aula do seed. */
export interface AlteracaoAula {
  numero: number
  realizadaEm?: string
  notas?: string
}

/**
 * Anotacoes do aluno sobre um item do curriculo.
 *
 * Fica separado do seed pelo mesmo motivo das aulas e validacoes: o curriculo
 * importado nunca e reescrito, e o que o aluno acrescenta e sempre camada por
 * cima. Assim um seed corrigido depois nao apaga o trabalho dele.
 *
 * `video` e o video que o ALUNO escolheu, diferente do `busca` do conteudo — o
 * seed traz um termo de busca no YouTube, e este campo guarda o link fixo da
 * versao que ele decidiu usar como referencia.
 */
export interface AlteracaoItem {
  itemId: string
  dificuldade?: Dificuldade
  video?: string
  /** Titulo do video, para a tela nao mostrar so uma URL crua. */
  videoTitulo?: string
  anotacao?: string
}

/** Alteracoes do aluno sobre uma duvida do seed. */
export interface AlteracaoDuvida {
  id: string
  status: TeacherQuestion['status']
  resposta?: string
  respondidaNaAulaNumero?: number
  respondidaAt?: string
}

export interface Config {
  /** Spec 10: 15-25 e o padrao recomendado. */
  limiteDiario: number
  /** Cartoes novos por dia, para nao introduzir os 215 de uma vez. */
  novosPorDia: number
}

export interface EstadoPersistido {
  versao: number
  planoExame: ExamPlan
  config: Config
  revisoes: ReviewState[]
  eventos: ReviewEvent[]
  validacoes: ValidacaoDoProfessor[]
  aulas: AlteracaoAula[]
  itens: AlteracaoItem[]
  duvidas: AlteracaoDuvida[]
  sessoes: PracticeSession[]
}

/**
 * Meta provisoria: o professor ainda nao marcou a prova. Cerca de 9 semanas a
 * partir do inicio do projeto, e editavel em Configuracoes.
 */
export const META_PROVISORIA_PADRAO = '2026-10-24T12:00:00.000Z'

export function estadoInicial(agora: Date): EstadoPersistido {
  return {
    versao: VERSAO_ATUAL,
    planoExame: {
      academia: 'Rilion Gracie Garopaba',
      professor: 'Joao Eduardo Goncalves',
      dataAlvo: META_PROVISORIA_PADRAO,
      provisoria: true,
      criadoEm: agora.toISOString(),
    },
    config: { limiteDiario: 20, novosPorDia: 8 },
    revisoes: [],
    eventos: [],
    validacoes: [],
    aulas: [],
    itens: [],
    duvidas: [],
    sessoes: [],
  }
}

/**
 * Migracoes por versao. Cada entrada recebe o estado da versao anterior e
 * devolve o da seguinte. Nenhuma migracao apaga dados (spec: "nao remova dados
 * para corrigir seed").
 */
const MIGRACOES: Record<number, (estado: Record<string, unknown>) => Record<string, unknown>> = {
  // 1 e a primeira versao: nada a migrar ainda.
}

export function migrar(bruto: Record<string, unknown>, agora: Date): EstadoPersistido {
  let estado = bruto
  let versao = typeof bruto.versao === 'number' ? bruto.versao : 0

  while (versao < VERSAO_ATUAL) {
    const migracao = MIGRACOES[versao + 1]
    if (!migracao) break
    estado = migracao(estado)
    versao += 1
  }

  // Completa campos ausentes sem descartar o que veio.
  return { ...estadoInicial(agora), ...estado, versao: VERSAO_ATUAL } as EstadoPersistido
}

export function carregar(deposito: Deposito, agora: Date): EstadoPersistido {
  const bruto = deposito.ler(CHAVE)
  if (!bruto) return estadoInicial(agora)

  try {
    const parsed = JSON.parse(bruto) as Record<string, unknown>
    return migrar(parsed, agora)
  } catch {
    // JSON corrompido: comeca limpo em vez de travar o app. O dado bruto fica
    // preservado numa chave separada para eventual recuperacao manual.
    deposito.escrever(`${CHAVE}__corrompido_${agora.getTime()}`, bruto)
    return estadoInicial(agora)
  }
}

export function salvar(deposito: Deposito, estado: EstadoPersistido): void {
  deposito.escrever(CHAVE, JSON.stringify(estado))
}

/** Exportacao completa para backup (RF-10). */
export function exportarJSON(estado: EstadoPersistido): string {
  return JSON.stringify(estado, null, 2)
}

/**
 * Importacao de backup. Recusa payload que nao parece deste app, para nao
 * sobrescrever o progresso com um arquivo errado.
 */
export function importarJSON(texto: string, agora: Date): EstadoPersistido {
  const parsed = JSON.parse(texto) as Record<string, unknown>
  if (typeof parsed.versao !== 'number' || !Array.isArray(parsed.eventos)) {
    throw new Error('arquivo nao parece um backup do Faixa Azul')
  }
  return migrar(parsed, agora)
}
