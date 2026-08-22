/**
 * Duvidas semeadas para levar as aulas particulares.
 *
 * As 10 primeiras vem literalmente do spec 2.2 ("pontos a confirmar com o
 * professor"). O app NAO inventa resposta para nenhuma delas: elas nascem
 * `aberta` e so mudam de estado quando o aluno registra o que o professor
 * respondeu numa aula.
 *
 * Alem destas, `duvidasDeLacuna()` gera automaticamente uma pergunta para cada
 * tecnica sem gatilho ou sem erro comum cadastrado — foi a decisao de
 * planejamento: em vez de inventar esse conteudo, a lacuna vira pergunta.
 */

import type { AulaParticular, TeacherQuestion, TechniqueContent, TechniqueItem } from '../domain/types'

export const DUVIDAS_DO_SPEC: TeacherQuestion[] = [
  {
    id: 'duvida-spec-01',
    tipo: 'nomenclatura',
    pergunta: 'O que exatamente e "Tipy" no documento da prova? E o chute frontal (teep)?',
    status: 'aberta',
    origem: 'spec',
  },
  {
    id: 'duvida-spec-02',
    tipo: 'nomenclatura',
    pergunta:
      'Quais sao as variacoes corretas de cada raspagem, passagem e finalizacao? As que estao no app sao sugestoes minhas, nao as da academia.',
    status: 'aberta',
    origem: 'spec',
  },
  {
    id: 'duvida-spec-03',
    tipo: 'quantidade',
    pergunta: 'Quantas finalizacoes sao exigidas em cada guarda?',
    status: 'aberta',
    origem: 'spec',
  },
  {
    id: 'duvida-spec-04',
    tipo: 'nomenclatura',
    pergunta: '"One leg" aparece repetido no documento. Sao tecnicas diferentes?',
    status: 'aberta',
    origem: 'spec',
  },
  {
    id: 'duvida-spec-05',
    tipo: 'criterio_de_prova',
    pergunta: 'Guarda X, 50/50, one-leg e berimbolo serao cobrados separadamente ou como um bloco?',
    status: 'aberta',
    origem: 'spec',
  },
  {
    id: 'duvida-spec-06',
    tipo: 'bilateralidade',
    pergunta: 'A prova exige demonstrar os dois lados? Em quais tecnicas especificamente?',
    status: 'aberta',
    origem: 'spec',
  },
  {
    id: 'duvida-spec-07',
    tipo: 'pontuacao',
    pergunta:
      'Qual pontuacao a academia adota para montada, queda, raspagem, passagem de guarda e pegada de costas?',
    status: 'aberta',
    origem: 'spec',
  },
  {
    id: 'duvida-spec-08',
    tipo: 'criterio_de_prova',
    pergunta: 'Qual a resposta esperada sobre quem e Rilion Gracie e quem e seu pai?',
    status: 'aberta',
    origem: 'spec',
  },
  {
    id: 'duvida-spec-09',
    tipo: 'execucao',
    pergunta:
      'Quais os limites, a sequencia e os criterios da parte de defesa pessoal? (o app nao traz instrucao textual desse modulo por seguranca)',
    status: 'aberta',
    origem: 'spec',
  },
  {
    id: 'duvida-spec-10',
    tipo: 'execucao',
    pergunta: 'Qual forma de execucao e considerada correta na avaliacao?',
    status: 'aberta',
    origem: 'spec',
  },
  // Ambiguidade encontrada ao escrever o conteudo de Fundamentos.
  {
    id: 'duvida-spec-11',
    itemId: 'base-movimentacao--fuga-de-quadril-avancada',
    tipo: 'nomenclatura',
    pergunta:
      'O que distingue a fuga de quadril "avancada" da tradicional? O app assumiu a versao continua sem apoio das maos, mas isso e suposicao.',
    status: 'aberta',
    origem: 'spec',
  },
]

/**
 * Uma pergunta por tecnica que esta sem gatilho ou sem erro comum. Sao os dois
 * campos que o app deliberadamente nao preenche: o gatilho porque exige
 * criterio de prova, e o erro comum porque a experiencia do professor e
 * insubstituivel (spec 11.2).
 */
export function duvidasDeLacuna(
  itens: TechniqueItem[],
  conteudos: TechniqueContent[],
): TeacherQuestion[] {
  const porItem = new Map(conteudos.map((c) => [c.itemId, c]))
  const duvidas: TeacherQuestion[] = []

  for (const item of itens) {
    if (!item.ativo) continue
    const c = porItem.get(item.id)
    const rotulo = item.nome || `${item.posicao} — ${item.slot}`

    if (!c?.gatilho) {
      duvidas.push({
        id: `lacuna-gatilho-${item.id}`,
        itemId: item.id,
        tipo: 'execucao',
        pergunta: `Qual o gatilho para usar ${rotulo}? Em que reacao do oponente ela e a resposta certa?`,
        status: 'aberta',
        origem: 'lacuna_de_conteudo',
      })
    }

    if (!c?.errosComuns.length) {
      duvidas.push({
        id: `lacuna-erro-${item.id}`,
        itemId: item.id,
        tipo: 'execucao',
        pergunta: `Qual o erro mais comum ou mais perigoso em ${rotulo}?`,
        status: 'aberta',
        origem: 'lacuna_de_conteudo',
      })
    }
  }

  return duvidas
}

/**
 * Duvidas a levar numa aula especifica.
 *
 * O conjunto completo passa de 170 perguntas (2 lacunas x 81 itens + as do
 * spec) — numero correto no modelo de dados, mas impossivel de levar para uma
 * aula de 50 minutos. Aqui o recorte e o que torna a lista usavel: as perguntas
 * gerais ainda abertas + as lacunas apenas das tecnicas daquela aula.
 */
export function duvidasParaAula(aula: AulaParticular, todas: TeacherQuestion[]): TeacherQuestion[] {
  const daAula = new Set(aula.itemIds)
  return todas.filter((d) => {
    if (d.status !== 'aberta') return false
    // Perguntas gerais (sem item) valem para qualquer aula ate serem respondidas.
    if (!d.itemId) return true
    return daAula.has(d.itemId)
  })
}
