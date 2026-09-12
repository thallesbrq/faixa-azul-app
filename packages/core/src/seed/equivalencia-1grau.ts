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
 * ---------------------------------------------------------------------------
 * A TABELA FOI CORRIGIDA CONTRA O DOCUMENTO DO PROFESSOR em 12/09/2026.
 *
 * Ela tinha 16 mapeados e 13 exclusivos, montados por mim item a item e com
 * quatro duvidas em aberto. O estudo que ele fez em separado
 * (`curriculo-compilado.md`) marca a origem de cada tecnica, e os numeros dele
 * fecham na unha:
 *
 *     94 tecnicas = 80 de azul + 14 exclusivas do 1o grau
 *     29 do 1o grau = 15 que existem em azul + 14 exclusivas
 *
 * (19 itens de azul levam a marca `[1o]`, e colapsam em 15 requisitos porque
 * Ukemi vale 3, Rolamentos 2 e Fuga de quadril 2.)
 *
 * Ele decidiu: "o documento vence". Cinco entradas mudaram — duas corrigindo
 * respostas que ele proprio me dera em 09/09 (fuga de quadril e a ida as costas)
 * e tres corrigindo decisoes minhas (double leg, raspagem tripe, e as saidas).
 * Cada uma esta comentada onde mudou.
 * ---------------------------------------------------------------------------
 *
 * 14 DOS 29 NAO TEM EQUIVALENTE, e nao e omissao — e o desenho dos dois
 * curriculos. O azul se organiza em torno de GUARDAS E PASSAGENS e nao enumera
 * "dominar a montada" nem ataque a partir dos 100 kg; o 1o grau cobra as duas
 * coisas. Esses 14 estao no programa com o proprio id `g1-*` (a sugestao do 1o
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
  // "Double leg" NAO entra: e exclusivo do 1o grau (#85 do compilado). Eu o havia
  // mapeado para `quedas--baiana` por serem a mesma tecnica; o documento do
  // professor separa os dois, e a Baiana fica marcada so `[Azul]`.
  'g1-quedas--single-leg': ['quedas--single-leg'],
  'g1-quedas--osoto-gari': ['quedas--o-soto-gari'],

  // -- Guarda fechada -------------------------------------------------------
  'g1-gf--passagem-simples': ['guarda-fechada--passagem-simples'],
  'g1-gf--raspagem-tesoura': ['guarda-fechada--raspada-1'],
  'g1-gf--raspagem-pendulo': ['guarda-fechada--raspada-2'],
  // "Raspagem tripe" NAO entra: e exclusiva do 1o grau (#87 do compilado). Eu a
  // havia mapeado para `guarda-aberta--raspada-1` ("Tripe / pe no quadril") por
  // serem a mesma tecnica; o documento separa.
  'g1-gf--costas-do-pendulo': ['guarda-fechada--esgrima-com-ida-para-as-costas'],

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
   * AS DUAS, e isto corrige uma resposta minha e uma dele.
   *
   * Eu havia mapeado so a tradicional, e ao perguntar em 09/09 ele confirmou "so
   * a tradicional". O `curriculo-1grau.md` do estudo dele chama o requisito de
   * "Fuga de quadril (tradicional e avancada)" e o compilado marca `[Azul, 1o]`
   * NAS DUAS (#6 e #7). Em 12/09 ele decidiu: "o documento vence".
   */
  'g1-edu--fuga-de-quadril': [
    'base-movimentacao--fuga-de-quadril-tradicional',
    'base-movimentacao--fuga-de-quadril-avancada',
  ],

  // -- Finalizacoes da guarda fechada ---------------------------------------
  'g1-fin-gf--cruzado': ['guarda-fechada--estrangulamento-1'],
  'g1-fin-gf--armlock': ['guarda-fechada--armlock'],
  'g1-fin-gf--triangulo': ['guarda-fechada--triangulo'],

  // -- Saidas ---------------------------------------------------------------
  /**
   * SO A VARIACAO "1" de cada saida, e isto tambem corrige uma decisao anterior.
   *
   * Eu exigia AS DUAS entradas de azul ("mostrar so um caminho e meia saida"), e
   * ele aprovou a regra do "todos os equivalentes" com esse exemplo em mente. O
   * compilado marca `[Azul, 1o]` apenas em "Saida de montada 1" (#71) e "Saida de
   * 100 kg 1" (#75); as variacoes "2" ficam `[Azul]` puro — sao conteudo de azul,
   * nao do 1o grau.
   *
   * Efeito colateral bom: as duas viram 1-para-1, e a regra do "todos" passa a
   * valer so para os tres requisitos cujo PROPRIO NOME lista as variacoes (ukemi,
   * rolamentos, fuga de quadril).
   */
  'g1-saida--100kg': ['saidas--saida-dos-100-kg-1'],
  'g1-saida--montada': ['saidas--saida-da-montada-1'],

  // -------------------------------------------------------------------------
  // OS 14 EXCLUSIVOS DO 1o GRAU ficam fora desta tabela, e agora isso e uma
  // AFIRMACAO do professor e nao uma duvida minha.
  //
  // O `curriculo-compilado.md` do estudo dele lista 94 tecnicas: 80 de azul mais
  // 14 exclusivas do 1o grau (itens 81 a 94). Sao exatamente as que nao aparecem
  // aqui:
  //
  //   100 kg lateral · 100 kg norte-sul · Montada · Dominio de costas com gancho
  //   Double Leg · Passagem emborcando (guarda fechada) · Raspagem tripe
  //   Estrangulamento cruzado dos 100 kg · Americana dos 100 kg
  //   Estrangulamento de lapela das costas · Mata-leao das costas
  //   Estrangulamento cruzado da montada · Americana da montada
  //   Armlock da montada
  //
  // E ELES COINCIDEM COM OS 14 "[Manual]" do `curriculo-1grau.md`, item por
  // item. Nao e coincidencia — e a regra por tras dos dois documentos:
  //
  //     existe em azul  -> [Auto]    o aluno estuda por cartao, o app mede
  //     nao existe      -> [Manual]  nao ha cartao, so o professor pode dizer
  //
  // Ou seja: `[Manual]` E DERIVAVEL desta tabela (`equivalentesDe(id).length ===
  // 0`), e nao precisa ser um campo. O modelo de dados do estudo guarda
  // `"manual": false` em cada tecnica; um campo guardado diverge da regra que o
  // gerou no primeiro item que alguem acrescentar.
  //
  // O COMPORTAMENTO do [Auto] — "estar numa aula agendada basta, sem check do
  // professor" — NAO foi adotado aqui. Continua valendo a atestacao para os 29.
  // Ver a conversa de 12/09: adota-lo corta o trabalho do professor de 29 para 14
  // por aluno, e enfraquece o portao. Decisao ainda em aberto.
  // -------------------------------------------------------------------------
}

/**
 * Requisitos que sao UMA COISA SO, mesmo tendo varios equivalentes em azul.
 *
 * ---------------------------------------------------------------------------
 * DECISAO DELE em 09/09/2026: "pode unificar ukemi em uma coisa so".
 *
 * O bolsao mostrava quatro entradas para o que ele chama de uma: "Ukemi" na
 * secao dos requisitos e "Ukemi frente", "Ukemi costas" e "Ukemi lateral" no
 * catalogo. A prova de azul lista as tres (a folha diz "UKEMI - Frente/ costas/
 * lateral"), e por isso elas existem no curriculo — mas para PROGRAMAR uma aula
 * elas sao o mesmo movimento em tres direcoes.
 *
 * A LINHA E "VARIACAO x TECNICA DIFERENTE", e ela decide quem entra aqui:
 *
 *   ukemi frente/costas/lateral   -> tres direcoes de um movimento   ENTRA
 *   rolamento frente/tras         -> duas direcoes de um movimento   ENTRA
 *   Upa / ponte  x  Cotovelo      -> duas fugas da montada DIFERENTES  fica fora
 *   Reposicao de guarda x Barrigada -> duas saidas dos 100kg DIFERENTES fica fora
 *
 * As duas ultimas ficam divididas porque unifica-las apagaria conteudo de
 * ensino: o professor substituto leria "Saida da montada" na aula e nao saberia
 * se da o upa ou a fuga de cotovelo.
 *
 * ISTO SO AFETA O BOLSAO. `EQUIVALENTES_DO_1GRAU` continua listando os tres
 * ukemi, e a matriz continua lendo por eles — precisa, porque o programa da RGI
 * tem os dois rolamentos de azul na aula 1, gravados antes desta decisao. O que
 * muda e o que a tela OFERECE para programar.
 * ---------------------------------------------------------------------------
 */
export const UM_MOVIMENTO_SO: readonly string[] = [
  'g1-edu--ukemi',
  'g1-edu--rolamentos',
  /**
   * FUGA DE QUADRIL ENTROU EM 12/09, junto com a correcao contra o documento.
   *
   * Ela passou a ter duas partes (tradicional e avancada) e cai no mesmo teste
   * dos outros dois: o PROPRIO NOME do requisito lista as variacoes — "Fuga de
   * quadril (tradicional e avancada)", no `curriculo-1grau.md` dele. Deixa-la
   * dividida no bolsao enquanto ukemi e rolamentos estao unificados seria a
   * inconsistencia que a lista existe para evitar.
   */
  'g1-edu--fuga-de-quadril',
]

/** Este requisito absorve os equivalentes dele no bolsao? */
export function ehUmMovimentoSo(requisitoId: string): boolean {
  return UM_MOVIMENTO_SO.includes(requisitoId)
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
