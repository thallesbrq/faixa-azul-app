/**
 * QUE ITENS DO CURRICULO DE AZUL SATISFAZEM CADA REQUISITO DO 1o GRAU.
 *
 * ---------------------------------------------------------------------------
 * O DEFEITO QUE ISTO CONSERTA, medido em producao em 08/09/2026.
 *
 * `ITENS_1GRAU` (29 ids `g1-*`) e `CURRICULO_AZUL.itens` (81 ids) nao
 * compartilham NENHUM id, mas descrevem tecnicas que se sobrepoem. O bolsao do
 * Planner oferece os itens de AZUL; a matriz de acompanhamento conta os do 1o
 * GRAU. Consequencia: a aula 1 da RGI ensinou rolamento para frente, rolamento
 * para tras, fuga de quadril e o soto gari — quatro requisitos do 1o grau — e a
 * matriz mostrava "0 de 29 itens ja foram dados em aula", com Ukemi, Rolamentos e
 * Fuga de quadril marcados "fora do programa".
 *
 * A prova de que sao dois universos e a aula 2 do programa real: ela contem
 * `g1-edu--levantada-tecnica` E `base-movimentacao--levantada-tecnica` — a mesma
 * tecnica fisica, duas vezes, uma de cada lado.
 * ---------------------------------------------------------------------------
 *
 * TABELA E NAO FUSAO DOS CURRICULOS, e a razao e a GRANULARIDADE. O 1o grau pede
 * "Ukemi" (um requisito); o azul ensina `ukemi-frente`, `ukemi-costas` e
 * `ukemi-lateral` (tres itens, tres cartoes). Uma fusao teria de escolher um dos
 * dois lados e perderia o outro: ou o requisito da prova, ou o cartao de estudo.
 * Uma tabela expressa 1 para N, que e a relacao que existe de fato.
 *
 * A REGRA DE LEITURA e "ou/ou", e ela vive em `application/acompanhamento`:
 *
 *   1. se o proprio id `g1-*` esta no programa, e ele que vale — o professor
 *      programou o REQUISITO, que e o sinal mais forte que existe;
 *   2. senao, TODOS os equivalentes precisam ter sido dados. Decisao do
 *      professor, nas palavras dele: "ukemi conta como todos frente, costas e
 *      lateral". A tela mostra o parcial ("2 de 3 partes") para que um requisito
 *      pela metade fique visivel em vez de desaparecer.
 *
 * SO ENTRA O QUE E INEQUIVOCAMENTE A MESMA TECNICA. Um mapeamento errado diz ao
 * professor que algo foi ensinado quando nao foi, e essa e a metade do portao do
 * 1o grau que depende de programa — errar para esse lado esvazia o portao em
 * silencio. Requisito sem equivalente aqui aparece como "fora do programa" na
 * matriz: uma lacuna VISIVEL, que ele corrige. Errado e invisivel; ausente e
 * visivel.
 *
 * 13 DOS 29 NAO TEM EQUIVALENTE, e nao e omissao — e o desenho dos dois
 * curriculos. O azul se organiza em torno de GUARDAS E PASSAGENS e nao enumera
 * "dominar a montada" nem ataque a partir dos 100 kg; o 1o grau cobra as duas
 * coisas. Esses 13 estao no programa com o proprio id `g1-*` (a sugestao do 1o
 * grau os pos la) e a regra 1 acima ja os le.
 */

/**
 * Requisito do 1o grau -> itens de azul que, JUNTOS, o satisfazem.
 *
 * Chave ausente = sem equivalente conhecido. Lista vazia nunca aparece aqui: ela
 * seria indistinguivel de "ainda nao pesquisei", e a diferenca importa.
 */
export const EQUIVALENTES_DO_1GRAU: Readonly<Record<string, readonly string[]>> = {
  // -- Quedas ---------------------------------------------------------------
  /**
   * "Baiana" e o nome brasileiro do double leg. O azul nao tem entrada chamada
   * "double leg" entre as quedas (`o-soto-gari`, `baiana`, `single-leg`,
   * `uchi-mata`, `arm-drag`), e `baiana` e a unica que e a mesma tecnica.
   *
   * NAO confundir com `guarda-aberta--raspada-2` ("Xicara / double leg sentado"):
   * aquela e raspagem da guarda aberta, nao queda em pe.
   */
  'g1-quedas--double-leg': ['quedas--baiana'],
  'g1-quedas--single-leg': ['quedas--single-leg'],
  'g1-quedas--osoto-gari': ['quedas--o-soto-gari'],

  // -- Guarda fechada -------------------------------------------------------
  'g1-gf--passagem-simples': ['guarda-fechada--passagem-simples'],
  'g1-gf--raspagem-tesoura': ['guarda-fechada--raspada-1'],
  'g1-gf--raspagem-pendulo': ['guarda-fechada--raspada-2'],
  /**
   * O 1o grau arquiva a raspagem tripe sob "Guarda fechada"; o azul a arquiva sob
   * "Guarda Aberta" (`guarda-aberta--raspada-1`, "Tripe / pe no quadril"). A
   * TECNICA e a mesma — pe no quadril, desequilibrio para tras — e e a tecnica que
   * decide, nao a gaveta. Tripod sweep vem da guarda aberta de fato; a gaveta do
   * 1o grau e do exame da academia.
   */
  'g1-gf--raspagem-tripe': ['guarda-aberta--raspada-1'],

  // -- Educativos -----------------------------------------------------------
  /** Um requisito, tres itens de azul. Com a regra 2, os tres sao necessarios. */
  'g1-edu--ukemi': [
    'base-movimentacao--ukemi-frente',
    'base-movimentacao--ukemi-costas',
    'base-movimentacao--ukemi-lateral',
  ],
  'g1-edu--levantada-tecnica': ['base-movimentacao--levantada-tecnica'],
  /** O nome do requisito ja diz os dois: "Rolamentos (frente e costas)". */
  'g1-edu--rolamentos': [
    'base-movimentacao--rolamento-para-frente',
    'base-movimentacao--rolamento-para-tras',
  ],
  /**
   * SO A TRADICIONAL. O azul tem `fuga-de-quadril-tradicional` e
   * `fuga-de-quadril-avancada`; o 1o grau pede "Fuga de quadril", que e a basica.
   * Exigir a avancada faria o requisito depender de conteudo que a prova nao
   * cobra — e com a regra 2, ele ficaria pendente para sempre.
   */
  'g1-edu--fuga-de-quadril': ['base-movimentacao--fuga-de-quadril-tradicional'],

  // -- Finalizacoes da guarda fechada ---------------------------------------
  'g1-fin-gf--cruzado': ['guarda-fechada--estrangulamento-1'],
  'g1-fin-gf--armlock': ['guarda-fechada--armlock'],
  'g1-fin-gf--triangulo': ['guarda-fechada--triangulo'],

  // -- Saidas ---------------------------------------------------------------
  /**
   * O azul ensina cada saida em DUAS entradas (dois caminhos da mesma saida), e o
   * 1o grau cobra "a saida". Com a regra 2 as duas sao necessarias — o que casa
   * com o exame: o aluno mostra a saida, e mostrar so um caminho e meia saida.
   */
  'g1-saida--100kg': ['saidas--saida-dos-100-kg-1', 'saidas--saida-dos-100-kg-2'],
  'g1-saida--montada': ['saidas--saida-da-montada-1', 'saidas--saida-da-montada-2'],

  // -------------------------------------------------------------------------
  // A CONFERIR COM O PROFESSOR — quatro casos em que eu NAO tenho certeza de que
  // a tecnica e a mesma, e por isso ficaram FORA. Enquanto estiverem fora, a
  // matriz os mostra como "fora do programa" quando o `g1-*` nao estiver
  // programado, o que e visivel e corrigivel. Os candidatos que eu considerei:
  //
  //   g1-gf--passagem-emborcando  "Passagem emborcando"
  //       candidato: guarda-fechada--passagem-quebrando-o-joelho
  //                  ("Abertura com joelho no coccix / log split")
  //       duvida: "emborcando" e empilhar o adversario; log split e abrir a
  //       guarda com o joelho. Podem ser fases da mesma passagem ou duas
  //       passagens diferentes.
  //
  //   g1-gf--costas-do-pendulo  "Ida para as costas a partir da raspagem pendulo"
  //       candidato: guarda-fechada--esgrima-com-ida-para-as-costas
  //                  ("Esgrimada com ida para as costas / arm drag")
  //       duvida: as duas chegam as costas da guarda fechada, mas por caminhos
  //       diferentes (pendulo x arm drag).
  //
  //   g1-fin-costas--mata-leao   "Mata-leao"
  //   g1-fin-costas--lapela      "Estrangulamento de lapela" (das costas)
  //       candidato para os dois: guarda-de-la-riva--finalizacao-2
  //                  ("Mata-leao / estrangulamento das costas")
  //       duvida: a tecnica bate, mas o azul a arquiva como finalizacao da Dela
  //       Riva. Mapear faria "programei a finalizacao da Dela Riva" contar como
  //       "ensinei os ataques das costas".
  // -------------------------------------------------------------------------
}

/**
 * Os itens de azul que satisfazem um requisito. Lista vazia = sem equivalente.
 *
 * Funcao e nao acesso direto ao objeto para que o resto do codigo nao precise
 * saber que "ausente" e "vazio" sao a mesma coisa na leitura e coisas diferentes
 * na tabela.
 */
export function equivalentesDe(requisitoId: string): readonly string[] {
  return EQUIVALENTES_DO_1GRAU[requisitoId] ?? []
}
