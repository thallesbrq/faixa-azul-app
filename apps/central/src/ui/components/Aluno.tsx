/**
 * Pagina de um aluno — o que o professor ve ao clicar no nome.
 *
 * OS MESMOS DADOS DA TELA PROGRESSO DO APP, com um layout diferente e um bloco a
 * mais. O layout difere porque o aluno olha isso no celular e o professor no
 * computador; os NUMEROS sao identicos, porque saem da mesma
 * `application/central` (ADR-015, decisao 1) — se divergissem, a conversa entre
 * os dois passaria a ser sobre o app.
 *
 * O BLOCO A MAIS E A FILA DE VALIDACAO, e e o unico conteudo desta tela que nao
 * existe na do aluno. Ele lista NOME POR NOME o que o aluno recupera e o
 * professor nunca viu: e a pauta da proxima aula particular, e a unica coisa
 * aqui que so ele pode resolver.
 *
 * DOIS EIXOS, NUNCA UM. `progresso.ts` explica por que dominio e validacao nao
 * colapsam: recuperar com seguranca uma tecnica que o professor nunca viu pode
 * ser decorar a versao errada. Um numero unico esconderia exatamente o risco
 * maior do projeto.
 */

import { useMemo, useState } from 'react'
import type { ProgressoDeGrupo, NivelDominio } from '@faixa-azul/core/application/progresso'
import { faixaDaPontuacao } from '@faixa-azul/core/application/progresso'
import { detalheDoAluno } from '@faixa-azul/core/application/central'
import type { Curriculo, LinhaDaCentral } from '@faixa-azul/core/application/central'
import {
  medeCurriculoDeAzul,
  nomeDaTurma,
  ROTULO_SEM_TURMA,
  SEM_TURMA,
  TURMAS,
} from '@faixa-azul/core/domain/turmas'
import type { EstadoPersistido } from '@faixa-azul/core/persistence/repositorio'
import { atividade, corDaFaixa, porcento } from '../formato'

const ROTULO_NIVEL: Record<NivelDominio, string> = {
  nao_iniciado: 'não iniciado',
  visto: 'visto',
  aprendendo: 'aprendendo',
  dominado: 'dominado',
}

const ORDEM_NIVEL: NivelDominio[] = ['dominado', 'aprendendo', 'visto', 'nao_iniciado']

/**
 * Barras com a contagem por nivel embaixo.
 *
 * A CONTAGEM E O QUE A TABELA NAO PODIA MOSTRAR. "Guarda Aranha 45%" nao diz se
 * sao seis itens no meio do caminho ou tres dominados e tres intocados — e as
 * duas coisas pedem aulas diferentes.
 */
function Barras({ grupos }: { grupos: ProgressoDeGrupo[] }) {
  if (grupos.length === 0) return <p className="apoio">Nada para mostrar aqui.</p>
  return (
    <ul className="lista-grupos">
      {grupos.map((g) => {
        const cor = corDaFaixa(faixaDaPontuacao(g.pontuacao))
        return (
          <li key={g.chave}>
            <div className="grupo-topo">
              <span className="grupo-nome">{g.rotulo}</span>
              <span className="grupo-valor" style={{ color: cor }}>
                {porcento(g.pontuacao)}
              </span>
            </div>
            <span className="barra-trilha">
              <span
                className="barra-cheia"
                style={{ width: `${Math.round(g.pontuacao * 100)}%`, background: cor }}
              />
            </span>
            <div className="grupo-legenda">
              {ORDEM_NIVEL.filter((n) => g.porNivel[n] > 0)
                .map((n) => `${g.porNivel[n]} ${ROTULO_NIVEL[n]}`)
                .join(' · ')}
              {g.validados > 0 && <> · {g.validados} validados</>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export interface AlunoProps {
  linha: LinhaDaCentral
  /** `null` quando o aluno nunca sincronizou: nao ha o que derivar. */
  estado: EstadoPersistido | null
  curriculo: Curriculo
  aoVoltar: () => void
  /** So o professor consegue: as regras negam ao proprio aluno. */
  aoTrocarTurma: (turma: string) => Promise<void>
}

export function Aluno({ linha, estado, curriculo, aoVoltar, aoTrocarTurma }: AlunoProps) {
  const agora = useMemo(() => new Date(), [])
  const [trocando, setTrocando] = useState(false)
  const [avisoDaTurma, setAvisoDaTurma] = useState<string | null>(null)
  const detalhe = useMemo(
    () => (estado ? detalheDoAluno({ estado, curriculo, agora }) : null),
    [estado, curriculo, agora],
  )

  return (
    <main className="painel">
      <button className="voltar" onClick={aoVoltar}>
        ← Todas as turmas
      </button>

      <section className="cartao">
        <div className="aluno-topo">
          <div>
            <h2 className="aluno-nome">{linha.nome}</h2>
            <p className="apoio" style={{ margin: 0 }}>{atividade(linha.diasSemEstudar)}</p>
          </div>

          {/*
            TROCAR A TURMA MORA AQUI, e nao na tabela.

            Na tabela, um seletor por linha convidaria a trocar a turma de
            alguem por engano ao passar o mouse — e turma decide se o progresso
            e medido e que grade sera montada. Aqui a acao esta na tela DAQUELA
            pessoa, com o nome dela no topo.

            Antes disto nao havia caminho nenhum: `atualizarTurma` existia no
            core e nenhuma interface chamava, entao a turma era decidida no
            convite e ficava imutavel. Um aluno na turma errada exigia edicao no
            banco a mao.
          */}
          <label className="troca-turma">
            <span>Turma</span>
            <select
              value={linha.turma}
              disabled={trocando}
              onChange={async (e) => {
                const nova = e.target.value
                setTrocando(true)
                setAvisoDaTurma(null)
                try {
                  await aoTrocarTurma(nova)
                  // Diz a CONSEQUENCIA e nao so "salvo": trocar entre uma turma
                  // que mede o curriculo e uma que nao mede faz o progresso
                  // aparecer ou virar `—`, e isso assusta se nao for anunciado.
                  setAvisoDaTurma(
                    medeCurriculoDeAzul(nova)
                      ? `Agora na ${nomeDaTurma(nova)} — o progresso passa a ser medido.`
                      : `Agora na ${nomeDaTurma(nova)} — sem currículo próprio, o progresso aparece como —.`,
                  )
                } catch (err) {
                  setAvisoDaTurma((err as Error)?.message ?? 'Não foi possível trocar a turma.')
                } finally {
                  setTrocando(false)
                }
              }}
            >
              {/* Sem turma e um estado real: todo cadastro anterior a este campo
                  esta nele, e "nao atribuido" precisa ser escolhivel de volta. */}
              <option value={SEM_TURMA}>{ROTULO_SEM_TURMA}</option>
              {TURMAS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} — {t.descricao}
                </option>
              ))}
              {/* Turma desconhecida (vinda do banco) nao pode desaparecer do
                  seletor: sem esta opcao, abrir a tela ja mudaria o valor. */}
              {linha.turma !== SEM_TURMA && !TURMAS.some((t) => t.id === linha.turma) && (
                <option value={linha.turma}>{linha.turma}</option>
              )}
            </select>
          </label>
        </div>

        {avisoDaTurma && (
          <p className="apoio" style={{ marginTop: 10, marginBottom: 0 }}>
            {avisoDaTurma}
          </p>
        )}

        {/*
          Atividade e aulas valem para toda turma, inclusive a que nao mede
          curriculo — nao dependem de qual e a prova.

          DOIS FATOS E NAO TRES. Havia um terceiro, "dias sem estudar", e ele
          tinha dois defeitos ao mesmo tempo: repetia a linha logo acima (que ja
          diz "estudou ontem", com singular certo) e, sendo numero cru sobre
          rotulo fixo, lia "1 / dias sem estudar". Repetir a mesma informacao
          duas vezes na mesma tela, uma delas com portugues errado, e pior que
          uma fileira com dois cartoes.
        */}
        <div className="fatos">
          <div className="fato">
            <div className="fato-valor">
              {linha.aulasFeitas}
              <small> / {linha.totalDeAulas}</small>
            </div>
            <div className="fato-rotulo">aulas do pacote</div>
          </div>
          <div className="fato">
            <div className="fato-valor">{linha.duvidasAbertas}</div>
            <div className="fato-rotulo">
              {linha.duvidasAbertas === 1 ? 'dúvida aberta' : 'dúvidas abertas'}
            </div>
          </div>
        </div>
      </section>

      {/* Nunca sincronizou: nao ha progresso porque nao ha dado. Dizer isso e
          diferente de mostrar zeros, que seriam um fato inventado. */}
      {estado === null && (
        <section className="cartao">
          <h3>Sem dados ainda</h3>
          <p className="apoio" style={{ marginBottom: 0 }}>
            {linha.motivo === 'turma-sem-curriculo'
              ? 'Turma sem currículo próprio: o exame de azul não é a meta dela. Progresso aparecerá quando houver currículo desta faixa.'
              : 'Este aluno entrou na conta mas nunca sincronizou. Nada aqui é zero — é ausência de informação. Se isso persistir, vale confirmar com ele se o app está aberto e com internet.'}
          </p>
        </section>
      )}

      {detalhe && linha.motivo === 'turma-sem-curriculo' && (
        <section className="cartao">
          <h3>Turma sem currículo próprio</h3>
          <p className="apoio" style={{ marginBottom: 0 }}>
            Este aluno sincroniza normalmente, mas a turma dele é de
            intermediário/avançado — medir contra o exame de azul produziria um número
            errado com aparência de certo. Atividade e dúvidas acima continuam valendo.
          </p>
        </section>
      )}

      {detalhe && linha.motivo === null && (
        <>
          <section className="cartao">
            <h3>Prontidão</h3>
            <div className="dois-eixos">
              <div>
                <div
                  className="eixo-valor"
                  style={{ color: corDaFaixa(faixaDaPontuacao(detalhe.dominio)) }}
                >
                  {porcento(detalhe.dominio)}
                </div>
                <div className="eixo-rotulo">
                  ele recupera
                  <small>de memória, sem consultar</small>
                </div>
              </div>
              <div>
                <div
                  className="eixo-valor"
                  style={{ color: corDaFaixa(faixaDaPontuacao(detalhe.validado)) }}
                >
                  {porcento(detalhe.validado)}
                </div>
                <div className="eixo-rotulo">
                  você validou
                  <small>confirmado na academia</small>
                </div>
              </div>
            </div>

            {detalhe.nadaAinda && (
              <p className="apoio" style={{ marginTop: 16, marginBottom: 0 }}>
                Sincronizou, mas ainda não fez nenhuma revisão. Os números existem e são
                zero — diferente de não haver dado.
              </p>
            )}
          </section>

          {/* A fila. Vem ANTES dos gráficos de propósito: é o único bloco desta
              página em que o professor tem algo a fazer. */}
          {detalhe.esperando.length > 0 && (
            <section className="cartao">
              <h3>
                Esperando você olhar
                <span className="contagem-linhas">
                  {detalhe.esperando.length}{' '}
                  {detalhe.esperando.length === 1 ? 'técnica' : 'técnicas'}
                </span>
              </h3>
              <p className="apoio">
                Ele recupera estas com segurança e você ainda não confirmou. Dominar a
                versão errada não conta na prova — é a pauta natural da próxima aula.
              </p>
              <ul className="fila">
                {detalhe.esperando.map((i) => (
                  <li key={i.itemId}>
                    <strong>{i.nome.trim() === '' ? i.slot : i.nome}</strong>
                    <span className="fila-onde">
                      {i.posicao}
                      {i.nome.trim() !== '' && <> · {i.slot}</>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!detalhe.nadaAinda && detalhe.maisFracas.length > 0 && (
            <section className="cartao">
              <h3>Onde focar</h3>
              <p className="apoio">As três posições mais fracas dele.</p>
              <Barras grupos={detalhe.maisFracas} />
            </section>
          )}

          <div className="dois-blocos dois-blocos--iguais">
            <section className="cartao">
              <h3>Por tipo de técnica</h3>
              <Barras grupos={detalhe.porGrupo} />
            </section>
            <section className="cartao">
              <h3>Por posição</h3>
              <Barras grupos={detalhe.porPosicao} />
            </section>
          </div>

          <p className="rodape-nota">
            Estes são <strong>os mesmos números que o aluno vê</strong> na tela Progresso do
            app dele. O progresso pesa domínio e recência, não quantidade de cartões
            respondidos: uma técnica recupera o nível ao ser revista, e perde quando fica
            muito tempo sem revisão.
          </p>
        </>
      )}
    </main>
  )
}
