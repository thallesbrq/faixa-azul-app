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

import type { Marcas } from '../domain/merge'
import type { Marca, Origem } from '../domain/procedencia'
import { marcaDeMigracao } from '../domain/procedencia'
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
export const VERSAO_ATUAL = 2

/**
 * Alteracoes sobre uma aula do seed.
 *
 * TRES CAMPOS, TRES DONOS — e por isso `marcas` e por campo e nao por registro:
 * `itemIds` e a grade, do professor; `realizadaEm` e o aluno dizendo que a aula
 * aconteceu; `notas` e a observacao do professor. Com dono por registro, mandar
 * a grade apagaria o `realizadaEm` do aluno toda vez. Ver DONO_DA_AULA e
 * ../domain/merge.
 */
export interface AlteracaoAula {
  numero: number
  realizadaEm?: string
  notas?: string
  /**
   * Itens desta aula, montados a mao com o professor.
   *
   * `undefined` = ainda nao montada. Lista vazia = montada e esvaziada de
   * proposito. A distincao importa: sem ela, a tela nao sabe diferenciar "o
   * professor ainda nao chegou nesta aula" de "ele tirou tudo dela".
   */
  itemIds?: string[]
  marcas?: Marcas<CampoDaAula>
}

export type CampoDaAula = 'realizadaEm' | 'notas' | 'itemIds'

/** Quem manda em cada campo da aula. */
export const DONO_DA_AULA: Record<CampoDaAula, Origem> = {
  itemIds: 'professor',
  notas: 'professor',
  realizadaEm: 'aluno',
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
  marcas?: Marcas<CampoDoItem>
}

export type CampoDoItem = 'dificuldade' | 'video' | 'videoTitulo' | 'anotacao'

/**
 * O item e do ALUNO inteiro — dificuldade, anotacao e o video que ELE escolheu
 * como referencia. A indicacao do professor nao sobrescreve isto: ela vive em
 * `indicacoes`, separada, para as duas aparecerem lado a lado em vez de uma
 * apagar a outra.
 */
export const DONO_DO_ITEM: Record<CampoDoItem, Origem> = {
  dificuldade: 'aluno',
  video: 'aluno',
  videoTitulo: 'aluno',
  anotacao: 'aluno',
}

/**
 * O que o PROFESSOR indica sobre um item.
 *
 * Colecao separada de proposito. Se a indicacao dele morasse no mesmo registro
 * do aluno, uma das duas teria de vencer — e "o video que eu achei" e "o video
 * que o mestre indicou" sao coisas diferentes que o aluno quer ver JUNTAS. E
 * um registro de dono unico, entao a juncao e trivial.
 */
export interface IndicacaoDoProfessor {
  itemId: string
  video?: string
  videoTitulo?: string
  observacao?: string
  marca: Marca
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

/**
 * De quem e este aparelho.
 *
 * `id` e ESTAVEL e gerado uma vez: a central do professor indexa os alunos por
 * ele, e um id que se regenerasse criaria um aluno duplicado a cada exportacao.
 *
 * `academiaId` em vez de `professorId` por escolha: numa academia real mais de
 * um professor da aula e aluno troca de professor. Custa um campo hoje e evita
 * uma migracao no dia em que outro professor pegar a turma.
 */
export interface Perfil {
  id: string
  /** Vazio ate a pessoa preencher. E o que a central mostra na lista. */
  nome: string
  papel: Origem
  academiaId: string
}

export const ACADEMIA_PADRAO = 'rilion-garopaba'

export interface EstadoPersistido {
  versao: number
  perfil: Perfil
  planoExame: ExamPlan
  config: Config
  revisoes: ReviewState[]
  eventos: ReviewEvent[]
  validacoes: ValidacaoDoProfessor[]
  aulas: AlteracaoAula[]
  itens: AlteracaoItem[]
  duvidas: AlteracaoDuvida[]
  sessoes: PracticeSession[]
  indicacoes: IndicacaoDoProfessor[]
}

/**
 * Meta provisoria: o professor ainda nao marcou a prova. Cerca de 9 semanas a
 * partir do inicio do projeto, e editavel em Configuracoes.
 */
export const META_PROVISORIA_PADRAO = '2026-10-24T12:00:00.000Z'

/**
 * `novoId` e injetado para o estado inicial continuar DETERMINISTICO em teste.
 * O padrao usa `crypto.randomUUID`, presente em todo navegador que roda este
 * app e no Node dos testes.
 */
export function estadoInicial(agora: Date, novoId: () => string = () => crypto.randomUUID()): EstadoPersistido {
  return {
    versao: VERSAO_ATUAL,
    perfil: { id: novoId(), nome: '', papel: 'aluno', academiaId: ACADEMIA_PADRAO },
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
    indicacoes: [],
  }
}

/**
 * Migracoes por versao. Cada entrada recebe o estado da versao anterior e
 * devolve o da seguinte. Nenhuma migracao apaga dados (spec: "nao remova dados
 * para corrigir seed").
 */
const MIGRACOES: Record<
  number,
  (estado: Record<string, unknown>, ctx: { agora: Date; novoId: () => string }) => Record<string, unknown>
> = {
  /**
   * v1 -> v2: identidade e procedencia.
   *
   * Entra `perfil` (quem e o dono deste aparelho) e a marca de quem alterou
   * cada campo mutavel. Sem isto nao ha como juntar o estado do aluno com o do
   * professor sem uma das partes apagar a outra.
   *
   * TODA MARCA DE MIGRACAO NASCE COM `versao: 0` e e atribuida ao ALUNO. Os
   * dois pontos sao deliberados: ninguem sabe quando aquele dado foi escrito,
   * entao ele perde qualquer desempate para uma alteracao nova em vez de
   * fingir ser recente; e tudo que existe hoje foi mesmo escrito pelo aluno,
   * porque o professor ainda nao tem por onde escrever.
   *
   * Nada e apagado (spec: "nao remova dados para corrigir seed").
   */
  2: (estado, { agora, novoId }) => {
    const quando = agora.toISOString()
    const marca = marcaDeMigracao('aluno', quando)

    const aulas = Array.isArray(estado.aulas) ? (estado.aulas as AlteracaoAula[]) : []
    const itens = Array.isArray(estado.itens) ? (estado.itens as AlteracaoItem[]) : []

    return {
      ...estado,
      perfil: estado.perfil ?? { id: novoId(), nome: '', papel: 'aluno', academiaId: ACADEMIA_PADRAO },
      indicacoes: estado.indicacoes ?? [],
      // So os campos que REALMENTE tem valor ganham marca. Marcar um campo
      // ausente faria um `undefined` local vencer um valor que chegasse depois.
      aulas: aulas.map((a) => ({
        ...a,
        marcas: a.marcas ?? {
          ...(a.realizadaEm !== undefined ? { realizadaEm: marca } : {}),
          ...(a.notas !== undefined ? { notas: marca } : {}),
          ...(a.itemIds !== undefined ? { itemIds: marca } : {}),
        },
      })),
      itens: itens.map((i) => ({
        ...i,
        marcas: i.marcas ?? {
          ...(i.dificuldade !== undefined ? { dificuldade: marca } : {}),
          ...(i.video !== undefined ? { video: marca } : {}),
          ...(i.videoTitulo !== undefined ? { videoTitulo: marca } : {}),
          ...(i.anotacao !== undefined ? { anotacao: marca } : {}),
        },
      })),
    }
  },
}

export function migrar(
  bruto: Record<string, unknown>,
  agora: Date,
  novoId: () => string = () => crypto.randomUUID(),
): EstadoPersistido {
  let estado = bruto
  let versao = typeof bruto.versao === 'number' ? bruto.versao : 0

  while (versao < VERSAO_ATUAL) {
    const migracao = MIGRACOES[versao + 1]
    if (!migracao) break
    estado = migracao(estado, { agora, novoId })
    versao += 1
  }

  // Completa campos ausentes sem descartar o que veio.
  return { ...estadoInicial(agora, novoId), ...estado, versao: VERSAO_ATUAL } as EstadoPersistido
}

export function carregar(deposito: Deposito, agora: Date): EstadoPersistido {
  const bruto = deposito.ler(CHAVE)
  if (!bruto) return estadoInicial(agora)

  try {
    const parsed = JSON.parse(bruto) as Record<string, unknown>

    const versaoLida = typeof parsed.versao === 'number' ? parsed.versao : 0
    if (versaoLida >= VERSAO_ATUAL) return migrar(parsed, agora)

    /*
     * MIGRACAO: guarda o original, migra, e GRAVA JA.
     *
     * A chave do backup e FIXA por versao de origem, nao carimbada com a hora.
     * Com carimbo, cada abertura do app criava mais uma copia — e criava mesmo,
     * porque migrar sem gravar deixa o disco na versao antiga e a migracao
     * reacontece a cada carregamento. Em modo de desenvolvimento o StrictMode
     * ainda dobra a conta. Duas aberturas por dia encheriam o localStorage de
     * copias identicas de um estado de 160 KB.
     *
     * Gravar aqui e o que fecha o ciclo: o disco passa a ser v2 e este ramo
     * nunca mais roda. E gravar DEPOIS do backup, nao antes — a copia existe
     * justamente para o caso de a migracao ter defeito, e o app ja esta no ar
     * com dado real de uso.
     */
    deposito.escrever(`${CHAVE}__backup_v${versaoLida}`, bruto)
    const migrado = migrar(parsed, agora)
    salvar(deposito, migrado)
    return migrado
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
