/**
 * Passo a passo de Fundamentos (9) e Quedas (5) — os 14 itens que faltavam.
 *
 * Escrito a mao (nao vem do import). Sao SUGESTOES padrao de faixa azul, com o
 * mesmo status `sugestao_nao_validada` dos 56 itens das Secoes 4 e 5: o
 * Prof. Joao Eduardo e a autoridade sobre nome, variacao e execucao correta.
 *
 * Defesa Pessoal (11 itens) NAO aparece aqui por decisao explicita — ver
 * ADR-012: aprender defesa de soco, chute e enforcamento por texto e
 * justamente o que o spec proibe.
 *
 * Quedas levam `notasSeguranca` obrigatorias (RNF-06 / ADR-008): exigem
 * parceiro que saiba cair e supervisao do professor.
 */

import type { TechniqueContent } from '../domain/types'

const AVISO_QUEDA =
  'Queda exige parceiro que saiba ukemi e supervisao do professor. Nunca treinar sozinho nem em superficie dura.'

/** Chaveado por `itemId` do curriculo (ver src/seed/curriculo.ts). */
export const CONTEUDO_FUNDAMENTOS_QUEDAS: TechniqueContent[] = [
  // ------------------------------------------------------------------ Base
  {
    itemId: 'base-movimentacao--rolamento-para-frente',
    passos: [
      'Agache com um pe ligeiramente a frente do outro.',
      'Apoie no chao a mao do lado da perna de tras, com o braco arqueado — nunca esticado.',
      'Encaixe o queixo no peito e olhe para o lado oposto ao braco de apoio.',
      'Role na diagonal: ombro, costas, quadril oposto. O peso nunca passa pela cabeca nem pela nuca.',
      'Termine de pe ou na base sentada, sem bater a cabeca no chao.',
    ],
    busca: 'rolamento para frente jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: ['Rolar pela diagonal do ombro. Passar o peso pela cabeca ou nuca causa lesao cervical.'],
  },
  {
    itemId: 'base-movimentacao--rolamento-para-tras',
    passos: [
      'Da base sentada, encoste o queixo no peito e arredonde as costas.',
      'Role para tras pela diagonal de um ombro, nunca pelo meio da nuca.',
      'Leve as pernas por cima, mantendo o quadril proximo do corpo.',
      'Termine de quatro ou de pe, de frente para o oponente.',
    ],
    busca: 'rolamento para tras jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: ['O queixo permanece colado ao peito do inicio ao fim.'],
  },
  {
    itemId: 'base-movimentacao--fuga-de-quadril-tradicional',
    passos: [
      'Deitado de costas, plante um pe no chao com o joelho dobrado.',
      'Ponte apoiando nesse pe e no ombro do mesmo lado, tirando o quadril do chao.',
      'Empurre o quadril para longe na diagonal, encaixando o joelho no espaco criado.',
      'Recomponha a guarda e repita para o outro lado, deslocando-se pelo tatame.',
    ],
    busca: 'fuga de quadril tradicional jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [],
  },
  {
    itemId: 'base-movimentacao--fuga-de-quadril-avancada',
    // O documento nao especifica o que distingue a versao "avancada".
    // Isto gera uma pergunta explicita ao professor (ver src/seed/duvidas.ts).
    passos: [
      'ATENCAO: o documento da prova nao define o que e a versao "avancada". Confirmar com o professor antes de treinar.',
      'Interpretacao mais comum: fuga de quadril continua, sem apoiar as maos no chao.',
      'Da guarda, ponte e empurre o quadril na diagonal usando so o pe de apoio.',
      'Recomponha e repita alternando os lados sem parar, mantendo os cotovelos colados ao corpo.',
    ],
    busca: 'fuga de quadril avancada sem as maos jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [],
  },
  {
    itemId: 'base-movimentacao--ukemi-frente',
    passos: [
      'Bracos a frente formando um triangulo, antebracos paralelos e palmas para baixo.',
      'Caia amortecendo com os dois antebracos e as palmas ao mesmo tempo.',
      'Mantenha o quadril alto e a cabeca virada para um lado.',
      'Nunca receba a queda com os bracos esticados nem com os joelhos.',
    ],
    busca: 'ukemi frente mae ukemi jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: ['Braco esticado na queda frontal e mecanismo classico de lesao de punho e ombro.'],
  },
  {
    itemId: 'base-movimentacao--ukemi-costas',
    passos: [
      'Da base agachada, encoste o queixo no peito.',
      'Desca sentando e role para tras com as costas arredondadas.',
      'No impacto, bata os dois bracos no chao a cerca de 45 graus do corpo, palmas para baixo.',
      'A cabeca nao toca o chao: o queixo permanece colado durante todo o movimento.',
    ],
    busca: 'ukemi costas ushiro ukemi jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [],
  },
  {
    itemId: 'base-movimentacao--ukemi-lateral',
    passos: [
      'De pe ou agachado, projete uma perna a frente cruzando o corpo.',
      'Desca pela lateral do quadril e das costas, nunca de chapa.',
      'Bata o braco do lado da queda no chao a cerca de 45 graus, palma para baixo.',
      'Cabeca virada para o lado oposto ao da queda.',
    ],
    busca: 'ukemi lateral yoko ukemi jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [],
  },
  {
    itemId: 'base-movimentacao--levantada-tecnica',
    passos: [
      'Sentado, apoie uma mao no chao atras de voce e plante o pe do mesmo lado.',
      'A outra mao protege o rosto e o pescoco.',
      'Empurre o quadril para cima e passe a perna de tras por baixo do corpo.',
      'Fique de pe mantendo a guarda das maos e a postura — sem nunca virar as costas.',
    ],
    busca: 'levantada tecnica jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [],
  },
  {
    itemId: 'base-movimentacao--sprawl',
    passos: [
      'Ao sentir a entrada de queda, jogue o quadril para baixo e para frente.',
      'Estenda as pernas para tras e leve o peito por cima da cabeca ou do ombro dele.',
      'Coloque o peso sobre o oponente com o quadril colado ao chao.',
      'Recomponha circulando para a lateral, buscando a cintura ou voltando a postura de pe.',
    ],
    busca: 'sprawl defesa de queda jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [],
  },

  // ---------------------------------------------------------------- Quedas
  {
    itemId: 'quedas--o-soto-gari',
    passos: [
      'Pegada de gola e manga. Desequilibre o oponente para o canto de tras dele.',
      'Avance o pe de apoio para fora do pe dele, colando o peito.',
      'Ceife a perna de fora dele com a sua, de tras para frente, enquanto puxa a gola para baixo.',
      'Acompanhe a queda sem soltar a manga e chegue por cima.',
    ],
    busca: 'o soto gari jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [AVISO_QUEDA, 'Controlar a descida do parceiro pela manga — soltar a pegada e o que machuca.'],
  },
  {
    itemId: 'quedas--baiana',
    passos: [
      'Quebre a postura dele e feche a distancia com um passo baixo.',
      'Encaixe a cabeca de um lado do tronco e abrace as duas coxas.',
      'Junte as pernas dele e avance na diagonal, levando-o ao chao.',
      'Chegue por cima estabilizando na lateral ou seguindo direto para a passagem.',
    ],
    busca: 'baiana double leg jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [
      AVISO_QUEDA,
      'Nunca entrar com a cabeca baixa e a coluna curva: e como se lesiona o pescoco na entrada.',
    ],
  },
  {
    itemId: 'quedas--single-leg',
    passos: [
      'Controle o punho ou a manga do lado que vai atacar.',
      'Entre com um joelho no chao, abracando a perna dele acima do joelho.',
      'Levante a perna e leve o ombro contra o corpo dele, tirando o eixo.',
      'Leve ao chao e passe para a lateral, mantendo o controle da perna.',
    ],
    busca: 'single leg queda jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [AVISO_QUEDA],
  },
  {
    itemId: 'quedas--uchi-mata',
    passos: [
      'Pegada de gola e manga. Desequilibre para frente e para o lado.',
      'Gire entrando de costas, encaixando o quadril abaixo do dele.',
      'Eleve a coxa interna dele com a sua perna, girando os ombros na direcao da queda.',
      'Acompanhe a queda mantendo a pegada da manga.',
    ],
    busca: 'uchi mata jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [
      AVISO_QUEDA,
      'Projecao de alto impacto: treinar somente com parceiro experiente em ukemi e sob supervisao direta.',
    ],
  },
  {
    itemId: 'quedas--arm-drag-com-cinturada-e-queda',
    passos: [
      'Pegue o punho e o triceps do mesmo braco.',
      'Puxe o braco cruzando o corpo dele (arm drag), saindo da linha de frente.',
      'Cinture pelo tronco ou quadril, colando o peito nas costas dele.',
      'Leve ao chao pelo lado ou por tras, mantendo a cintura fechada.',
    ],
    busca: 'arm drag cinturada e queda jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [AVISO_QUEDA],
  },
]
