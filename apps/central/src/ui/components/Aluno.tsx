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
import type { ReactNode } from 'react'
import type { ProgressoDeGrupo, NivelDominio } from '@faixa-azul/core/application/progresso'
import { faixaDaPontuacao } from '@faixa-azul/core/application/progresso'
import { detalheDoAluno } from '@faixa-azul/core/application/central'
import type { Curriculo, LinhaDaCentral } from '@faixa-azul/core/application/central'
import {
  nomeDaTurma,
  ROTULO_SEM_TURMA,
  SEM_TURMA,
  TURMAS,
} from '@faixa-azul/core/domain/turmas'
import { aulasExigidas, METAS, metaPorId, nomeDaMeta, ROTULO_SEM_META, SEM_META } from '@faixa-azul/core/domain/metas'
import { curriculoPorId } from '@faixa-azul/core/seed/curriculos'
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
  /**
   * Trocar a meta. Mais consequente que a turma: a meta decide contra QUE prova
   * ele e medido e por qual medida — cartoes ou atestado.
   */
  aoTrocarMeta: (meta: string) => Promise<void>
  /**
   * Trocar o CURRICULO que ele estuda — campo diferente da meta (ADR-017,
   * decisao 6).
   *
   * ESTE E O CONSEQUENTE DOS DOIS: `estuda` decide o denominador do progresso E
   * a medida (cartoes ou atestado). Trocar a meta muda o rotulo da prova;
   * trocar isto muda o numero.
   */
  aoTrocarEstuda: (estuda: string) => Promise<void>
  /** Ligar ou desligar as aulas particulares deste aluno. */
  aoTrocarParticulares: (tem: boolean) => Promise<void>
  /** Grava quantas aulas ele ja fez rumo a graduacao atual. */
  aoTrocarAulasDoGrau: (aulas: number) => Promise<void>
  /**
   * A aba Aulas. Chega como no filho pronto e nao como dados: a montagem tem
   * estado proprio (`useGrade`), e ele so deve existir quando a aba esta aberta
   * — carregar a grade de um aluno que ninguem abriu seria leitura desperdicada.
   */
  aulas: ReactNode
  /**
   * A folha do atestado. `null` quando a meta nao e medida por atestado — uma
   * aba que abre vazia e pior que uma aba que nao existe.
   */
  atestado: ReactNode | null
}

export function Aluno({
  linha,
  estado,
  curriculo,
  aoVoltar,
  aoTrocarTurma,
  aoTrocarMeta,
  aoTrocarEstuda,
  aoTrocarParticulares,
  aoTrocarAulasDoGrau,
  aulas,
  atestado,
}: AlunoProps) {
  /**
   * DUAS ABAS (ADR-015, decisao 11), e a de Aulas so existe agora que tem
   * conteudo. Na entrega 1 ela ficou de fora de proposito: uma aba que abre
   * vazia e pior que uma aba que nao existe.
   */
  const [aba, setAba] = useState<'progresso' | 'aulas' | 'atestado'>('progresso')
  const agora = useMemo(() => new Date(), [])
  const [trocando, setTrocando] = useState(false)
  const [avisoDaTurma, setAvisoDaTurma] = useState<string | null>(null)
  const [trocandoMeta, setTrocandoMeta] = useState(false)
  const [trocandoEstuda, setTrocandoEstuda] = useState(false)
  const [avisoDoEstuda, setAvisoDoEstuda] = useState<string | null>(null)
  const [trocandoParticulares, setTrocandoParticulares] = useState(false)
  const [avisoDaMeta, setAvisoDaMeta] = useState<string | null>(null)
  const [gravandoAulas, setGravandoAulas] = useState(false)
  /**
   * `null` = a meta nao conta aulas (o azul: a prova e a prova) ou nao ha meta.
   * Nesse caso o fato e o campo somem — nao ha denominador para mostrar.
   */
  const aulasExigidasDaMeta = aulasExigidas(linha.meta)
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
                  /**
                   * A MENSAGEM MUDOU PORQUE A REGRA MUDOU. Ela dizia que trocar
                   * de turma fazia o progresso aparecer ou virar `—` — e isso
                   * era verdade enquanto a turma decidia o curriculo. Agora
                   * quem decide e a META, e manter a frase antiga faria a tela
                   * afirmar uma consequencia que nao acontece mais.
                   */
                  setAvisoDaTurma(
                    `Agora na ${nomeDaTurma(nova)}. A turma é horário — o que é medido depende da meta.`,
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

          {/*
            META AO LADO DA TURMA, e nao em outra tela: as duas sao "quem esse
            aluno e para o sistema", e trocar uma sem ver a outra e o caminho
            para por alguem na RG1A buscando o azul sem perceber.

            O aviso diz a MEDIDA e nao so o nome: sair de `azul` para `1grau`
            troca progresso por cartoes por progresso por atestado, e o numero
            da tabela muda de natureza. Sem anunciar, parece que zerou.
          */}
          <label className="troca-turma">
            <span>Buscando</span>
            <select
              value={linha.meta}
              disabled={trocandoMeta}
              onChange={async (e) => {
                const nova = e.target.value
                setTrocandoMeta(true)
                setAvisoDaMeta(null)
                try {
                  await aoTrocarMeta(nova)
                  /**
                   * O AVISO FALA SO DA PROVA, e nao mais da medida.
                   *
                   * Ele dizia "o progresso passa a vir dos cartoes dele" — o que
                   * deixou de ser consequencia de trocar a meta: quem decide a
                   * medida e o curriculo que a pessoa ESTUDA (ADR-017, decisao
                   * 6). Trocar a meta de alguem que estuda azul nao muda nada no
                   * progresso, e o aviso antigo afirmaria uma mudanca que nao
                   * aconteceu.
                   */
                  const m = metaPorId(nova)
                  setAvisoDaMeta(
                    m === null
                      ? `Meta agora é ${nomeDaMeta(nova)} — meta desconhecida por este aparelho.`
                      : m.aulasExigidas === null
                        ? `Agora buscando ${m.nome}. ${m.descricao}.`
                        : `Agora buscando ${m.nome} — ${m.aulasExigidas} aulas exigidas.`,
                  )
                } catch (err) {
                  setAvisoDaMeta((err as Error)?.message ?? 'Não foi possível trocar a meta.')
                } finally {
                  setTrocandoMeta(false)
                }
              }}
            >
              <option value={SEM_META}>{ROTULO_SEM_META}</option>
              {METAS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
              {/* Meta desconhecida vinda do banco continua no seletor: sem esta
                  opcao, ABRIR a tela reatribuiria o aluno em silencio. Mesmo
                  defeito que o seletor de turma teve e que foi verificado. */}
              {linha.meta !== SEM_META && !METAS.some((m) => m.id === linha.meta) && (
                <option value={linha.meta}>{linha.meta}</option>
              )}
            </select>
          </label>

          {/*
            ESTUDA AO LADO DE BUSCANDO, e a proximidade e o ponto: separados em
            duas telas, ninguem enxergaria a divergencia que motivou o campo
            existir — perseguir o 3o grau estudando o curriculo de azul.

            O aviso diz a MEDIDA, que e o que este seletor de fato muda. Sair de
            `azul` para `1grau` troca progresso por cartoes por progresso por
            atestado, e o numero da tabela muda de natureza; sem anunciar, parece
            que zerou. (Este aviso vivia no seletor de meta, onde havia deixado
            de ser verdade.)
          */}
          <label className="troca-turma">
            <span>Estuda</span>
            <select
              value={linha.estuda}
              disabled={trocandoEstuda}
              onChange={async (e) => {
                const novo = e.target.value
                setTrocandoEstuda(true)
                setAvisoDoEstuda(null)
                try {
                  await aoTrocarEstuda(novo)
                  const c = curriculoPorId(novo)
                  setAvisoDoEstuda(
                    c === null
                      ? `Sem lista de itens para ${nomeDaMeta(novo)} — o progresso aparece como —.`
                      : c.medida === 'cartoes'
                        ? `Estudando ${nomeDaMeta(novo)}: ${c.itens.filter((i) => i.ativo).length} itens, progresso pelos cartões.`
                        : `Estudando ${nomeDaMeta(novo)}: ${c.itens.length} itens, progresso pelo que VOCÊ atesta.`,
                  )
                } catch (err) {
                  setAvisoDoEstuda((err as Error)?.message ?? 'Não foi possível trocar o currículo.')
                } finally {
                  setTrocandoEstuda(false)
                }
              }}
            >
              <option value={SEM_META}>Sem currículo</option>
              {METAS.filter((m) => m.temCurriculo).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
              {/* Valor desconhecido continua no seletor pelo mesmo motivo dos
                  outros dois: sem esta opcao, ABRIR a tela reatribuiria o aluno
                  em silencio — defeito ja verificado no seletor de turma.
                  Inclui as metas SEM curriculo, que ficam fora da lista acima. */}
              {linha.estuda !== SEM_META && !METAS.some((m) => m.id === linha.estuda && m.temCurriculo) && (
                <option value={linha.estuda}>{nomeDaMeta(linha.estuda)}</option>
              )}
            </select>
          </label>

          {/*
            PARTICULARES E UM INTERRUPTOR, e nao um numero (ADR-017).
            O pacote de 10 aulas e coisa CONTRATADA, e a maioria da turma nao
            contratou — mostrar "0 de 10" para quem nunca contratou inventaria
            uma divida que nao existe.
          */}
          <label className="troca-turma">
            <span>Particulares</span>
            <select
              value={linha.temParticulares ? 'sim' : 'nao'}
              disabled={trocandoParticulares}
              onChange={async (e) => {
                const tem = e.target.value === 'sim'
                setTrocandoParticulares(true)
                try {
                  await aoTrocarParticulares(tem)
                } finally {
                  setTrocandoParticulares(false)
                }
              }}
            >
              <option value="nao">Não contratou</option>
              <option value="sim">Contratou</option>
            </select>
          </label>

          {/*
            AS AULAS SAO DIGITADAS, e nao contadas pelo sistema.

            Sem presenca o app nao sabe a quantas aulas o aluno foi, e a contagem
            da turma nao serve: "o Henrique ja tem 12 aulas mas teve um problema
            de saude e ficou varios meses parado" — a RGI seguiu dando aula sem
            ele. Quem sabe e o professor, e este e o lugar de guardar.

            `onBlur` E NAO `onChange`: gravar a cada tecla mandaria uma escrita
            para o Firestore por digito ("1", "12"), e um numero de dois digitos
            passaria pelo estado 1 no caminho.
          */}
          {aulasExigidasDaMeta !== null && (
            <label className="troca-turma">
              <span>Aulas feitas</span>
              <input
                type="number"
                min={0}
                max={999}
                defaultValue={linha.aulasDoGrau}
                disabled={gravandoAulas}
                title={`Quantas aulas ele já fez rumo ao ${nomeDaMeta(linha.meta)}. A regra pede ${aulasExigidasDaMeta}.`}
                onBlur={async (e) => {
                  const n = Math.max(0, Math.round(Number(e.target.value)))
                  if (!Number.isFinite(n) || n === linha.aulasDoGrau) return
                  setGravandoAulas(true)
                  try {
                    await aoTrocarAulasDoGrau(n)
                  } finally {
                    setGravandoAulas(false)
                  }
                }}
              />
            </label>
          )}
        </div>

        {avisoDoEstuda && (
          <p className="apoio" style={{ marginTop: 10, marginBottom: 0 }}>
            {avisoDoEstuda}
          </p>
        )}
        {avisoDaTurma && (
          <p className="apoio" style={{ marginTop: 10, marginBottom: 0 }}>
            {avisoDaTurma}
          </p>
        )}
        {avisoDaMeta && (
          <p className="apoio" style={{ marginTop: 10, marginBottom: 0 }}>
            {avisoDaMeta}
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
          {/*
            AS AULAS DA GRADUACAO, e nao as do pacote de particulares.

            Era `aulasFeitas / totalDeAulas` com o rotulo "aulas do pacote" — as
            dez aulas CONTRATADAS. Pedido dele em 10/09/2026: 'troque "0/10 aula
            do pacote" por "0/35 aulas para seu 1 Grau"'. Trocar so o rotulo
            seria pior: poria a contagem de particulares sob um rotulo de
            graduacao, um numero errado embaixo de um rotulo certo.

            O denominador vem da META (`aulasExigidas`), e o numerador do
            CADASTRO, mantido pelo professor. O caso que provou que nao pode ser
            derivado: "o Henrique ja tem 12 aulas mas teve um problema de saude e
            ficou varios meses parado". A turma seguiu dando aula sem ele.

            SEM DENOMINADOR (meta `azul`, cuja prova nao conta aulas, ou meta sem
            definir) o fato SOME em vez de mostrar "12 / —": um fato que nao se
            aplica gasta espaco para nao dizer nada. Quem contratou particulares
            volta a ver o pacote, que ali e a conta que importa.
          */}
          {aulasExigidasDaMeta !== null && (
            <div className="fato">
              <div className="fato-valor">
                {linha.aulasDoGrau}
                <small> / {aulasExigidasDaMeta}</small>
              </div>
              <div className="fato-rotulo">aulas para o {nomeDaMeta(linha.meta)}</div>
            </div>
          )}
          {linha.temParticulares && (
            <div className="fato">
              <div className="fato-valor">
                {linha.aulasFeitas}
                <small> / {linha.totalDeAulas}</small>
              </div>
              <div className="fato-rotulo">aulas do pacote</div>
            </div>
          )}
          <div className="fato">
            <div className="fato-valor">{linha.duvidasAbertas}</div>
            <div className="fato-rotulo">
              {linha.duvidasAbertas === 1 ? 'dúvida aberta' : 'dúvidas abertas'}
            </div>
          </div>
        </div>
      </section>

      <div className="abas-aluno" role="tablist" aria-label="Progresso ou aulas">
        <button
          role="tab"
          aria-selected={aba === 'progresso'}
          className={aba === 'progresso' ? 'aba-aluno aba-aluno--ativa' : 'aba-aluno'}
          onClick={() => setAba('progresso')}
        >
          Progresso
        </button>
        <button
          role="tab"
          aria-selected={aba === 'aulas'}
          className={aba === 'aulas' ? 'aba-aluno aba-aluno--ativa' : 'aba-aluno'}
          onClick={() => setAba('aulas')}
        >
          Aulas
        </button>
        {/* A aba do atestado so existe quando ha o que atestar: meta medida por
            atestado. Para quem busca o azul, ela nao aparece. */}
        {atestado !== null && (
          <button
            role="tab"
            aria-selected={aba === 'atestado'}
            className={aba === 'atestado' ? 'aba-aluno aba-aluno--ativa' : 'aba-aluno'}
            onClick={() => setAba('atestado')}
          >
            Atestado
          </button>
        )}
      </div>

      {aba === 'aulas' && aulas}
      {aba === 'atestado' && atestado}

      {/* Nunca sincronizou: nao ha progresso porque nao ha dado. Dizer isso e
          diferente de mostrar zeros, que seriam um fato inventado. */}
      {aba === 'progresso' && estado === null && (
        <section className="cartao">
          <h3>Sem dados ainda</h3>
          <p className="apoio" style={{ marginBottom: 0 }}>
            {linha.motivo !== null && linha.motivo !== 'sem-dados'
              ? 'A meta deste aluno ainda não tem currículo, ou é medida pelo seu atestado. Progresso por cartões aparece quando houver lista com passo a passo.'
              : 'Este aluno entrou na conta mas nunca sincronizou. Nada aqui é zero — é ausência de informação. Se isso persistir, vale confirmar com ele se o app está aberto e com internet.'}
          </p>
        </section>
      )}

      {aba === 'progresso' && detalhe && linha.motivo !== null && linha.motivo !== 'sem-dados' && (
        <section className="cartao">
          <h3>Turma sem currículo próprio</h3>
          <p className="apoio" style={{ marginBottom: 0 }}>
            Este aluno sincroniza normalmente, mas a turma dele é de
            intermediário/avançado — medir contra o exame de azul produziria um número
            errado com aparência de certo. Atividade e dúvidas acima continuam valendo.
          </p>
        </section>
      )}

      {aba === 'progresso' && detalhe && linha.motivo === null && (
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
                {/*
                  ROTULO CORRIGIDO (ADR-016, decisao 6). Ele dizia "você validou
                  · confirmado na academia", ao lado de "ele recupera" — e lido
                  junto isso afirmava que o professor confirmou que ELE FAZ.

                  O dado diz outra coisa: `validado_pelo_professor` e o professor
                  confirmando que o PASSO A PASSO da tecnica esta certo. O
                  cabecalho de `validacao.ts` e explicito: existe porque 70 dos
                  81 itens tem conteudo redigido como sugestao, nao como o
                  curriculo da academia.

                  Quem afirma que o ALUNO executa e a aba Atestado, que e outro
                  registro. O rotulo mentia sobre o que media.
                */}
                <div className="eixo-rotulo">
                  passo a passo conferido
                  <small>você confirmou o CONTEÚDO da técnica</small>
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
