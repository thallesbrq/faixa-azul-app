/**
 * Curriculo do 1o GRAU — a lista enviada pelo professor em 07/09/2026.
 *
 * REGRA DA GRADUACAO, nas palavras dele: "apos 35 aulas o aluno deve ter o
 * minimo de competencia nos seguintes itens".
 *
 * CURRICULO PROPRIO E NAO FATIA DO DE AZUL (ADR-016, decisao 1). A conferencia
 * item por item mostrou que ~14 dos 29 NAO EXISTEM no curriculo de azul, e nao
 * por falha de import: a banca de azul cobra finalizacoes DA GUARDA, e as de
 * cima (dos 100kg, da montada, das costas) sao de grau. E os quatro dominios de
 * posicao nao existem em tipo nenhum — o de azul tem as SAIDAS dessas posicoes,
 * que e o lado de baixo da mesma situacao.
 *
 * NENHUM ITEM TEM PASSO A PASSO, e isso e deliberado. `validationStatus` de
 * todos e `aguardando_validacao`, e `sourceReference` aponta para a lista do
 * professor — nao para o PDF do exame. Redigir o conteudo aqui repetiria o erro
 * que `taxonomia.ts` registra: inventar sobre um documento que tem a sua propria
 * linguagem. O nome de cada item usa AS PALAVRAS DELE.
 *
 * CONSEQUENCIA DISSO, medida e nao suposta: sem `passos`, `cartoesDaTecnica` so
 * gera o cartao de classificacao, e so para os kinds classificaveis. Onze destes
 * 29 itens (quedas, educativos, dominios) ficariam com ZERO cartoes. Por isso o
 * progresso de quem busca o 1o grau NAO e dominio de cartao: e quantas
 * competencias o professor atestou (ADR-016, decisao 9). Se o passo a passo
 * chegar depois, os cartoes aparecem sozinhos e nada aqui muda.
 *
 * A AMBIGUIDADE DO TRIPE FOI RESOLVIDA pelo professor: e da guarda fechada. Ver
 * `g1-gf--raspagem-tripe`, onde a pergunta e a resposta ficam registradas.
 *
 * `safetyLevel` e ESTIMATIVA conservadora: quedas alto (projecao), finalizacoes
 * medio (alavanca e estrangulamento), o resto baixo. Cabe ao professor corrigir.
 */

import type { Modulo, TechniqueItem } from '../domain/types'

/**
 * A PROCEDENCIA DOS 29 ITENS, e o detalhe importa: o professor passou o
 * curriculo das 35 primeiras aulas EM LOCO, presencialmente, e nao por
 * documento. Isso muda o peso da lista — ela nao e transcricao de um PDF do
 * exame nem interpretacao minha de um material da banca; e o que ele ensina,
 * ditado por ele.
 *
 * Por isso `validationStatus` continua `aguardando_validacao` para todos: ele
 * ditou os NOMES, e nao conferiu como estao escritos aqui. Sao duas coisas
 * diferentes, e confundi-las faria o app afirmar validacao que nao houve.
 */
const FONTE = 'Currículo das 35 aulas do 1º grau, passado em loco pelo Prof. João Eduardo'

/** Base comum: nada bilateral por padrao (ADR-006 revisado), nada validado. */
const PADRAO = {
  aliases: [] as string[],
  sideMode: 'nao_se_aplica',
  validationStatus: 'aguardando_validacao',
  sourceReference: FONTE,
  ativo: true,
} as const

export const MODULOS_1GRAU: Modulo[] = [
  { id: 'g1-quedas', nome: 'Quedas', ordem: 1 },
  { id: 'g1-guarda-fechada', nome: 'Guarda fechada', ordem: 2 },
  { id: 'g1-educativos', nome: 'Educativos', ordem: 3 },
  { id: 'g1-dominio', nome: 'Posição individual', ordem: 4 },
  { id: 'g1-finalizacoes', nome: 'Finalizações', ordem: 5 },
  { id: 'g1-saidas', nome: 'Saídas', ordem: 6 },
]

export const ITENS_1GRAU: TechniqueItem[] = [
  // --- Quedas: "Double Leg, Single leg, Osoto gari" -------------------------
  {
    ...PADRAO,
    id: 'g1-quedas--double-leg',
    moduloId: 'g1-quedas',
    posicao: 'Quedas',
    slot: 'Queda 1',
    categoria: 'Quedas',
    nome: 'Double leg',
    kind: 'queda',
    safetyLevel: 'alto',
  },
  {
    ...PADRAO,
    id: 'g1-quedas--single-leg',
    moduloId: 'g1-quedas',
    posicao: 'Quedas',
    slot: 'Queda 2',
    categoria: 'Quedas',
    nome: 'Single leg',
    kind: 'queda',
    safetyLevel: 'alto',
  },
  {
    ...PADRAO,
    id: 'g1-quedas--osoto-gari',
    moduloId: 'g1-quedas',
    posicao: 'Quedas',
    slot: 'Queda 3',
    categoria: 'Quedas',
    nome: 'Osoto gari',
    kind: 'queda',
    safetyLevel: 'alto',
  },

  // --- Guarda fechada: 2 passagens, 3 raspagens, 1 ida as costas -----------
  {
    ...PADRAO,
    id: 'g1-gf--passagem-simples',
    moduloId: 'g1-guarda-fechada',
    posicao: 'Guarda Fechada',
    slot: 'Passagem 1',
    categoria: 'Passagens',
    nome: 'Passagem simples',
    kind: 'passagem',
    safetyLevel: 'baixo',
  },
  {
    ...PADRAO,
    id: 'g1-gf--passagem-emborcando',
    moduloId: 'g1-guarda-fechada',
    posicao: 'Guarda Fechada',
    slot: 'Passagem 2',
    categoria: 'Passagens',
    nome: 'Passagem emborcando',
    kind: 'passagem',
    safetyLevel: 'baixo',
  },
  {
    ...PADRAO,
    id: 'g1-gf--raspagem-tesoura',
    moduloId: 'g1-guarda-fechada',
    posicao: 'Guarda Fechada',
    slot: 'Raspagem 1',
    categoria: 'Raspagens',
    nome: 'Raspagem de tesoura',
    kind: 'raspagem',
    safetyLevel: 'baixo',
  },
  {
    ...PADRAO,
    id: 'g1-gf--raspagem-pendulo',
    moduloId: 'g1-guarda-fechada',
    posicao: 'Guarda Fechada',
    slot: 'Raspagem 2',
    categoria: 'Raspagens',
    nome: 'Raspagem pêndulo',
    kind: 'raspagem',
    safetyLevel: 'baixo',
  },
  {
    ...PADRAO,
    id: 'g1-gf--raspagem-tripe',
    moduloId: 'g1-guarda-fechada',
    posicao: 'Guarda Fechada',
    slot: 'Raspagem 3',
    categoria: 'Raspagens',
    nome: 'Raspagem tripé',
    kind: 'raspagem',
    safetyLevel: 'baixo',
    /**
     * PERGUNTA RESPONDIDA, e fica registrada com a resposta em vez de apagada.
     *
     * A lista diz "Guarda fechada: 3 raspagens (tesoura, pendulo, tripe)". O
     * tripe e classicamente da guarda ABERTA/aranha, com o pe no quadril — da
     * fechada e incomum, e havia duas leituras: ou "guarda fechada" era o
     * cabecalho da secao e o tripe vinha de outra guarda, ou ele ensina uma
     * versao da fechada.
     *
     * E A SEGUNDA: o professor confirmou que e o tripe DA GUARDA FECHADA. Fica
     * escrito porque quem conhecer a versao classica vai estranhar este item, e
     * a duvida ja foi levantada e respondida uma vez.
     */
    sourceReference: `${FONTE} — tripé DA guarda fechada, confirmado pelo professor`,
  },
  {
    ...PADRAO,
    id: 'g1-gf--costas-do-pendulo',
    moduloId: 'g1-guarda-fechada',
    posicao: 'Guarda Fechada',
    slot: 'Ida para as costas',
    categoria: 'Ida para as costas',
    nome: 'Ida para as costas a partir da raspagem pêndulo',
    kind: 'costas',
    safetyLevel: 'baixo',
  },

  // --- Educativos ----------------------------------------------------------
  {
    ...PADRAO,
    id: 'g1-edu--ukemi',
    moduloId: 'g1-educativos',
    posicao: 'Educativos',
    slot: 'Educativo 1',
    categoria: 'Educativos',
    nome: 'Ukemi',
    kind: 'movimentacao',
    safetyLevel: 'baixo',
  },
  {
    ...PADRAO,
    id: 'g1-edu--levantada-tecnica',
    moduloId: 'g1-educativos',
    posicao: 'Educativos',
    slot: 'Educativo 2',
    categoria: 'Educativos',
    nome: 'Levantada técnica',
    kind: 'movimentacao',
    safetyLevel: 'baixo',
  },
  {
    ...PADRAO,
    id: 'g1-edu--rolamentos',
    moduloId: 'g1-educativos',
    posicao: 'Educativos',
    slot: 'Educativo 3',
    categoria: 'Educativos',
    // UM item e nao dois: a lista traz "Rolamentos (frente e costas)" como um
    // unico marcador. Separar em dois mudaria a contagem de 29 sem ele pedir.
    nome: 'Rolamentos (frente e costas)',
    kind: 'movimentacao',
    safetyLevel: 'baixo',
  },
  {
    ...PADRAO,
    id: 'g1-edu--fuga-de-quadril',
    moduloId: 'g1-educativos',
    posicao: 'Educativos',
    slot: 'Educativo 4',
    categoria: 'Educativos',
    nome: 'Fuga de quadril',
    kind: 'movimentacao',
    safetyLevel: 'baixo',
  },

  // --- Posicao individual: MANTER a posicao, nao sair dela ------------------
  {
    ...PADRAO,
    id: 'g1-dom--100kg-lateral',
    moduloId: 'g1-dominio',
    posicao: '100 Kilos',
    slot: 'Domínio 1',
    categoria: 'Domínio de posição',
    nome: '100 kg lateral',
    kind: 'dominio',
    safetyLevel: 'baixo',
  },
  {
    ...PADRAO,
    id: 'g1-dom--100kg-norte-sul',
    moduloId: 'g1-dominio',
    posicao: '100 Kilos',
    slot: 'Domínio 2',
    categoria: 'Domínio de posição',
    nome: '100 kg norte-sul',
    kind: 'dominio',
    safetyLevel: 'baixo',
  },
  {
    ...PADRAO,
    id: 'g1-dom--montada',
    moduloId: 'g1-dominio',
    posicao: 'Montada',
    slot: 'Domínio 3',
    categoria: 'Domínio de posição',
    nome: 'Montada',
    kind: 'dominio',
    safetyLevel: 'baixo',
  },
  {
    ...PADRAO,
    id: 'g1-dom--costas-com-gancho',
    moduloId: 'g1-dominio',
    posicao: 'Costas',
    slot: 'Domínio 4',
    categoria: 'Domínio de posição',
    nome: 'Domínio de costas com gancho',
    kind: 'dominio',
    safetyLevel: 'baixo',
  },

  // --- Finalizacoes: DA GUARDA FECHADA -------------------------------------
  {
    ...PADRAO,
    id: 'g1-fin-gf--cruzado',
    moduloId: 'g1-finalizacoes',
    posicao: 'Guarda Fechada',
    slot: 'Finalização 1',
    categoria: 'Finalizações',
    nome: 'Estrangulamento cruzado',
    kind: 'finalizacao',
    safetyLevel: 'medio',
  },
  {
    ...PADRAO,
    id: 'g1-fin-gf--armlock',
    moduloId: 'g1-finalizacoes',
    posicao: 'Guarda Fechada',
    slot: 'Finalização 2',
    categoria: 'Finalizações',
    nome: 'Armlock',
    kind: 'finalizacao',
    safetyLevel: 'medio',
  },
  {
    ...PADRAO,
    id: 'g1-fin-gf--triangulo',
    moduloId: 'g1-finalizacoes',
    posicao: 'Guarda Fechada',
    slot: 'Finalização 3',
    categoria: 'Finalizações',
    nome: 'Triângulo',
    kind: 'finalizacao',
    safetyLevel: 'medio',
  },

  // --- Finalizacoes: DOS 100 KG -------------------------------------------
  {
    ...PADRAO,
    id: 'g1-fin-100kg--cruzado',
    moduloId: 'g1-finalizacoes',
    posicao: '100 Kilos',
    slot: 'Finalização 1',
    categoria: 'Finalizações',
    nome: 'Estrangulamento cruzado',
    kind: 'finalizacao',
    safetyLevel: 'medio',
  },
  {
    ...PADRAO,
    id: 'g1-fin-100kg--americana',
    moduloId: 'g1-finalizacoes',
    posicao: '100 Kilos',
    slot: 'Finalização 2',
    categoria: 'Finalizações',
    nome: 'Americana',
    kind: 'finalizacao',
    safetyLevel: 'medio',
  },

  // --- Finalizacoes: DAS COSTAS -------------------------------------------
  {
    ...PADRAO,
    id: 'g1-fin-costas--lapela',
    moduloId: 'g1-finalizacoes',
    posicao: 'Costas',
    slot: 'Finalização 1',
    categoria: 'Finalizações',
    nome: 'Estrangulamento de lapela',
    kind: 'finalizacao',
    safetyLevel: 'medio',
  },
  {
    ...PADRAO,
    id: 'g1-fin-costas--mata-leao',
    moduloId: 'g1-finalizacoes',
    posicao: 'Costas',
    slot: 'Finalização 2',
    categoria: 'Finalizações',
    nome: 'Mata-leão',
    kind: 'finalizacao',
    safetyLevel: 'medio',
  },

  // --- Finalizacoes: DA MONTADA -------------------------------------------
  {
    ...PADRAO,
    id: 'g1-fin-montada--cruzado',
    moduloId: 'g1-finalizacoes',
    posicao: 'Montada',
    slot: 'Finalização 1',
    categoria: 'Finalizações',
    nome: 'Estrangulamento cruzado',
    kind: 'finalizacao',
    safetyLevel: 'medio',
  },
  {
    ...PADRAO,
    id: 'g1-fin-montada--americana',
    moduloId: 'g1-finalizacoes',
    posicao: 'Montada',
    slot: 'Finalização 2',
    categoria: 'Finalizações',
    nome: 'Americana',
    kind: 'finalizacao',
    safetyLevel: 'medio',
  },
  {
    ...PADRAO,
    id: 'g1-fin-montada--armlock',
    moduloId: 'g1-finalizacoes',
    posicao: 'Montada',
    slot: 'Finalização 3',
    categoria: 'Finalizações',
    nome: 'Armlock',
    kind: 'finalizacao',
    safetyLevel: 'medio',
  },

  // --- Saidas -------------------------------------------------------------
  {
    ...PADRAO,
    id: 'g1-saida--100kg',
    moduloId: 'g1-saidas',
    posicao: '100 Kilos',
    slot: 'Saída 1',
    categoria: 'Saídas',
    nome: 'Saída dos 100 kg',
    kind: 'saida',
    safetyLevel: 'baixo',
  },
  {
    ...PADRAO,
    id: 'g1-saida--montada',
    moduloId: 'g1-saidas',
    posicao: 'Montada',
    slot: 'Saída 2',
    categoria: 'Saídas',
    nome: 'Saída da montada',
    kind: 'saida',
    safetyLevel: 'baixo',
  },
]
