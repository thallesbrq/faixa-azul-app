/**
 * O que a Central do Aluno mostra — calculado aqui, puro, sem rede e sem React.
 *
 * ESTE MODULO EXISTE PARA NAO HAVER DOIS CALCULOS. O app do aluno deriva
 * `itens -> baralho -> progresso` dentro do `useApp`; se a central repetisse
 * essa derivacao, os dois numeros divergiriam na primeira vez que um dos lados
 * mudasse. E divergir aqui e o pior caso possivel: o aluno ve 62% na tela dele,
 * o professor ve 58% na dele, e a conversa passa a ser sobre o app em vez de
 * sobre o jiu-jitsu (ADR-015, decisao 1).
 *
 * O CURRICULO ENTRA COMO PARAMETRO, e nao importado do seed. Dois motivos, e o
 * segundo e o que importa a longo prazo:
 * 1. mantem a camada limpa — `application` nunca importou `seed`;
 * 2. o curriculo de ROXA esta a caminho. Quando chegar, a central passa um seed
 *    diferente para as turmas avancadas, sem uma linha de reescrita aqui.
 *
 * AS COLUNAS SAO DERIVADAS DO CURRICULO, e nao de uma constante. Uma coluna
 * sempre vazia nao informa nada e ainda confunde: o professor nao consegue
 * distinguir "o aluno nao sabe" de "isso nao esta no ar".
 *
 * O SEED HOJE ATIVA OS 81 ITENS (ADR-017, decisao 7) — eram 56, so guardas e
 * saidas. E a derivacao ganhou um segundo critério por causa disso: nao basta o
 * item estar ATIVO, ele tem de ser alcancavel por CARTAO. Defesa Pessoal tem 11
 * itens ativos e zero cartoes por item, e viraria uma coluna de 0% eterno — o
 * proprio defeito que este paragrafo diz que derivar evita. Ver
 * `gruposComItens` e `medivelPorCartoes`.
 */

// A FORMA do curriculo mora no dominio (ver domain/curriculo); aqui esta o
// CALCULO. Reexportado para nao quebrar quem ja importava `Curriculo` daqui.
import type { Curriculo } from '../domain/curriculo'
export type { Curriculo }
import type { GrupoTecnico } from '../domain/taxonomia'
import { grupoDoKind, ORDEM_GRUPO } from '../domain/taxonomia'
import { gerarBaralho } from '../domain/cards'
import { aplicarValidacoes } from '../domain/validacao'
import type { EstadoPersistido } from '../persistence/repositorio'
import {
  faixaDaPontuacao,
  gruposMaisFracos,
  progressoPorGrupoTecnico,
  progressoPorItem,
  progressoPorPosicao,
  prontidao,
} from './progresso'
import type { FaixaDeCor, ProgressoDeGrupo } from './progresso'
import { aptidaoAoGrau } from './atestado'
import type { Aptidao } from './atestado'
import { resumoDoAluno } from './torre'
import type { Situacao } from './torre'
import { situacaoDoAluno } from './torre'

/**
 * Grupos que tem pelo menos um item MENSURAVEL POR CARTAO — as colunas da tabela.
 *
 * Devolve na ordem de `ORDEM_GRUPO` e nao na ordem em que aparecem nos itens: a
 * ordem das colunas nao pode depender de como o seed foi escrito.
 *
 * ERA "TEM ITEM ATIVO", E ISSO PASSOU A NAO BASTAR (ADR-017, decisao 7). Com os
 * 81 itens religados, Defesa Pessoal tem 11 itens ativos e ZERO cartoes — sem
 * `passos` e fora de `KINDS_CLASSIFICAVEIS`, nenhum cartao carrega o `itemId`
 * deles (o de reconhecimento cobre o modulo inteiro). A coluna existiria e
 * mostraria 0% para sempre, e o professor nao teria como distinguir
 * "o aluno nao sabe" de "isto nao e medido aqui" — precisamente o defeito que o
 * cabecalho deste arquivo diz que derivar as colunas serve para evitar.
 *
 * GERA O BARALHO PARA DECIDIR, em vez de reimplementar a regra de quem tem
 * cartao: duplicar essa regra faria a coluna e o numero dentro dela discordarem
 * na primeira mudanca do gerador.
 */
export function gruposComItens(curriculo: Curriculo): GrupoTecnico[] {
  const comCartao = new Set(
    gerarBaralho({
      itens: curriculo.itens.filter((i) => i.ativo),
      conteudos: curriculo.conteudos,
      requisitos: curriculo.requisitos,
      cartoesTeoria: curriculo.cartoesTeoria,
    })
      .map((c) => c.itemId)
      .filter((id): id is string => typeof id === 'string'),
  )

  const presentes = new Set<GrupoTecnico>()
  for (const i of curriculo.itens) {
    if (i.ativo && comCartao.has(i.id)) presentes.add(grupoDoKind(i.kind))
  }
  return ORDEM_GRUPO.filter((g) => presentes.has(g))
}

/**
 * Por que uma celula mostra `—` em vez de um numero.
 *
 * QUATRO AUSENCIAS DIFERENTES, e confundi-las e o defeito que este tipo existe
 * para impedir:
 * - `convidado`: o professor convidou e a pessoa nunca entrou. Nao ha conta, nao
 *   ha app aberto, nao ha nada. E DIFERENTE de `sem-dados` num ponto que muda a
 *   conversa: nao ha o que cobrar do aluno, ha o que cobrar do convite.
 * - `sem-dados`: a pessoa TEM conta, entrou, e nunca sincronizou. NAO SABEMOS.
 * - `sem-curriculo`: nao existe lista de itens para o que ele estuda (2o/3o/4o
 *   grau, ou nada definido). Medir contra um curriculo que nao e o dele
 *   produziria vermelho para quem nao esta mal.
 * - `atestado-nao-lido`: o curriculo e medido por atestado e NAO conseguimos ler
 *   as atestacoes. Diferente de "zero atestadas", que tem numero.
 *
 * Zero e uma quinta coisa, e essa tem numero: sincronizou e esta em zero.
 *
 * `medido-por-atestado` FOI REMOVIDO, e a remocao conserta um defeito que estava
 * no ar. Ele fazia todo aluno de 1o grau mostrar `—` na coluna Progresso PARA
 * SEMPRE — mesmo havendo numero real (atestados / total). O professor nao
 * conseguia distinguir "nao e medido aqui" de "zero de 29 atestados", que e
 * precisamente a coluna-que-nao-informa que este arquivo existe para evitar.
 *
 * Como apareceu: o Floki foi semeado com `estuda: 'azul'` e mostrava 57%; ao
 * trocar para `estuda: '1grau'` na Central, os 57% viraram travessao e o dado
 * pareceu ter sido perdido. Nao foi — mas a tela dizia que sim.
 *
 * A DECISAO MUDOU DE DONO DUAS VEZES. Vinha da TURMA (`medeCurriculoDeAzul`), e
 * a RG2 era a razao; passou para a META do aluno, porque um faixa branca novo e
 * alguem com tres graus cabem na mesma turma e precisam de provas diferentes
 * (ADR-016, decisao 3); e agora vem do CURRICULO QUE ELE ESTUDA, porque a prova
 * que ele persegue e o conteudo que ele treina deixaram de ser o mesmo campo
 * (ADR-017, decisao 6).
 */
export type MotivoSemProgresso =
  | 'convidado'
  | 'sem-dados'
  | 'sem-curriculo'
  | 'atestado-nao-lido'

export interface LinhaDaCentral {
  /**
   * O uid, ou o E-MAIL quando a linha e de um convidado.
   *
   * Um convidado nao tem uid — ele nasce no primeiro login. O e-mail e a chave
   * que existe, e e o id do documento de convite. As duas nunca colidem: uid do
   * Firebase nao contem `@`.
   */
  uid: string
  nome: string
  turma: string
  /** A PROVA que ele persegue: 1o grau, 2o, ..., azul. */
  meta: string
  /**
   * O CURRICULO que ele estuda no app — quem decide a medida do progresso.
   *
   * SEPARADO DE `meta` (ADR-017, decisao 6). Eu tenho `meta: '3grau'` e
   * `estuda: 'azul'`: persigo o 3o grau e treino o curriculo de azul inteiro.
   * Com um campo so, um dos dois estaria errado — ou eu seria medido contra uma
   * lista que nao existe, ou apareceria perseguindo o azul.
   */
  estuda: string
  /**
   * 0 a 1, ou `null` quando ha motivo para nao medir — ver `motivo`.
   *
   * VEM DE DUAS FONTES, decididas pelo curriculo e nao pela linha: dominio de
   * cartoes (`medida: 'cartoes'`) ou fracao atestada pelo professor
   * (`medida: 'atestado'`). `medidaUsada` diz qual, porque o numero sozinho nao
   * diz — e 60% de cartao e 60% de atestado nao significam a mesma coisa.
   */
  progresso: number | null
  /**
   * Como `progresso` foi obtido. `null` junto com ele.
   *
   * A TELA PRECISA DIZER ISSO, e nao e detalhe: 40% de dominio de cartao e o
   * aluno recuperando tecnica de cabeca; 40% de atestado e o professor tendo
   * confirmado 12 de 29 itens no tatame. Mostrar os dois como "Progresso" sem
   * distinguir junta o que o aluno faz sozinho com o que o professor viu.
   */
  medidaUsada: 'cartoes' | 'atestado' | null
  /**
   * Apto ao grau que ele persegue, pela regra unica de `aptidaoAoGrau`.
   *
   * NA LINHA E NAO SO NA FOLHA porque a pergunta do professor ao abrir a Central
   * e "quem esta pronto?", e responde-la hoje exige abrir a folha de cada aluno.
   * Com quatro alunos ja e quatro cliques e uma comparacao de cabeca.
   *
   * `nao-se-aplica` na maioria das linhas, e isso e o certo: quem estuda azul e
   * medido por cartoes, e "apto" nao e afirmacao que dominio de cartao sustenta.
   */
  aptidao: Aptidao
  motivo: MotivoSemProgresso | null
  /** Faixa de cor do progresso, ou `null` junto com ele. */
  faixa: FaixaDeCor | null
  /** Pontuacao por grupo tecnico. Mesma regra de `null` do progresso. */
  porGrupo: Partial<Record<GrupoTecnico, number>>
  /** Fracao do curriculo que o PROFESSOR confirmou. O eixo que so ele move. */
  validado: number | null
  /** Domina mas o professor nunca viu. A fila de trabalho dele. */
  aguardandoValidacao: number | null
  /**
   * Estes quatro valem para TODA turma, inclusive a que nao mede curriculo:
   * atividade e duvida nao dependem de qual e a prova.
   */
  diasSemEstudar: number | null
  duvidasAbertas: number
  aulasFeitas: number
  totalDeAulas: number
  /** `null` quando nunca sincronizou: nem "parado" nem "em dia" seria verdade. */
  situacao: Situacao | null
  /**
   * Cadastro de demonstracao — dado semeado, nao treinado no tatame.
   *
   * EXISTE PARA O PROFESSOR NAO SER ENGANADO PELA MINHA PROPRIA TELA. Preciso
   * ver a visao de aluno com numeros dentro dela, e o unico caminho honesto e uma
   * conta de verdade cujo estado foi semeado por login (ADR-017, decisao 5) — as
   * alternativas eram afrouxar a regra que impede o professor de escrever no
   * estado do aluno, ou sintetizar numeros na tela, que mostraria valor inventado
   * com aparencia de medido.
   *
   * Sem esta etiqueta o Prof. Joao veria em RGI um aluno que ele nunca conheceu,
   * com progresso, sem saber que sou eu. Fica desligavel: quando eu comecar a
   * treinar de verdade como Floki, o campo passa a ser mentira ao contrario.
   */
  demo: boolean
  /**
   * Contratou aulas particulares?
   *
   * DECIDE UMA COISA SO NA TELA: se o contador de particulares aparece. As aulas
   * da TURMA sao o contador principal — elas sao o gate do 1o grau — e os
   * particulares sao servico contratado, que a maioria da turma nao tem.
   * Mostrar "0 de 10 particulares" para quem nunca contratou inventaria uma
   * divida inexistente.
   */
  temParticulares: boolean
}

/**
 * A derivacao, em UM lugar.
 *
 * A MESMA ORDEM DO APP DO ALUNO: correcoes do professor primeiro
 * (`aplicarValidacoes`), baralho depois, progresso por ultimo. A linha da tabela
 * e a pagina de um aluno passam as duas por aqui — se cada uma derivasse por
 * conta propria, a tabela poderia dizer 62% e a pagina do mesmo aluno 58%, e
 * ninguem saberia qual acreditar.
 */
function derivarPorItem(estado: EstadoPersistido, curriculo: Curriculo, agora: Date) {
  const itens = aplicarValidacoes(curriculo.itens, estado.validacoes)
  const baralho = gerarBaralho({
    itens,
    conteudos: curriculo.conteudos,
    requisitos: curriculo.requisitos,
    cartoesTeoria: curriculo.cartoesTeoria,
  })
  return progressoPorItem(itens, baralho, estado.revisoes, agora)
}

/**
 * Tudo o que sai dos CARTOES de um aluno, num lugar so.
 *
 * EXTRAIDO PORQUE PASSOU A TER DOIS CHAMADORES. O ramo de atestado apagava
 * `porGrupo`, `validado` e `aguardandoValidacao` — assumindo que quem e medido
 * por atestado nao tem cartao. Deixou de ser verdade quando o Henrique e o Floki
 * passaram a estudar AZUL perseguindo o 1o grau: o numero do cabecalho vem da
 * prova, e as seis colunas de grupo continuam vindo do cartao.
 *
 * Sem esta funcao, os dois ramos repetiriam as quatro linhas de derivacao — e o
 * cabecalho deste arquivo existe justamente para nao haver dois calculos.
 */
function cartoes(estado: EstadoPersistido, curriculo: Curriculo, agora: Date) {
  const porItem = derivarPorItem(estado, curriculo, agora)
  const geral = prontidao(porItem)
  const porGrupo: Partial<Record<GrupoTecnico, number>> = {}
  for (const g of progressoPorGrupoTecnico(porItem)) {
    porGrupo[g.chave as GrupoTecnico] = g.pontuacao
  }
  return {
    porGrupo,
    geral,
    validado: geral.validado,
    aguardandoValidacao: geral.dominadoSemValidacao,
  }
}

/** O esqueleto de uma linha sem nenhuma medida. Base dos dois casos abaixo. */
function linhaVazia(
  entrada: {
    uid: string
    nome: string
    turma: string
    meta: string
    estuda: string
    demo?: boolean
    temParticulares?: boolean
  },
  motivo: MotivoSemProgresso,
): LinhaDaCentral {
  return {
    ...entrada,
    demo: entrada.demo ?? false,
    temParticulares: entrada.temParticulares ?? false,
    progresso: null,
    medidaUsada: null,
    aptidao: 'nao-se-aplica',
    motivo,
    faixa: null,
    porGrupo: {},
    validado: null,
    aguardandoValidacao: null,
    diasSemEstudar: null,
    duvidasAbertas: 0,
    aulasFeitas: 0,
    totalDeAulas: 0,
    situacao: null,
  }
}

/** Aluno que TEM conta, entrou, e cujo estado nunca chegou ao servidor. */
export function linhaSemDados(entrada: {
  uid: string
  nome: string
  turma: string
  meta: string
  estuda: string
  demo?: boolean
  temParticulares?: boolean
}): LinhaDaCentral {
  return linhaVazia(entrada, 'sem-dados')
}

/**
 * Pessoa CONVIDADA que nunca entrou. O convite e o pre-cadastro (ADR-017,
 * decisao 4).
 *
 * NAO INVENTA COLECAO NOVA: `convites/{email}` ja guarda `nome`, `turma` e
 * `meta` — faltava so renderizar. O que ele pediu ("ja coloque na central os
 * alunos") ja existia como estado, invisivel.
 *
 * `uid` RECEBE O E-MAIL, e nao um id vazio nem um id inventado: e a unica chave
 * que existe antes do primeiro login, e e o que a tela usa para cancelar o
 * convite. Ver o comentario de `LinhaDaCentral.uid`.
 */
export function linhaConvidada(entrada: {
  email: string
  nome: string
  turma: string
  meta: string
  estuda: string
}): LinhaDaCentral {
  const { email, ...resto } = entrada
  return linhaVazia({ ...resto, uid: email }, 'convidado')
}

export function linhaDoAluno({
  uid,
  nome,
  turma,
  meta,
  estuda,
  demo = false,
  temParticulares = false,
  estado,
  competentes = null,
  curriculo,
  curriculoDaProva,
  agora,
}: {
  uid: string
  nome: string
  turma: string
  /** A prova que ele persegue. Nao decide mais a medida — ver `estuda`. */
  meta: string
  /** O curriculo que ele treina. Decide a medida (`curriculo.medida`). */
  estuda: string
  demo?: boolean
  temParticulares?: boolean
  estado: EstadoPersistido
  /** O curriculo DE `estuda` — o conteudo que ele treina, medido por cartao. */
  curriculo: Curriculo | null
  /**
   * O curriculo DA PROVA que ele persegue (`meta`). `null` quando nao ha lista.
   *
   * ---------------------------------------------------------------------------
   * ELE DECIDE O NUMERO QUANDO E MEDIDO POR ATESTADO, e essa precedencia conserta
   * um defeito que eu criei em 10/09/2026.
   *
   * Naquele dia eu troquei o `estuda` do Henrique de `1grau` para `azul` — com
   * `1grau` o app nao tinha o que ensinar a ele. Consequencia imediata e nao
   * prevista pelo professor: a coluna Progresso passou a medir DOMINIO DE CARTAO,
   * e as dez competencias que ele acabara de atestar sairam do numero. Ele
   * perguntou: "atualizei os dados do Henrique no atestado, pode atualizar para
   * refletir no progresso por aluno?".
   *
   * A pergunta que a coluna responde e "quao perto ele esta do que persegue?", e
   * quem responde isso e a PROVA. Dominio de cartao responde outra ("o que ele
   * decorou sozinho no app") e e o mais fraco dos tres eixos — a regra dele:
   * dominio != validado != funciona sob resistencia.
   *
   * MESMA PRECEDENCIA DE `curriculoParaAtestar`: a lista da prova primeiro, a do
   * que ele treina como reserva. Aquela funcao existe porque esta regra ja esteve
   * errada duas vezes escrita como ternario em JSX.
   * ---------------------------------------------------------------------------
   */
  curriculoDaProva: Curriculo | null
  /**
   * OS ITENS que o PROFESSOR atestou — o conjunto de ids, e nao uma contagem.
   *
   * ERA UMA CONTAGEM, E ISSO ESCONDIA UM BUG QUE NUNCA DISPAROU. O numero vinha
   * de `itensCompetentes(registros).size`: TODAS as atestacoes do aluno, sem
   * interseccao com o curriculo medido. O Floki tem 51 registros de competencia
   * — a folha mostra a lista de azul quando a da meta nao serve —, e medi-lo
   * contra os 29 do 1o grau daria 51/29 = 176%. So nao disparou porque a medida
   * vinha do `estuda`, e ninguem com `estuda: '1grau'` tinha atestacao de fora.
   *
   * Com o conjunto, a interseccao acontece aqui e o denominador e sempre o
   * curriculo que esta sendo medido.
   *
   * `null` significa "nao conseguimos ler as atestacoes", e NAO "zero atestadas"
   * — a distincao e a razao de o parametro nao ter default vazio. Com default,
   * uma falha de leitura viraria 0% e o professor concluiria que nao atestou
   * nada.
   */
  competentes?: ReadonlySet<string> | null
  agora: Date
}): LinhaDaCentral {
  // O resumo ja resolve atividade, duvidas e aulas — e ja tem teste. As datas de
  // troca por arquivo nao se aplicam aqui (o dado veio da nuvem), entao valem
  // `agora`: nenhum campo desta tela as usa.
  const iso = agora.toISOString()
  const resumo = resumoDoAluno(estado, { importadoEm: iso, exportadoEm: iso, agora })

  const base = {
    uid,
    meta,
    estuda,
    demo,
    temParticulares,
    // O nome do CADASTRO manda, e nao o do perfil local. Quem renomeia a si
    // mesmo no aparelho nao renomeia a linha da central do professor.
    nome: nome.trim() === '' ? resumo.nome : nome,
    turma,
    diasSemEstudar: resumo.diasSemEstudar,
    duvidasAbertas: resumo.duvidasAbertas,
    aulasFeitas: resumo.aulasFeitas,
    totalDeAulas: resumo.totalDeAulas,
    situacao: situacaoDoAluno(resumo),
  }

  /**
   * Sem curriculo para o que ele estuda: atividade sim, progresso nao.
   *
   * A CONDICAO ENCOLHEU e isso e ganho da separacao `meta`/`estuda`: era
   * `!metaTemCurriculo(meta) || curriculo === null`, duas perguntas que podiam
   * discordar — uma meta marcada `temCurriculo: true` cujo seed nao resolvesse
   * passaria pela primeira e morreria na segunda. Agora ha uma so fonte: existe
   * o curriculo do que ele estuda, ou nao existe.
   */
  if (curriculo === null) {
    return {
      ...base,
      progresso: null,
      medidaUsada: null,
      aptidao: 'nao-se-aplica',
      motivo: 'sem-curriculo',
      faixa: null,
      porGrupo: {},
      validado: null,
      aguardandoValidacao: null,
    }
  }

  /**
   * QUAL CURRICULO DA O NUMERO: a PROVA, quando ela e medida por atestado.
   *
   * A prova primeiro e o que ele treina como reserva — a mesma precedencia de
   * `curriculoParaAtestar`. Ver o comentario de `curriculoDaProva` para o
   * defeito que isto conserta e a data.
   *
   * NAO E "meta sempre": com `meta: '3grau'` (lista que nao chegou)
   * `curriculoDaProva` e `null`, e a medida cai no que ele estuda — que era
   * exatamente o caso que a decisao 6 do ADR-017 protegeu.
   */
  const daProvaPorAtestado = curriculoDaProva?.medida === 'atestado' ? curriculoDaProva : null

  /**
   * Os itens do curriculo medido que o professor atestou.
   *
   * INTERSECCAO E NAO A CONTAGEM CRUA: o Floki tem 51 atestacoes (a folha mostra
   * a lista de azul quando a da meta nao serve) e medi-lo contra os 29 do 1o grau
   * daria 51/29 = 176%. Ver `competentes`.
   */
  const atestadosDe = (c: Curriculo): number | null =>
    competentes === null ? null : c.itens.filter((i) => i.ativo && competentes.has(i.id)).length

  if (daProvaPorAtestado !== null) {
    const total = daProvaPorAtestado.itens.filter((i) => i.ativo).length
    const atestados = atestadosDe(daProvaPorAtestado)
    const semNumero = atestados === null || total === 0
    const fracao = semNumero ? null : atestados! / total

    /**
     * OS DADOS DE CARTAO SOBREVIVEM, e antes nao sobreviviam.
     *
     * O ramo antigo devolvia `porGrupo: {}` e `validado: null` porque assumia que
     * quem e medido por atestado nao tem cartao — verdade para `estuda: '1grau'`,
     * onde os 29 itens vem sem passo a passo. Mas o Henrique e o Floki estudam
     * AZUL e perseguem o 1o grau: eles tem as duas coisas, e apagar o lado do
     * cartao para trocar o numero do cabecalho seria consertar uma coluna
     * quebrando as outras seis.
     *
     * `null` quando o que ele estuda nao e medido por cartao — ai nao ha o que
     * preservar.
     */
    const doCartao =
      curriculo.medida === 'cartoes' ? cartoes(estado, curriculo, agora) : null

    return {
      ...base,
      // `null` so quando NAO CONSEGUIMOS LER as atestacoes. Zero atestadas e um
      // numero, e ele precisa aparecer: e o primeiro dia de todo aluno novo.
      progresso: fracao,
      medidaUsada: 'atestado',
      aptidao: aptidaoAoGrau({ curriculo: daProvaPorAtestado, competentes: atestados }),
      motivo: semNumero ? 'atestado-nao-lido' : null,
      faixa: fracao === null ? null : faixaDaPontuacao(fracao),
      porGrupo: doCartao?.porGrupo ?? {},
      validado: doCartao?.validado ?? null,
      aguardandoValidacao: doCartao?.aguardandoValidacao ?? null,
    }
  }

  /**
   * Sem prova medida por atestado, o curriculo que ele ESTUDA decide — inclusive
   * quando ele proprio e medido por atestado (o caso `estuda: '1grau'`).
   */
  if (curriculo.medida === 'atestado') {
    const total = curriculo.itens.filter((i) => i.ativo).length
    const atestados = atestadosDe(curriculo)
    const semNumero = atestados === null || total === 0
    const fracao = semNumero ? null : atestados! / total
    return {
      ...base,
      progresso: fracao,
      medidaUsada: 'atestado',
      aptidao: aptidaoAoGrau({ curriculo, competentes: atestados }),
      motivo: semNumero ? 'atestado-nao-lido' : null,
      faixa: fracao === null ? null : faixaDaPontuacao(fracao),
      // POR GRUPO FICA VAZIO: as colunas da tabela sao dominio de CARTAO por
      // grupo tecnico, e um curriculo de atestado nao tem cartao para derivar.
      porGrupo: {},
      validado: null,
      aguardandoValidacao: null,
    }
  }

  const { porGrupo, geral } = cartoes(estado, curriculo, agora)

  return {
    ...base,
    progresso: geral.dominio,
    medidaUsada: 'cartoes',
    /* `nao-se-aplica` e nao um calculo: dominio de cartao nao sustenta a palavra
       "apto". Ver as ressalvas em `aptidaoAoGrau`. */
    aptidao: 'nao-se-aplica',
    motivo: null,
    faixa: faixaDaPontuacao(geral.dominio),
    porGrupo,
    validado: geral.validado,
    aguardandoValidacao: geral.dominadoSemValidacao,
  }
}

// ---------------------------------------------------------------------------
// Detalhe de um aluno
// ---------------------------------------------------------------------------

/** Uma tecnica esperando o olho do professor. */
export interface ItemEsperando {
  itemId: string
  /** O que a prova cobra naquela vaga (ex.: "Raspada 1"). */
  slot: string
  /** O nome da variacao, quando existe. Pode estar vazio no curriculo. */
  nome: string
  posicao: string
}

export interface DetalheDoAluno {
  dominio: number
  validado: number
  /**
   * Tecnicas que o aluno recupera com seguranca e o professor nunca viu.
   *
   * NAO E UM NUMERO, E UMA LISTA, e a diferenca e o que a torna util: "7 itens
   * esperando" informa; "Raspada 1 da Guarda Aranha, Passagem 2 da Meia Guarda"
   * e a pauta da aula particular. O contador ja aparece na tabela — aqui o
   * professor precisa saber O QUE olhar.
   */
  esperando: ItemEsperando[]
  /** Por grupo tecnico: as mesmas colunas da tabela, agora com contagem. */
  porGrupo: ProgressoDeGrupo[]
  /** Por posicao do curriculo: as guardas, que na tabela nao cabiam. */
  porPosicao: ProgressoDeGrupo[]
  /** As tres posicoes mais fracas — de onde sai a proxima aula. */
  maisFracas: ProgressoDeGrupo[]
  /** Nenhuma revisao ainda: a tela precisa dizer isso em vez de mostrar zeros. */
  nadaAinda: boolean
}

export function detalheDoAluno({
  estado,
  curriculo,
  agora,
}: {
  estado: EstadoPersistido
  curriculo: Curriculo
  agora: Date
}): DetalheDoAluno {
  const porItem = derivarPorItem(estado, curriculo, agora)
  const geral = prontidao(porItem)
  const porPosicao = progressoPorPosicao(porItem)

  return {
    dominio: geral.dominio,
    validado: geral.validado,
    esperando: porItem
      .filter((p) => p.dominio === 'dominado' && !p.validado)
      .map((p) => ({
        itemId: p.item.id,
        slot: p.item.slot,
        nome: p.item.nome,
        posicao: p.item.posicao,
      })),
    porGrupo: progressoPorGrupoTecnico(porItem),
    porPosicao: [...porPosicao].sort((a, b) => b.pontuacao - a.pontuacao),
    maisFracas: gruposMaisFracos(porPosicao, 3),
    // "Nada ainda" e nenhuma pontuacao, e nao nenhum item dominado: com a
    // etiqueta estrita a tela diria "nada estudado" ao lado de barras com valor.
    nadaAinda: porItem.every((p) => p.pontuacao === 0),
  }
}

// ---------------------------------------------------------------------------
// Montagem das linhas da academia
// ---------------------------------------------------------------------------

/** O minimo que esta funcao precisa saber de um cadastro. */
export interface CadastroNaLista {
  uid: string
  nome: string
  papel: string
  turma: string
  meta: string
  estuda: string
  ativo: boolean
  demo?: boolean
  temParticulares?: boolean
}

/** O minimo que esta funcao precisa saber de um convite pendente. */
export interface ConviteNaLista {
  email: string
  nome: string
  papel: string
  turma: string
  meta: string
  estuda: string
}

/**
 * Transforma cadastros + estados nas linhas da central.
 *
 * PURA, E POR UM MOTIVO CONCRETO: duas telas montam essas linhas — a Central no
 * computador e a aba do professor no celular. Se cada uma montasse por conta
 * propria, um filtro diferente num lado (esquecer `ativo`, incluir professores,
 * ordenar de outro jeito) faria as duas discordarem sobre a mesma academia no
 * mesmo minuto, e nao haveria como saber qual estava certa.
 *
 * A BUSCA fica fora daqui de proposito: `abrirCentral` faz o I/O, isto faz a
 * conta. E o que permite testar as regras de filtro sem rede.
 *
 * SO ALUNO ATIVO. O professor e o admin tem cadastro em `pessoas` e apareceriam
 * como linha sem progresso — que nao e um aluno parado. Desativado sai porque as
 * regras ja negam a leitura do estado dele: ficaria como "nunca sincronizou",
 * que seria mentira.
 *
 * O CONVIDADO ENTRA (ADR-017, decisao 4), e essa e a mudanca que faz a turma real
 * aparecer inteira: quem foi convidado e nunca entrou e um aluno da turma sem
 * nenhuma medida, e nao uma pessoa inexistente. Ele vale no denominador e nao na
 * media — ver `mediaDaTurma`.
 */
export function linhasDaAcademia({
  cadastros,
  convites = [],
  estados,
  competentes,
  curriculoPorId,
  agora,
}: {
  cadastros: readonly CadastroNaLista[]
  /**
   * Convites pendentes. Opcional porque a aba do professor no celular ainda nao
   * os busca — e uma lista vazia produz exatamente o comportamento anterior.
   */
  convites?: readonly ConviteNaLista[]
  estados: ReadonlyMap<string, EstadoPersistido>
  /**
   * OS ITENS que o professor atestou, por uid. Ausente do mapa = nao lido.
   *
   * CONJUNTO DE IDS E NAO CONTAGEM: quem faz a interseccao com o curriculo
   * medido e `linhaDoAluno`, porque so ele sabe qual curriculo esta medindo. Uma
   * contagem crua produzia 51/29 = 176% para quem tem atestacao fora da lista da
   * prova — ver `competentes` em `linhaDoAluno`.
   *
   * OPCIONAL PORQUE SO IMPORTA A QUEM E MEDIDO POR ATESTADO. Passar sempre
   * obrigaria a Central a ler `competencias` de vinte alunos para usar em dois.
   */
  competentes?: ReadonlyMap<string, ReadonlySet<string>>
  /**
   * O curriculo de um id de curriculo. `null` quando nao existe lista para ele.
   *
   * FUNCAO, E NAO UM CURRICULO SO: alunos da mesma turma estudam curriculos
   * diferentes, entao a lista resolve um POR LINHA. Um curriculo unico obrigaria
   * a escolher uma prova para todo mundo — o que a decisao 3 do ADR-016 recusou.
   *
   * RECEBE `estuda` E NAO `meta` (ADR-017, decisao 6). O parametro se chamava
   * `curriculoDaMeta`, e o nome escondia o erro: chamado com a minha meta
   * (`3grau`) ele devolvia `null`, e eu aparecia sem progresso com 81 itens em
   * estudo.
   */
  curriculoPorId: (estuda: string) => Curriculo | null
  agora: Date
}): LinhaDaCentral[] {
  const dosCadastros = cadastros
    .filter((p) => p.papel === 'aluno' && p.ativo)
    .map((p) => {
      const e = estados.get(p.uid)
      const base = {
        uid: p.uid,
        nome: p.nome,
        turma: p.turma,
        meta: p.meta,
        estuda: p.estuda,
        demo: p.demo ?? false,
        temParticulares: p.temParticulares ?? false,
      }
      // Ausente do mapa = nunca sincronizou. NAO e zero, e nao sabemos.
      if (!e) return linhaSemDados(base)
      return linhaDoAluno({
        ...base,
        estado: e,
        curriculo: curriculoPorId(p.estuda),
        /* O curriculo da PROVA, alem do que ele estuda: ele decide o numero
           quando e medido por atestado. Ver `curriculoDaProva`. */
        curriculoDaProva: curriculoPorId(p.meta),
        // `?? null` e nao um Set vazio: fora do mapa significa "nao lido", e virar
        // vazio faria falha de leitura parecer professor que nao atestou nada.
        competentes: competentes?.get(p.uid) ?? null,
        agora,
      })
    })

  const dosConvites = convites
    .filter((c) => c.papel === 'aluno')
    .map((c) =>
      linhaConvidada({
        email: c.email,
        nome: c.nome,
        turma: c.turma,
        meta: c.meta,
        estuda: c.estuda,
      }),
    )

  return [...dosCadastros, ...dosConvites]
}

// ---------------------------------------------------------------------------
// Agregacao da turma
// ---------------------------------------------------------------------------

export interface MediaDaTurma {
  /** `null` quando nenhuma linha tem progresso medivel. */
  progresso: number | null
  faixa: FaixaDeCor | null
  /** Quantos alunos entraram na media. */
  considerados: number
  /** Quantos alunos existem na selecao. */
  total: number
  /** Por que os de fora ficaram de fora, para a tela poder dizer. */
  fora: Record<MotivoSemProgresso, number>
}

/**
 * Media dos alunos, contando so quem tem progresso medivel.
 *
 * QUEM NUNCA SINCRONIZOU FICA FORA (ADR-015, decisao 7). Conta-lo como zero
 * deixaria a media presa e, pior, INSTAVEL: no dia em que ele finalmente abrisse
 * o app com 55%, a media saltaria — e o professor atribuiria o salto ao ensino
 * dele, e nao a chegada de um dado que sempre existiu.
 *
 * MEDIA DOS ALUNOS, e nao dos itens de todos juntos. Cada aluno pesa igual: a
 * pergunta e "como vai a turma", e nao "quantas tecnicas a turma sabe somando
 * todo mundo" — nessa segunda, quem estuda mais mascara quem parou.
 *
 * `considerados` e `total` saem juntos de proposito. Uma media com denominador
 * escondido e a forma mais facil de mentir com um numero verdadeiro.
 */
export function mediaDaTurma(linhas: readonly LinhaDaCentral[]): MediaDaTurma {
  const fora: Record<MotivoSemProgresso, number> = {
    // Convidado que nunca entrou. FICA NO DENOMINADOR e fora da media: a turma
    // tem quatro alunos e um estudando, e os dois numeros sao a informacao. Se
    // ele fosse zero, a media ficaria presa e SALTARIA no dia do primeiro login
    // — e o professor atribuiria o salto ao ensino dele. Se ele nao existisse na
    // lista, a turma pareceria ter um aluno.
    convidado: 0,
    'sem-dados': 0,
    'sem-curriculo': 0,
    // Atestacoes ilegiveis: FALHA DE LEITURA, e nao ausencia de atestado. Contar
    // junto com "sem curriculo" faria a tela dizer que falta lista, quando falta
    // conexao.
    'atestado-nao-lido': 0,
  }
  let soma = 0
  let considerados = 0

  for (const l of linhas) {
    if (l.progresso === null) {
      if (l.motivo) fora[l.motivo] += 1
      continue
    }
    soma += l.progresso
    considerados += 1
  }

  const progresso = considerados === 0 ? null : soma / considerados
  return {
    progresso,
    faixa: progresso === null ? null : faixaDaPontuacao(progresso),
    considerados,
    total: linhas.length,
    fora,
  }
}

export interface CartaoDaCentral {
  chave: string
  rotulo: string
  /** `null` quando nao ha base para calcular. A tela mostra `—`. */
  valor: number | null
  /** `fracao` desenha 0-100%; `contagem` desenha o numero cru. */
  formato: 'fracao' | 'contagem'
  faixa: FaixaDeCor | null
  /** Uma linha explicando o que o numero responde. */
  apoio: string
}

/**
 * Media de uma fracao entre as linhas que a tem.
 *
 * `null` quando nenhuma tem — que e diferente de zero, pelo mesmo motivo do
 * resto deste arquivo.
 */
function mediaDe(
  linhas: readonly LinhaDaCentral[],
  de: (l: LinhaDaCentral) => number | null | undefined,
): number | null {
  let soma = 0
  let n = 0
  for (const l of linhas) {
    const v = de(l)
    if (typeof v !== 'number') continue
    soma += v
    n += 1
  }
  return n === 0 ? null : soma / n
}

/**
 * Os seis cartoes do topo — ADR-015, decisao 8.
 *
 * TRES TECNICOS E TRES DE ACAO, e a divisao responde duas perguntas diferentes
 * na mesma varredura: "o que eu dou na proxima aula" e "quem esta me esperando".
 *
 * Os tres tecnicos sao MEDIA DA TURMA. No nivel do aluno eles diagnosticam; no
 * da turma eles sao pauta — se a RGI esta com 30% em passagens e 70% em
 * raspagens, isso e o tema da semana, e nao um problema individual.
 *
 * Os cartoes tecnicos seguem os grupos que EXISTEM (`gruposComItens`): um cartao
 * "Quedas: —" ocuparia um sexto da area mais nobre da tela para dizer que o
 * modulo esta desativado.
 */
export function cartoesDaTurma(
  linhas: readonly LinhaDaCentral[],
  grupos: readonly GrupoTecnico[],
  rotuloDoGrupo: (g: GrupoTecnico) => string,
): CartaoDaCentral[] {
  const tecnicos = grupos.slice(0, 3).map((g): CartaoDaCentral => {
    const valor = mediaDe(linhas, (l) => l.porGrupo[g])
    return {
      chave: g,
      rotulo: rotuloDoGrupo(g),
      valor,
      formato: 'fracao',
      faixa: valor === null ? null : faixaDaPontuacao(valor),
      apoio: 'média da turma',
    }
  })

  const validado = mediaDe(linhas, (l) => l.validado)
  const aguardando = linhas.reduce((s, l) => s + (l.aguardandoValidacao ?? 0), 0)
  const parados = linhas.filter((l) => l.situacao !== null && l.situacao !== 'em-dia').length

  return [
    ...tecnicos,
    {
      chave: 'validado',
      rotulo: 'Validado por você',
      valor: validado,
      formato: 'fracao',
      faixa: validado === null ? null : faixaDaPontuacao(validado),
      apoio: 'o eixo que só você move',
    },
    {
      chave: 'aguardando',
      rotulo: 'Aguardando sua validação',
      valor: aguardando,
      formato: 'contagem',
      // Sem faixa de cor: e fila de trabalho, nao desempenho. Pintar de vermelho
      // transformaria "tem trabalho a fazer" em "esta ruim".
      faixa: null,
      apoio: 'o aluno recupera, você ainda não viu',
    },
    {
      chave: 'parados',
      rotulo: 'Parados há 7+ dias',
      valor: parados,
      formato: 'contagem',
      faixa: null,
      apoio: 'inclui quem nunca estudou',
    },
  ]
}

/**
 * Ordem das linhas: quem precisa de atencao primeiro.
 *
 * REAPROVEITA A REGRA DA TORRE em vez de ordenar por progresso. O comentario de
 * `ordenarPorAtencao` explica por que nao e alfabetica, e o mesmo argumento vale
 * aqui — com vinte alunos, ordenar por progresso esconde quem parou no meio da
 * tabela, e achar essa pessoa e a razao de a central existir.
 *
 * Quem nunca sincronizou vem PRIMEIRO: e o unico caso em que nao ha nem dado
 * para avaliar, e o mais provavel de ser um aluno que nunca conseguiu entrar.
 */
export function ordenarLinhas(linhas: readonly LinhaDaCentral[]): LinhaDaCentral[] {
  const peso = (l: LinhaDaCentral): number => {
    if (l.motivo === 'sem-dados') return 3
    if (l.situacao === 'nunca-estudou') return 2
    if (l.situacao === 'parado') return 1
    return 0
  }
  return [...linhas].sort((a, b) => {
    const pa = peso(a)
    const pb = peso(b)
    if (pa !== pb) return pb - pa
    // Dentro do mesmo peso: mais dias sem estudar primeiro.
    const da = a.diasSemEstudar ?? 0
    const db = b.diasSemEstudar ?? 0
    if (da !== db) return db - da
    return a.nome.localeCompare(b.nome, 'pt-BR')
  })
}
