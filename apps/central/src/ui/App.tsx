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

import { useMemo, useState } from 'react'
import { curriculoDaMeta, CURRICULO_AZUL } from '@faixa-azul/core/seed/curriculos'
import { nomeDaTurma, TURMAS } from '@faixa-azul/core/domain/turmas'
import { ROTULO_GRUPO } from '@faixa-azul/core/domain/taxonomia'
import {
  cartoesDaTurma,
  gruposComItens,
  mediaDaTurma,
  ordenarLinhas,
} from '@faixa-azul/core/application/central'
import type { Curriculo } from '@faixa-azul/core/application/central'
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
import { horaCurta } from './formato'

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

export function App() {
  const sessao = useSessaoDoProfessor()

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
  return <Central sessao={sessao.estado} aoSair={sessao.sair} />
}

function Central({
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
    curriculoDaMeta,
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
          curriculo={curriculoDaMeta(linha.meta) ?? CURRICULO_DAS_COLUNAS}
          aoVoltar={() => irPara({ tela: 'turmas' })}
          aoTrocarMeta={async (meta) => {
            await sessao.dados.atualizarMeta(linha.uid, meta)
            // Reler e obrigatorio: a meta troca a MEDIDA do progresso, entao a
            // tela inteira passa a falar de outra coisa.
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
