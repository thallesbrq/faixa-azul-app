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
  'Queda exige parceiro que saiba ukemi e supervisão do professor. Nunca treinar sozinho nem em superfície dura.'

/** Chaveado por `itemId` do curriculo (ver src/seed/curriculo.ts). */
export const CONTEUDO_FUNDAMENTOS_QUEDAS: TechniqueContent[] = [
  // ------------------------------------------------------------------ Base
  {
    itemId: 'base-movimentacao--rolamento-para-frente',
    passos: [
      'Agache com um pé ligeiramente à frente do outro.',
      'Apoie no chão a mão do lado da perna de trás, com o braço arqueado — nunca esticado.',
      'Encaixe o queixo no peito e olhe para o lado oposto ao braço de apoio.',
      'Role na diagonal: ombro, costas, quadril oposto. O peso nunca passa pela cabeça nem pela nuca.',
      'Termine de pé ou na base sentada, sem bater a cabeça no chão.',
    ],
    busca: 'rolamento para frente jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: ['Rolar pela diagonal do ombro. Passar o peso pela cabeça ou nuca causa lesão cervical.'],
  },
  {
    itemId: 'base-movimentacao--rolamento-para-tras',
    passos: [
      'Da base sentada, encoste o queixo no peito e arredonde as costas.',
      'Role para trás pela diagonal de um ombro, nunca pelo meio da nuca.',
      'Leve as pernas por cima, mantendo o quadril próximo do corpo.',
      'Termine de quatro ou de pé, de frente para o oponente.',
    ],
    busca: 'rolamento para tras jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: ['O queixo permanece colado ao peito do início ao fim.'],
  },
  {
    itemId: 'base-movimentacao--fuga-de-quadril-tradicional',
    passos: [
      'Deitado de costas, plante um pé no chão com o joelho dobrado.',
      'Ponte apoiando nesse pé e no ombro do mesmo lado, tirando o quadril do chão.',
      'Empurre o quadril para longe na diagonal, encaixando o joelho no espaço criado.',
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
      'ATENÇÃO: o documento da prova não define o que é a versão "avançada". Confirmar com o professor antes de treinar.',
      'Interpretação mais comum: fuga de quadril contínua, sem apoiar as mãos no chão.',
      'Da guarda, ponte e empurre o quadril na diagonal usando só o pé de apoio.',
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
      'Braços à frente formando um triângulo, antebraços paralelos e palmas para baixo.',
      'Caia amortecendo com os dois antebraços e as palmas ao mesmo tempo.',
      'Mantenha o quadril alto e a cabeça virada para um lado.',
      'Nunca receba a queda com os braços esticados nem com os joelhos.',
    ],
    busca: 'ukemi frente mae ukemi jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: ['Braço esticado na queda frontal é mecanismo clássico de lesão de punho e ombro.'],
  },
  {
    itemId: 'base-movimentacao--ukemi-costas',
    passos: [
      'Da base agachada, encoste o queixo no peito.',
      'Desça sentando e role para trás com as costas arredondadas.',
      'No impacto, bata os dois braços no chão a cerca de 45 graus do corpo, palmas para baixo.',
      'A cabeça não toca o chão: o queixo permanece colado durante todo o movimento.',
    ],
    busca: 'ukemi costas ushiro ukemi jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [],
  },
  {
    itemId: 'base-movimentacao--ukemi-lateral',
    passos: [
      'De pé ou agachado, projete uma perna à frente cruzando o corpo.',
      'Desça pela lateral do quadril e das costas, nunca de chapa.',
      'Bata o braço do lado da queda no chão a cerca de 45 graus, palma para baixo.',
      'Cabeça virada para o lado oposto ao da queda.',
    ],
    busca: 'ukemi lateral yoko ukemi jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [],
  },
  {
    itemId: 'base-movimentacao--levantada-tecnica',
    passos: [
      'Sentado, apoie uma mão no chão atrás de você e plante o pé do mesmo lado.',
      'A outra mão protege o rosto e o pescoço.',
      'Empurre o quadril para cima e passe a perna de trás por baixo do corpo.',
      'Fique de pé mantendo a guarda das mãos e a postura — sem nunca virar as costas.',
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
      'Estenda as pernas para trás e leve o peito por cima da cabeça ou do ombro dele.',
      'Coloque o peso sobre o oponente com o quadril colado ao chão.',
      'Recomponha circulando para a lateral, buscando a cintura ou voltando à postura de pé.',
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
      'Pegada de gola e manga. Desequilibre o oponente para o canto de trás dele.',
      'Avance o pé de apoio para fora do pé dele, colando o peito.',
      'Ceife a perna de fora dele com a sua, de trás para frente, enquanto puxa a gola para baixo.',
      'Acompanhe a queda sem soltar a manga e chegue por cima.',
    ],
    busca: 'o soto gari jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [AVISO_QUEDA, 'Controlar a descida do parceiro pela manga — soltar a pegada é o que machuca.'],
  },
  {
    itemId: 'quedas--baiana',
    passos: [
      'Quebre a postura dele e feche a distância com um passo baixo.',
      'Encaixe a cabeça de um lado do tronco e abrace as duas coxas.',
      'Junte as pernas dele e avance na diagonal, levando-o ao chão.',
      'Chegue por cima estabilizando na lateral ou seguindo direto para a passagem.',
    ],
    busca: 'baiana double leg jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [
      AVISO_QUEDA,
      'Nunca entrar com a cabeça baixa e a coluna curva: é como se lesiona o pescoço na entrada.',
    ],
  },
  {
    itemId: 'quedas--single-leg',
    passos: [
      'Controle o punho ou a manga do lado que vai atacar.',
      'Entre com um joelho no chão, abraçando a perna dele acima do joelho.',
      'Levante a perna e leve o ombro contra o corpo dele, tirando o eixo.',
      'Leve ao chão e passe para a lateral, mantendo o controle da perna.',
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
      'Eleve a coxa interna dele com a sua perna, girando os ombros na direção da queda.',
      'Acompanhe a queda mantendo a pegada da manga.',
    ],
    busca: 'uchi mata jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [
      AVISO_QUEDA,
      'Projeção de alto impacto: treinar somente com parceiro experiente em ukemi e sob supervisão direta.',
    ],
  },
  {
    itemId: 'quedas--arm-drag-com-cinturada-e-queda',
    passos: [
      'Pegue o punho e o tríceps do mesmo braço.',
      'Puxe o braço cruzando o corpo dele (arm drag), saindo da linha de frente.',
      'Cinture pelo tronco ou quadril, colando o peito nas costas dele.',
      'Leve ao chão pelo lado ou por trás, mantendo a cintura fechada.',
    ],
    busca: 'arm drag cinturada e queda jiu jitsu',
    errosComuns: [],
    reacoes: [],
    notasSeguranca: [AVISO_QUEDA],
  },
]
