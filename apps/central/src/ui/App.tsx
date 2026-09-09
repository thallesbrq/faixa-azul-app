/**
 * Central do Aluno — a tela do professor.
 *
 * VER E PROGRAMAR, as duas metades. A entrega 1 trouxe o painel de turmas e o
 * progresso de cada aluno; a 2 trouxe a montagem da grade — a linha entre elas
 * caiu onde o risco mudava de natureza, porque programar exigiu um caminho de
 * sincronizacao novo nos dois lados (ver nuvem/grades e `mesclarGrade`).
 *
 * NENHUMA TELA ANTES DO LOGIN, e isso separa a central do app do aluno. O app
 * funciona sem conta porque o estudo e local; aqui todo dado e de outra pessoa,
 * e nao existe versao util sem saber quem esta olhando.
 */

import { useEffect, useMemo, useState } from 'react'
import { curriculoPorId, modulosDoCurriculo, CURRICULO_AZUL } from '@faixa-azul/core/seed/curriculos'
import { metaSeguinte, SEM_META } from '@faixa-azul/core/domain/metas'
import { nomeDaTurma, SEM_TURMA, TURMAS } from '@faixa-azul/core/domain/turmas'
import { ROTULO_GRUPO } from '@faixa-azul/core/domain/taxonomia'
import {
  cartoesDaTurma,
  gruposComItens,
  mediaDaTurma,
  ordenarLinhas,
} from '@faixa-azul/core/application/central'
import type { Curriculo } from '@faixa-azul/core/application/central'
import { curriculoParaAtestar } from '@faixa-azul/core/application/atestado'
import { useSessaoDoProfessor } from './useSessaoDoProfessor'
import { useRota } from './useRota'
import type { EstadoDaCentral } from './useSessaoDoProfessor'
import { useLinhas } from './useLinhas'
import { Entrar } from './components/Entrar'
import { Cartoes } from './components/Cartoes'
import { Rosca } from './components/Rosca'
import { Barras } from './components/Barras'
import { Tabela } from './components/Tabela'
import { Aluno } from './components/Aluno'
import { MontarGrade } from './MontarGrade'
import { FolhaDoAtestado } from './FolhaDoAtestado'
import { Convidar } from './components/Convidar'
import { Planner } from './Planner'
import { GradeDaTurma } from './GradeDaTurma'
import { AcompanhamentoDaTurma } from './AcompanhamentoDaTurma'
import { usePrograma } from './usePrograma'
import { ITENS_1GRAU, MODULOS_1GRAU } from '@faixa-azul/core/seed/primeiro-grau'
import { ehUmMovimentoSo, equivalentesDe } from '@faixa-azul/core/seed/equivalencia-1grau'
import { bolsaoEmSecoes } from '@faixa-azul/core/application/bolsao'
import { horaCurta } from './formato'
import {
  CONTADORES,
  DIAGNOSTICO_LIGADO,
  contar,
  observarMutacoes,
  totalDeMutacoes,
} from './diagnostico'

observarMutacoes()

/**
 * As COLUNAS da tabela vem do curriculo de azul, e nao da meta de cada aluno.
 *
 * Por que uma escolha so aqui: a tabela e uma grade — as colunas tem de ser as
 * mesmas para todas as linhas. Derivar por aluno daria uma tabela com colunas
 * diferentes por linha, que nao e tabela. O azul e o curriculo mais amplo (56
 * itens ativos contra 29), entao ele define o conjunto; quem persegue o 1o grau
 * mostra `—` nessas colunas, com o motivo escrito.
 */
const CURRICULO_DAS_COLUNAS: Curriculo = CURRICULO_AZUL

/**
 * "Hoje", fixado na CARGA DO MODULO e nao a cada render.
 *
 * `new Date()` no corpo de um componente e um objeto novo em cada render, e ele
 * entra nas dependencias de `useSemana` e de `slotsDaSemana`. Esta sessao ja
 * gastou um deploy num laco de render exatamente por essa forma.
 *
 * O custo de fixar: uma aba aberta atravessando a meia-noite continua achando
 * que e ontem. Um professor que deixa a Central aberta a noite inteira recarrega
 * de manha; e o conserto (um `setInterval` verificando a virada) custaria mais
 * complexidade do que o problema tem.
 */
const HOJE = new Date()

export function App() {
  const sessao = useSessaoDoProfessor()
  contar('renders')

  if (sessao.estado.fase !== 'pronto') {
    return (
      <div className="entrada">
        <Cabecalho />
        <Entrar
          estado={sessao.estado}
          aoEnviar={sessao.enviarLink}
          aoConcluir={sessao.concluirCom}
          aoSair={sessao.sair}
        />
      </div>
    )
  }

  // Componente proprio para os hooks da central so existirem quando ha sessao.
  // Chamar `useLinhas` no App faria ele rodar (e falhar) na tela de login.
  return (
    <>
      {DIAGNOSTICO_LIGADO && <PainelDeDiagnostico />}
      <Central sessao={sessao.estado} aoSair={sessao.sair} />
    </>
  )
}

/**
 * O painel do `?diag=1`.
 *
 * ATUALIZA POR `setInterval` E NAO POR RENDER, e a distincao e o ponto: se ele
 * lesse os contadores durante o render da arvore, ele mostraria o estado no
 * instante do laco e nao a TAXA. Uma taxa por segundo e o que distingue "abriu
 * duas vezes" de "esta girando".
 */
function PainelDeDiagnostico() {
  const [linha, setLinha] = useState('medindo…')
  useEffect(() => {
    let anterior = { ...CONTADORES, mutacoes: totalDeMutacoes() }
    const id = window.setInterval(() => {
      const agora = { ...CONTADORES, mutacoes: totalDeMutacoes() }
      setLinha(
        [
          `renders ${agora.renders} (+${agora.renders - anterior.renders}/s)`,
          `dom ${agora.mutacoes} (+${agora.mutacoes - anterior.mutacoes}/s)`,
          `programa ${agora.cargaPrograma}`,
          `linhas ${agora.cargaLinhas}`,
          `sessao ${agora.sessao}`,
        ].join(' · '),
      )
      anterior = agora
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <p
      id="painel-de-diagnostico"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        margin: 0,
        padding: '6px 12px',
        background: '#111214',
        color: '#7ee787',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 12,
        textAlign: 'center',
      }}
    >
      {linha}
    </p>
  )
}

/**
 * EXPORTADO para a pagina de diagnostico montar a arvore REAL.
 *
 * A pagina de amostra montava so o `Planner` — e foi por isso que um laco de
 * render no `usePrograma` passou por 658 testes e por uma inspecao na tela. Um
 * defeito de arvore precisa da arvore: `Central` + seus memos + a rota +
 * `PlannerDaTurma` + `usePrograma`.
 */
export function Central({
  sessao,
  aoSair,
}: {
  sessao: Extract<EstadoDaCentral, { fase: 'pronto' }>
  aoSair: () => void
}) {
  /**
   * `null` = todas as turmas. Comeca em `null` de proposito: a primeira pergunta
   * do professor ao abrir e "como esta a academia", nao "como esta a RG1A".
   * Abrir numa turma escolhida por nos esconderia as outras duas sem ele pedir.
   */
  const [turma, setTurma] = useState<string | null>(null)
  const { rota, irPara } = useRota()

  const { estado, recarregar } = useLinhas({
    app: sessao.app,
    dados: sessao.dados,
    curriculoPorId,
  })

  const grupos = useMemo(() => gruposComItens(CURRICULO_DAS_COLUNAS), [])

  /**
   * TODOS OS HOOKS ANTES DE QUALQUER `return`, e isto nao e estilo.
   *
   * A primeira versao deste componente tinha o `if (rota.tela === 'aluno')`
   * ACIMA destes `useMemo`. React identifica hooks pela ORDEM de chamada, entao
   * ir para a pagina de um aluno pularia quatro hooks e a volta os traria de
   * novo: "Rendered fewer hooks than expected", com a tela branca e o erro
   * apontando para um lugar que nao tem nada de errado.
   *
   * Custo de manter tudo aqui: os quatro `useMemo` rodam tambem na pagina de um
   * aluno, onde nao servem. Sao filtros sobre uma lista de vinte itens.
   */
  const daSelecao = useMemo(
    () => (turma === null ? estado.linhas : estado.linhas.filter((l) => l.turma === turma)),
    [estado.linhas, turma],
  )
  const ordenadas = useMemo(() => ordenarLinhas(daSelecao), [daSelecao])
  const media = useMemo(() => mediaDaTurma(daSelecao), [daSelecao])
  const cartoes = useMemo(
    () => cartoesDaTurma(daSelecao, grupos, (g) => ROTULO_GRUPO[g]),
    [daSelecao, grupos],
  )

  /**
   * A META PADRAO DE UM CONVIDADO VEM DA TURMA, e agora de uma CONSTANTE.
   *
   * ERA UMA HEURISTICA — "a meta mais comum entre quem ja esta na turma" — e ela
   * errou em producao no primeiro uso real. A unica pessoa na RGI era o Floki,
   * uma conta de DEMONSTRACAO de alguem com tres graus e `meta: '4grau'`. Willian
   * e Henrique foram convidados herdando o 4o grau.
   *
   * A CONSEQUENCIA ERA O OPOSTO DO OBJETIVO: com `meta: '4grau'` eles nunca sao
   * medidos contra os 29 itens do 1o grau, e como `estuda` nasce igual a meta (e
   * o 4o grau nao tem lista), a folha do atestado deles NAO APARECERIA — o
   * professor nao teria onde marcar nada. Os dois convites foram corrigidos a mao.
   *
   * O padrao inteligente acertaria numa turma povoada e errou numa turma de um
   * habitante nao representativo. A constante e menos esperta e nao tem esse
   * modo de falha: a RGI e a turma de INICIANTES, e a graduacao seguinte de um
   * iniciante e o 1o grau, independentemente de quem mais esteja nela.
   *
   * Quando existir turma de intermediario com meta propria, isto vira um campo da
   * `Turma` — e nao uma media do que ha dentro dela.
   */
  const metaPadrao = turma === 'RGI' ? '1grau' : SEM_META

  /** Nomes que ja existem na turma — cadastro OU convite pendente. */
  const nomesNaTurma = useMemo(() => daSelecao.map((l) => l.nome), [daSelecao])

  /**
   * Os alunos COM CONTA da turma, para a matriz de acompanhamento.
   *
   * O CONVIDADO FICA FORA: `motivo === 'convidado'` significa que o `uid` da
   * linha e o E-MAIL e nao um uid (ver `LinhaDaCentral.uid`). Ler
   * `competencias/{email}/registros` daria uma colecao vazia para sempre, e a
   * matriz mostraria uma coluna de pendencias impossiveis de resolver — nao ha
   * como atestar quem nao entrou.
   */
  const alunosDaTurma = useMemo(
    () =>
      daSelecao
        .filter((l) => l.motivo !== 'convidado')
        .map((l) => ({ uid: l.uid, nome: l.nome, estuda: l.estuda, meta: l.meta })),
    [daSelecao],
  )

  /**
   * O PLANNER E COMPONENTE PROPRIO, e nao um ramo aqui dentro — e a razao e a
   * regra dos hooks, que ja me pegou tres vezes neste arquivo.
   *
   * Ele precisa de `usePrograma`, que le uma colecao diferente. Chamar esse hook
   * aqui o faria rodar em TODA abertura da central, lendo 81 documentos de
   * programa para desenhar a tabela de alunos. Chamar dentro do `if` quebraria a
   * ordem dos hooks — "Rendered fewer hooks than expected", tela branca, e o erro
   * apontando para um lugar que nao tem nada de errado.
   *
   * Componente proprio resolve os dois: o hook mora nele, e ele so monta quando a
   * rota e o planner.
   */
  if (rota.tela === 'planner') {
    return (
      <>
        <Cabecalho quem={sessao.cadastro.nome} aoSair={aoSair} />
        <PlannerDaTurma
          app={sessao.app}
          turma={rota.turma}
          aoVoltar={() => irPara({ tela: 'turmas' })}
        />
      </>
    )
  }

  /**
   * A pagina de um aluno le do MESMO carregamento da tabela, e nao faz leitura
   * propria: a central baixa tudo ao abrir, entao clicar num nome e um `get`
   * num mapa em memoria. Um link direto espera essa mesma leitura inicial.
   */
  if (rota.tela === 'aluno') {
    const linha = estado.linhas.find((l) => l.uid === rota.uid)

    // Ainda carregando: nao da para concluir que o aluno nao existe.
    if (!linha && estado.fase !== 'pronto' && estado.fase !== 'erro') {
      return (
        <>
          <Cabecalho quem={sessao.cadastro.nome} aoSair={aoSair} />
          <main className="painel">
            <p className="apoio">Carregando…</p>
          </main>
        </>
      )
    }

    if (!linha) {
      return (
        <>
          <Cabecalho quem={sessao.cadastro.nome} aoSair={aoSair} />
          <main className="painel">
            <button className="voltar" onClick={() => irPara({ tela: 'turmas' })}>
              ← Todas as turmas
            </button>
            <section className="cartao">
              <h3>Aluno não encontrado</h3>
              <p className="apoio" style={{ marginBottom: 0 }}>
                Este endereço não corresponde a nenhum aluno ativo da academia. Pode ter
                sido desativado, ou o link estar velho.
              </p>
            </section>
          </main>
        </>
      )
    }

    // A REGRA MORA NO CORE (`curriculoParaAtestar`), e nao aqui: ela ja errou
    // duas vezes como ternario dentro do JSX, onde nao havia como testa-la.
    const curriculoDoAtestado = curriculoParaAtestar({
      meta: linha.meta,
      estuda: linha.estuda,
      curriculoPorId,
    })

    return (
      <>
        <Cabecalho quem={sessao.cadastro.nome} aoSair={aoSair} />
        <Aluno
          linha={linha}
          estado={estado.estados.get(linha.uid) ?? null}
          aulas={
            <MontarGrade
              app={sessao.app}
              alunoUid={linha.uid}
              estadoDoAluno={estado.estados.get(linha.uid) ?? null}
              itens={CURRICULO_DAS_COLUNAS.itens}
            />
          }
          curriculo={curriculoPorId(linha.estuda) ?? CURRICULO_DAS_COLUNAS}
          atestado={
            /**
             * A FOLHA APARECE SEMPRE QUE HA O QUE ATESTAR, e nao so quando a
             * medida do progresso e atestado. Esta condicao ja errou duas vezes,
             * e o erro atual era o pior dos tres.
             *
             * ERA `medidaDoProgresso(linha.meta) === 'atestado'`. Virou
             * `curriculoPorId(linha.estuda)?.medida === 'atestado'` quando `meta`
             * e `estuda` se separaram — e eu escrevi no comentario que a folha
             * "aparece para quem ESTUDA o 1o grau, nao para quem o persegue
             * estudando azul". Isso trancou fora exatamente o caso que motivou a
             * separacao existir: quem persegue um grau estudando o curriculo de
             * azul NUNCA podia ser atestado. Era o Floki, e era o Thalles.
             *
             * O QUE EU CONFUNDI: tratei "atestar" e "medir progresso" como a
             * mesma decisao. Nao sao. Atestar e o professor REGISTRANDO O QUE
             * VIU — vale para qualquer item que o aluno treina. `medida` decide
             * qual numero vai na coluna Progresso. E o gate ("apto ao grau") usa
             * a lista da PROVA, quando ela existe.
             *
             * Dai a resolucao em duas tentativas: a lista da prova primeiro
             * (`meta`), e a do que ele treina como reserva (`estuda`). Com
             * `meta: '4grau'` — cuja lista nao chegou — o professor passa a poder
             * atestar os itens de azul, e a folha DIZ que isso registra o que ele
             * viu e nao fecha o 4o grau. Ver `origemDoCurriculo` na folha.
             */
            curriculoDoAtestado !== null ? (
              <FolhaDoAtestado
                app={sessao.app}
                alunoUid={linha.uid}
                professorUid={sessao.sessao.uid}
                curriculo={curriculoDoAtestado.curriculo}
                modulos={modulosDoCurriculo(curriculoDoAtestado.id)}
                meta={linha.meta}
                turma={linha.turma}
                origemDoCurriculo={curriculoDoAtestado.origem}
                idDoCurriculo={curriculoDoAtestado.id}
                aoConceder={async (metaConcedida) => {
                  const proxima = metaSeguinte(metaConcedida)
                  // `null` no fim da fila: o que vem depois do azul e outra
                  // faixa, e nao ha meta para avancar.
                  if (proxima !== null) await sessao.dados.atualizarMeta(linha.uid, proxima)
                  await recarregar()
                }}
              />
            ) : null
          }
          aoVoltar={() => irPara({ tela: 'turmas' })}
          aoTrocarMeta={async (meta) => {
            await sessao.dados.atualizarMeta(linha.uid, meta)
            // Reler porque a meta troca o que a tela AFIRMA sobre a prova. Ela
            // nao troca mais a medida do progresso — isso passou para `estuda`
            // (ADR-017, decisao 6).
            await recarregar()
          }}
          aoTrocarEstuda={async (estuda) => {
            await sessao.dados.atualizarEstuda(linha.uid, estuda)
            // ESTE E O QUE TROCA A MEDIDA: reler nao e otimizacao, e a unica
            // forma de a tela deixar de falar de cartoes e passar a falar de
            // atestado (ou o contrario) sem mostrar o numero antigo com o rotulo
            // novo por um instante.
            await recarregar()
          }}
          aoTrocarParticulares={async (tem) => {
            await sessao.dados.atualizarParticulares(linha.uid, tem)
            await recarregar()
          }}
          aoTrocarTurma={async (turma) => {
            await sessao.dados.atualizarTurma(linha.uid, turma)
            // Recarrega porque trocar de turma muda se o progresso E MEDIDO:
            // sem reler, a tela continuaria mostrando os numeros da turma
            // anterior, com o seletor dizendo outra coisa.
            await recarregar()
          }}
        />
      </>
    )
  }

  const titulo = turma === null ? 'Todas as turmas' : nomeDaTurma(turma)
  /**
   * A NOTA DE "SEM CURRICULO" SAIU DO TOPO DA TURMA.
   *
   * Ela existia porque a turma decidia o curriculo, e uma turma inteira caia no
   * mesmo caso. Agora quem decide e a META de cada aluno, e uma turma pode ter
   * alunos em situacoes diferentes — a explicacao passou a viver na LINHA
   * (`explicacao` em Tabela.tsx), que e onde a informacao de fato varia.
   */

  return (
    <>
      <Cabecalho quem={sessao.cadastro.nome} aoSair={aoSair} />

      <div className="barra">
        <div className="barra-conteudo">
          <span className="barra-rotulo">Turma</span>
          <div className="abas-turma" role="tablist" aria-label="Turmas">
            <button
              role="tab"
              className={turma === null ? 'aba-turma aba-turma--ativa' : 'aba-turma'}
              aria-selected={turma === null}
              onClick={() => setTurma(null)}
            >
              Todas
            </button>
            {TURMAS.map((t) => (
              <button
                key={t.id}
                role="tab"
                className={turma === t.id ? 'aba-turma aba-turma--ativa' : 'aba-turma'}
                aria-selected={turma === t.id}
                onClick={() => setTurma(t.id)}
                title={t.descricao}
              >
                {t.nome}
              </button>
            ))}
          </div>

          {/* UM BOTAO DE PLANNER POR TURMA, e nao um so que usa a turma
              selecionada: com "Todas" escolhido nao existe resposta certa para
              qual programa abrir, e um botao que as vezes nao funciona e pior do
              que dois botoes que sempre funcionam. */}
          <div className="barra-planner">
            {TURMAS.map((t) => (
              <button
                key={t.id}
                className="botao botao--claro botao--pequeno"
                onClick={() => irPara({ tela: 'planner', turma: t.id })}
                title={`As 80 aulas da ${t.nome}`}
              >
                📋 Planner {t.nome}
              </button>
            ))}
          </div>

          <div className="barra-direita">
            {estado.lidoEm && <span className="apoio-inline">lido às {horaCurta(estado.lidoEm)}</span>}
            <button
              className="botao botao--claro botao--pequeno"
              onClick={() => void recarregar()}
              disabled={estado.fase === 'carregando-pessoas' || estado.fase === 'carregando-estados'}
            >
              {estado.fase === 'carregando-estados' ? 'Lendo…' : 'Recarregar'}
            </button>
          </div>
        </div>
      </div>

      <main className="painel">
        {estado.fase === 'erro' && (
          <p className="aviso">{estado.mensagem}</p>
        )}

        {/* Falha de leitura NAO some: sem este aviso, dois alunos ilegiveis
            aparecem como dois alunos sem dado, e o professor conclui que eles
            nao estao estudando. */}
        {estado.falhas.length > 0 && (
          <p className="aviso">
            Não consegui ler {estado.falhas.length}{' '}
            {estado.falhas.length === 1 ? 'aluno' : 'alunos'}. Isso é falha de leitura, não
            ausência de estudo — tente recarregar.
          </p>
        )}

        {/* A explicacao da RG2 aparece UMA vez, no topo, e nao repetida em cada
            celula vazia da tabela. */}

        <Cartoes cartoes={cartoes} />

        <div className="dois-blocos">
          <Rosca media={media} titulo={`Progresso · ${titulo}`} />
          <Barras linhas={daSelecao} aoEscolher={(uid) => irPara({ tela: 'aluno', uid })} />
        </div>

        {/* A GRADE SO APARECE COM UMA TURMA SELECIONADA, e nao na visao "Todas".
            Turma e horario: sem turma nao existe uma semana para mostrar, e
            juntar as duas grades numa so daria um calendario que nao e de
            ninguem. Componente proprio porque ele le o programa (81 aulas) — ver
            `GradeDaTurma`. */}
        {turma !== null && <GradeDaTurma app={sessao.app} turma={turma} hoje={HOJE} />}

        {/* A MATRIZ DE ACOMPANHAMENTO fica DEPOIS da grade, e a ordem e a da
            pergunta: primeiro "o que ja foi dado" (a grade), depois "quem
            aprendeu" (a matriz). O segundo so faz sentido depois do primeiro. */}
        {turma !== null && (
          <AcompanhamentoDaTurma
            app={sessao.app}
            turma={turma}
            alunos={alunosDaTurma}
            professorUid={sessao.sessao.uid}
            hoje={HOJE}
          />
        )}

        <section className="cartao">
          <h2>
            {titulo}
            <span className="contagem-linhas">
              {ordenadas.length} {ordenadas.length === 1 ? 'aluno' : 'alunos'}
            </span>
          </h2>
          <Tabela
            linhas={ordenadas}
            grupos={grupos}
            mostrarTurma={turma === null}
            aoEscolher={(uid) => irPara({ tela: 'aluno', uid })}
          />
        </section>

        <Convidar
          turma={turma ?? SEM_TURMA}
          meta={metaPadrao}
          jaConvidados={nomesNaTurma}
          aoConvidar={async (entrada) => {
            await sessao.dados.convidar({
              ...entrada,
              papel: 'aluno',
              // O curriculo nasce igual a meta; o professor troca na pagina do
              // aluno quando divergirem (ADR-017, decisao 6).
              estuda: entrada.meta,
            })
            await recarregar()
          }}
          aoCancelar={async (email) => {
            await sessao.dados.cancelarConvite(email)
            await recarregar()
          }}
        />
      </main>
    </>
  )
}

function Cabecalho({ quem, aoSair }: { quem?: string; aoSair?: () => void }) {
  return (
    <header className="topo">
      <div className="topo-conteudo">
        <img src="./logo-rilion.png" alt="" className="topo-logo" />
        <div className="topo-titulo">
          <h1>Central do Aluno</h1>
          <p>Rilion Gracie Garopaba</p>
        </div>
        {quem !== undefined && (
          <div className="topo-quem">
            <span>{quem.trim() === '' ? 'Professor' : quem}</span>
            {aoSair && (
              <button className="botao-texto" onClick={aoSair}>
                Sair
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

/**
 * TODOS OS ITENS QUE UMA AULA PODE REFERENCIAR: azul + os 29 do 1o grau.
 *
 * CONSTANTE DE MODULO, e nao um array montado no corpo do componente. Como
 * expressao inline (`[...CURRICULO_AZUL.itens, ...ITENS_1GRAU]`) ela era um
 * array NOVO a cada render, e isso fechou um laco infinito no `usePrograma` que
 * chegou a producao: a tela piscava sem conteudo, relendo o Firestore a cada
 * volta. Ver o cabecalho de `usePrograma`, onde o defeito esta descrito inteiro.
 *
 * O laco em si ja esta consertado na estrutura do hook — um array instavel agora
 * so recalcula. Esta constante existe pelo DESPERDICIO: reagrupar 81 itens em 12
 * blocos a cada tecla digitada e trabalho jogado fora.
 *
 * Os 29 do 1o grau tem ids proprios e NAO estao no curriculo de azul (ADR-016):
 * sem eles aqui, as 25 aulas sugeridas apareceriam inteiras como "tecnica que
 * nao existe mais" — dado certo exibido como erro.
 */
const ITENS_CONHECIDOS = [...CURRICULO_AZUL.itens, ...ITENS_1GRAU]

/**
 * O BOLSAO EM SECOES, derivado UMA VEZ no modulo.
 *
 * MESMO MOTIVO DE `ITENS_CONHECIDOS` ACIMA, e aqui pesa mais: `bolsaoEmSecoes`
 * agrupa 110 itens, monta dois mapas e copia 12 objetos para acrescentar alias.
 * Fazer isso a cada tecla digitada na busca do bolsao seria trabalho jogado fora
 * — e um array novo por render e a familia exata de instabilidade que fez esta
 * tela piscar em producao.
 *
 * SO FAZ SENTIDO NO MODULO PORQUE O CURRICULO E FIXO. No dia em que a turma
 * decidir o curriculo (o de roxa esta a caminho), isto vira `useMemo` com a
 * turma na dependencia.
 */
const SECOES_DO_BOLSAO = bolsaoEmSecoes({
  requisitos: ITENS_1GRAU,
  modulosDosRequisitos: MODULOS_1GRAU,
  catalogo: CURRICULO_AZUL.itens,
  equivalentes: equivalentesDe,
  umMovimentoSo: ehUmMovimentoSo,
})

/**
 * O planner de uma turma. Existe como componente para o `usePrograma` viver
 * dentro dele — ver o comentario da rota em `App`.
 */
function PlannerDaTurma({
  app,
  turma,
  aoVoltar,
}: {
  app: Parameters<typeof usePrograma>[0]['app']
  turma: string
  aoVoltar: () => void
}) {
  const programa = usePrograma({
    app,
    turma,
    /**
     * O BOLSAO EM DUAS SECOES: os 29 requisitos do 1o grau e o catalogo de azul.
     *
     * ERA SO O CATALOGO DE AZUL, e isso bloqueava a necessidade numero um: "o
     * planner serve para garantir que esses itens estao nas aulas da RGI", e os
     * 29 nao estavam no bolsao — o professor nao conseguia programar nenhum.
     */
    secoesDoBolsao: SECOES_DO_BOLSAO,
    itensConhecidos: ITENS_CONHECIDOS,
    itensDo1Grau: ITENS_1GRAU,
  })

  if (programa.estado.fase === 'carregando') {
    return (
      <main className="painel">
        <p className="apoio">Abrindo o programa da turma…</p>
      </main>
    )
  }

  if (programa.estado.fase === 'erro' || programa.estado.planner === null) {
    return (
      <main className="painel">
        <p className="aviso">{programa.estado.mensagem ?? 'Não foi possível abrir o programa.'}</p>
        <button className="botao botao--claro" onClick={aoVoltar}>
          ← Turmas
        </button>
      </main>
    )
  }

  return (
    <Planner
      planner={programa.estado.planner}
      turma={turma}
      gravando={programa.estado.gravando}
      mensagem={programa.estado.mensagem}
      aoVoltar={aoVoltar}
      aoAplicarSugestao={() => void programa.aplicarSugestao()}
      aoPorItem={(n, id) => void programa.porItem(n, id)}
      aoTirarItem={(n, id) => void programa.tirarItem(n, id)}
      aoAcrescentarRotulo={(n, r) => void programa.acrescentarRotulo(n, r)}
      aoRemoverRotulo={(n, id) => void programa.removerRotulo(n, id)}
      aoMudarFoco={(n, f) => void programa.mudarFoco(n, f)}
      aoDesignar={(n, slotId) => {
        void (async () => {
          const desalojada = await programa.agendar(n, slotId)
          // TROCA EM SILENCIO E O QUE NAO PODE ACONTECER: o professor
          // procuraria depois uma aula que ele mesmo moveu.
          if (desalojada !== null) {
            window.alert(
              `A aula ${desalojada} estava nesse horário e voltou para a fila sem data.`,
            )
          }
        })()
      }}
      aoDesagendar={(n) => void programa.desagendar(n)}
      hoje={HOJE}
    />
  )
}
