/**
 * Central do Aluno — a tela do professor.
 *
 * ESTA ENTREGA (1 de 2) MOSTRA; A SEGUINTE PROGRAMA. Ver ADR-015: a linha entre
 * as duas cai onde o risco muda de natureza — ver e leitura, programar exige um
 * caminho de sincronizacao novo nos dois lados.
 *
 * NENHUMA TELA ANTES DO LOGIN, e isso separa a central do app do aluno. O app
 * funciona sem conta porque o estudo e local; aqui todo dado e de outra pessoa,
 * e nao existe versao util sem saber quem esta olhando.
 */

import { useMemo, useState } from 'react'
import { CARTOES_TEORIA, CONTEUDOS, ITENS, REQUISITOS } from '@faixa-azul/core/seed'
import { medeCurriculoDeAzul, nomeDaTurma, SEM_TURMA, TURMAS } from '@faixa-azul/core/domain/turmas'
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
import { horaCurta } from './formato'

/**
 * O curriculo de hoje: o exame de azul.
 *
 * Passado como PARAMETRO e nao importado la dentro (ver application/central):
 * quando o curriculo de roxa chegar, esta constante vira uma escolha por turma
 * e nada mais muda.
 */
const CURRICULO_DE_AZUL: Curriculo = {
  itens: ITENS,
  conteudos: CONTEUDOS,
  requisitos: REQUISITOS,
  cartoesTeoria: CARTOES_TEORIA,
}

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
    curriculo: CURRICULO_DE_AZUL,
  })

  const grupos = useMemo(() => gruposComItens(CURRICULO_DE_AZUL), [])

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
          curriculo={CURRICULO_DE_AZUL}
          aoVoltar={() => irPara({ tela: 'turmas' })}
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
  const semCurriculo = turma !== null && turma !== SEM_TURMA && !medeCurriculoDeAzul(turma)

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
        {semCurriculo && (
          <p className="nota-turma">
            Esta é turma de {TURMAS.find((t) => t.id === turma)?.descricao.toLowerCase()}. O
            currículo do exame de azul não é a meta dela, então progresso e técnicas aparecem
            como <strong>—</strong>. Atividade, dúvidas e aulas continuam valendo.
          </p>
        )}

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
