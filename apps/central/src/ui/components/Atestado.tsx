/**
 * A folha de atestacao — o formato que o professor mandou.
 *
 * AS SEIS SECOES SAO AS DELE, na ordem dele: Quedas, Guarda fechada, Educativos,
 * Posicao individual, Finalizacoes, Saidas. Vem dos modulos do curriculo, que
 * foram escritos com as palavras dele. Reagrupar aqui criaria uma segunda
 * linguagem que ninguem na academia fala.
 *
 * ATESTAR E UM CLIQUE, e o texto virou opcional. O registro nunca fica sem
 * texto — `criarCompetencia` e as regras do Firestore continuam recusando — mas
 * quem escreve por padrao e o APP, gravando a procedencia ("RGI · 08/09/2026").
 * O campo obrigatorio produziu a palavra "ok" em cinco das seis primeiras
 * atestacoes feitas em producao; ele nao produzia justificativa, produzia atrito.
 * A nota do professor continua ali, atras de um link, para quando ele TIVER algo
 * a dizer.
 *
 * ---------------------------------------------------------------------------
 * "APTO AO GRAU" PASSOU A SER AFIRMADO — 09/09/2026, decisao dele.
 *
 * Este cabecalho dizia o contrario: "fundir os dois num unico 'apto' faria a
 * tela afirmar algo que ela nao sabe". O que mudou foi o que ela sabe:
 *
 *   - PRESENCA FOI DESCARTADA, e com ela a ideia de "aulas cumpridas por aluno".
 *   - AS AULAS NAO SAO CONDICAO: "pode acontecer de um aluno se destacar e
 *     conseguir estar apto ao grau antes do tempo" (palavras dele).
 *
 * Entao o selo verde e sobre as COMPETENCIAS, calculado por `aptidaoAoGrau` —
 * uma funcao so, que a tabela da Central tambem usa, para as duas telas nao
 * poderem discordar. E a contagem de aulas continua na folha com DOIS numeros
 * desde 10/09: as aulas DO ALUNO (`aulasDoGrau`, que o professor mantem no
 * cadastro e que pre-preenche o campo de conceder) e as DA TURMA, como contexto.
 * Os dois divergem quando o aluno para: "o Henrique ja tem 12 aulas mas teve um
 * problema de saude e ficou varios meses parado".
 * ---------------------------------------------------------------------------
 */

import { useState } from 'react'
import { aulasFaltando, montarAtestado } from '@faixa-azul/core/application/atestado'
import type { Atestado as FolhaDeAtestado, LinhaDoAtestado } from '@faixa-azul/core/application/atestado'
import type { OrigemDaCompetencia, RegistroDeCompetencia } from '@faixa-azul/core/domain/competencia'
import { procedenciaDaAtestacao } from '@faixa-azul/core/domain/competencia'
import type { RegistroDeGraduacao } from '@faixa-azul/core/nuvem/competencias'
import type { Curriculo } from '@faixa-azul/core/domain/curriculo'
import type { Modulo } from '@faixa-azul/core/domain/types'
import { nomeDaMeta } from '@faixa-azul/core/domain/metas'
import { nomeDaTurma } from '@faixa-azul/core/domain/turmas'
import type { FaseDoAtestado } from '../useAtestado'
import { corDaFaixa, porcento } from '../formato'
import { faixaDaPontuacao } from '@faixa-azul/core/application/progresso'

const ROTULO_ORIGEM: Record<OrigemDaCompetencia, string> = {
  aula_regular: 'aula regular',
  aula_particular: 'aula particular',
  exame: 'exame',
}

function dataCurta(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d)
}

/**
 * Uma linha da folha, com o formulario embutido quando aberto.
 *
 * O FORMULARIO ABRE NA LINHA e nao num modal: atestar e uma sequencia — o
 * professor passa por varios itens seguidos, e um modal por item obrigaria a
 * abrir e fechar 29 vezes.
 */
function Linha({
  linha,
  gravando,
  procedencia,
  aoAtestar,
}: {
  linha: LinhaDoAtestado
  gravando: boolean
  /** O texto que o app escreve quando o professor so clica. */
  procedencia: string
  aoAtestar: (e: { itemId: string; competente: boolean; texto: string; origem: OrigemDaCompetencia }) => void
}) {
  const [abertoParaNota, setAbertoParaNota] = useState(false)
  const [texto, setTexto] = useState('')
  const [origem, setOrigem] = useState<OrigemDaCompetencia>('aula_regular')
  const retirando = linha.competente

  const gravar = (comTexto: string) => {
    aoAtestar({
      itemId: linha.item.id,
      competente: !retirando,
      // O TEXTO DO PROFESSOR MANDA QUANDO EXISTE; a procedencia entra quando ele
      // so clicou. Nunca string vazia: `criarCompetencia` recusa, e a regra do
      // Firestore tambem — o que se perdeu foi a OBRIGACAO de digitar, nao a
      // exigencia de o registro dizer algo.
      texto: comTexto.trim() === '' ? procedencia : comTexto.trim(),
      origem,
    })
    setTexto('')
    setAbertoParaNota(false)
  }

  return (
    <li className={linha.competente ? 'linha-atestado linha-atestado--ok' : 'linha-atestado'}>
      <div className="atestado-topo">
        <span className="atestado-nome">
          {linha.item.nome.trim() === '' ? linha.item.slot : linha.item.nome}
          {/* Item atestado e retirado mais de uma vez merece um olhar: pode ser
              hesitacao real, e o historico esta ali para isso. */}
          {linha.vezes > 1 && <span className="atestado-vezes">{linha.vezes} registros</span>}
        </span>

        <div className="atestado-botoes">
          {/*
            UM CLIQUE, E O CAMPO DE TEXTO SAIU DO CAMINHO.

            Este formulario exigia texto para gravar, com a frase "o texto e
            obrigatorio: e ele que faz a folha valer como evidencia". Das seis
            primeiras atestacoes feitas em producao, CINCO tinham o texto "ok".

            O campo obrigatorio nao produziu justificativa: produziu atrito e a
            palavra "ok". Agora o clique grava a procedencia que o app escreve
            (`RGI · 08/09/2026`), que diz onde e quando — e o professor escreve
            quando TIVER algo a dizer, no botao de nota ao lado.
          */}
          <button
            className={linha.competente ? 'botao-texto' : 'botao botao--pequeno'}
            onClick={() => gravar('')}
            disabled={gravando}
            title={
              retirando
                ? `Retira o atestado e grava "${procedencia}"`
                : `Atesta e grava "${procedencia}"`
            }
          >
            {retirando ? 'retirar' : 'atestar'}
          </button>

          {/* A NOTA E OPCIONAL E FICA ESCONDIDA ATRAS DE UM LINK: quem tem algo a
              dizer sobre um item especifico ainda pode, e quem so quer marcar 29
              itens nao paga por isso. */}
          <button
            className="botao-texto atestado-nota"
            onClick={() => setAbertoParaNota((a) => !a)}
            disabled={gravando}
            title="Escrever uma observação sobre este item"
          >
            {abertoParaNota ? 'cancelar' : 'nota'}
          </button>
        </div>
      </div>

      {linha.ultimo && !abertoParaNota && (
        <div className="atestado-quando">
          {linha.competente ? 'atestado' : 'retirado'} em {dataCurta(linha.ultimo.registradaEm)} ·{' '}
          {ROTULO_ORIGEM[linha.ultimo.origem]} — “{linha.ultimo.texto}”
        </div>
      )}

      {abertoParaNota && (
        <div className="atestado-form">
          <label className="campo">
            {retirando ? 'Por que está retirando?' : 'O que você viu?'}
            <input
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={
                retirando ? 'ex.: errou o detalhe do quadril' : 'ex.: fez limpo dos dois lados'
              }
              autoFocus
            />
          </label>

          <div className="atestado-acoes">
            <select
              className="destino"
              value={origem}
              onChange={(e) => setOrigem(e.target.value as OrigemDaCompetencia)}
              aria-label="Onde você viu"
            >
              <option value="aula_regular">aula regular</option>
              <option value="aula_particular">aula particular</option>
              <option value="exame">exame</option>
            </select>

            {/* SEM `disabled` POR TEXTO VAZIO: gravar sem nota e um caminho
                valido agora — cai na procedencia. O botao que travava era o
                pedagio. */}
            <button className="botao botao--pequeno" disabled={gravando} onClick={() => gravar(texto)}>
              {retirando ? 'Retirar' : 'Atestar'}
            </button>
          </div>
          <p className="apoio" style={{ margin: '6px 0 0', fontSize: '0.72rem' }}>
            Sem escrever nada, fica gravado <strong>“{procedencia}”</strong>.
          </p>
        </div>
      )}
    </li>
  )
}

/** O bloco de conceder. Só aparece quando as competências fecham. */
function Conceder({
  folha,
  meta,
  aulasDoGrau,
  gravando,
  aoConceder,
}: {
  folha: FolhaDeAtestado
  meta: string
  /** Aulas que ESTE ALUNO fez — o numero que pre-preenche o campo. */
  aulasDoGrau: number
  gravando: boolean
  aoConceder: (e: { meta: string; texto: string; aulasConfirmadas: number | null }) => void
}) {
  const [texto, setTexto] = useState('')
  /**
   * `null` = O PROFESSOR AINDA NAO TOCOU no campo, e o valor mostrado vem da
   * contagem da turma. Guardar `''` como inicial nao serviria: a contagem chega
   * DEPOIS (leitura do programa), e um `useState(String(...))` capturaria o
   * `null` do primeiro render e nunca mais atualizaria. Este padrao evita um
   * `useEffect` de sincronizacao — e efeito que escreve estado a partir de prop
   * e a familia exata de laco que fez esta tela piscar em producao.
   */
  const [tocado, setTocado] = useState<string | null>(null)
  const exigidas = folha.aulas.exigidas
  const daTurma = folha.aulas.cumpridas
  /**
   * O CAMPO VEM COM O NUMERO DO ALUNO, e nao com o da turma.
   *
   * Era `daTurma`, e isso convidava a gravar no registro de graduacao um numero
   * que o aluno talvez nao tenha: "o Henrique ja tem 12 aulas mas ficou varios
   * meses parado" — a RGI seguiu dando aula sem ele. A contagem da turma
   * continua visivel na linha de contexto, rotulada como da turma.
   */
  const aulas = tocado ?? String(aulasDoGrau)

  const numeroDeAulas = aulas.trim() === '' ? null : Number(aulas)
  /**
   * Atende a regra das N aulas? Vira AVISO e nao mais bloqueio.
   *
   * ERA `disabled` NO BOTAO, e isso contradizia a regra dele: "pode acontecer de
   * um aluno se destacar e conseguir estar apto ao grau antes do tempo, mas nao e
   * regra, e algo esporadico". Com o bloqueio, conceder a esse aluno exigia
   * digitar um numero de aulas que ele nao fez — ou seja, o campo forcava a
   * mentira que ele existe para registrar. Pior ainda depois do selo "apto":
   * a tela afirmava aptidao e travava a concessao na mesma vista.
   *
   * Agora o numero abaixo do exigido passa, com o aviso visivel, e fica gravado
   * como veio — que e o registro honesto da excecao.
   */
  const atendeARegra =
    exigidas === null ||
    (numeroDeAulas !== null && Number.isFinite(numeroDeAulas) && numeroDeAulas >= exigidas)

  return (
    <section className="cartao cartao--conceder">
      <h3>Conceder o {nomeDaMeta(meta)}</h3>
      <p className="apoio">
        As <strong>{folha.total} competências</strong> estão atestadas.
        {exigidas !== null && (
          <>
            {' '}
            A regra pede <strong>{exigidas} aulas</strong>.{' '}
            O campo vem com as <strong>{aulasDoGrau}</strong> que você registrou no
            cadastro dele
            {daTurma !== null && <> — a turma já deu {daTurma}</>}. Corrija aqui se
            precisar; o registro guarda o que você confirmar.
          </>
        )}
      </p>

      {exigidas !== null && (
        <label className="campo">
          Quantas aulas ele fez?
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={aulas}
            onChange={(e) => setTocado(e.target.value)}
            placeholder={String(exigidas)}
          />
        </label>
      )}

      <label className="campo">
        O que você quer registrar sobre esta graduação?
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="ex.: fechou os 29 itens; evoluiu muito na guarda fechada"
        />
      </label>

      {/* O TEXTO CONTINUA OBRIGATORIO AQUI, ao contrario da atestacao de um item.
          Conceder graduacao acontece uma vez por grau e e o registro que alguem
          vai ler anos depois; atestar um item acontece 29 vezes e foi onde o
          campo obrigatorio produziu a palavra "ok". Frequencia diferente, atrito
          com peso diferente. */}
      <button
        className="botao"
        disabled={texto.trim() === '' || gravando}
        onClick={() => aoConceder({ meta, texto: texto.trim(), aulasConfirmadas: numeroDeAulas })}
      >
        Conceder o {nomeDaMeta(meta)}
      </button>

      {/* Diz o que vai acontecer ANTES de acontecer: a meta avanca, e isso muda
          contra o que ele passa a ser medido. */}
      <p className="apoio" style={{ marginTop: 10, marginBottom: 0 }}>
        Ao conceder, o registro fica gravado com a data e o seu nome, e a meta dele avança
        para a próxima graduação.
      </p>
      {/* AVISO E NAO BLOQUEIO: o aluno que se destaca existe, e a excecao fica
          registrada com o numero real em vez de forcada a um numero falso. */}
      {exigidas !== null && !atendeARegra && (
        <p className="aviso" style={{ marginTop: 10, marginBottom: 0 }}>
          {aulas.trim() === ''
            ? `Sem número de aulas, o registro vai guardar que o sistema não contou.`
            : `A regra pede ao menos ${exigidas} aulas, e você está concedendo com ${numeroDeAulas}. Pode conceder — fica gravado assim.`}
        </p>
      )}
    </section>
  )
}

export interface AtestadoProps {
  curriculo: Curriculo
  modulos: readonly Modulo[]
  registros: readonly RegistroDeCompetencia[]
  graduacoes: readonly RegistroDeGraduacao[]
  meta: string
  /**
   * A turma do aluno, para a procedencia que o app escreve quando o professor so
   * clica: `"RGI · 08/09/2026"`.
   *
   * SEM O NUMERO DA AULA, ao contrario da matriz de acompanhamento — e a
   * assimetria e deliberada. A matriz nasce do PROGRAMA: ela sabe que o item foi
   * dado na aula 5 e escreve isso. Esta folha e uma revisao por aluno, aberta a
   * qualquer momento, e o item pode nem estar no programa (os 81 de azul nao
   * estao). Inventar um numero de aula aqui gravaria uma aula que talvez nao
   * tenha existido.
   */
  turma: string
  /** De onde saiu a lista: da PROVA (fecha o grau) ou do ESTUDO (só registra). */
  origemDoCurriculo: 'prova' | 'estudo'
  /** O id do currículo em uso, para nomear qual lista está na folha. */
  idDoCurriculo: string
  /** `null` enquanto o app não contar presença (fatia 3 do ADR-016). */
  /**
   * Aulas que A TURMA ja deu — CONTEXTO, e nao a conta do aluno.
   *
   * `null` quando nao consegui ler o programa da turma.
   */
  aulasDaTurma: number | null
  /** Aulas que ESTE ALUNO fez, mantidas pelo professor. Vai no campo de conceder. */
  aulasDoGrau: number
  fase: FaseDoAtestado
  mensagem: string | null
  aoAtestar: (e: { itemId: string; competente: boolean; texto: string; origem: OrigemDaCompetencia }) => void
  aoConceder: (e: { meta: string; texto: string; aulasConfirmadas: number | null }) => void
}

export function Atestado({
  curriculo,
  modulos,
  registros,
  graduacoes,
  meta,
  turma,
  origemDoCurriculo,
  idDoCurriculo,
  aulasDaTurma,
  aulasDoGrau,
  fase,
  mensagem,
  aoAtestar,
  aoConceder,
}: AtestadoProps) {
  if (fase === 'carregando') return <p className="apoio">Lendo as competências…</p>

  const folha = montarAtestado({ curriculo, modulos, registros, meta, aulasCumpridas: aulasDaTurma })
  /**
   * A procedencia e calculada UMA VEZ e passada para as linhas.
   *
   * `new Date()` dentro de cada linha seria 81 objetos por render e 81 textos
   * que podem discordar no segundo — dois itens atestados no mesmo clique
   * levariam datas diferentes se a meia-noite caisse no meio.
   */
  const procedencia = procedenciaDaAtestacao({ turma, aula: null, data: null, agora: new Date() })
  const gravando = fase === 'gravando'
  const faltamAulas = aulasFaltando(folha.aulas)
  const jaConcedida = graduacoes.some((g) => g.meta === meta)

  return (
    <>
      <section className="cartao">
        <div className="topo-grade">
          <div>
            <h3 style={{ margin: 0 }}>
              {origemDoCurriculo === 'prova'
                ? nomeDaMeta(meta)
                : `Competências · ${nomeDaMeta(idDoCurriculo)}`}
              {/*
                O SELO "APTO AO GRAU" — decisao dele em 09/09/2026.

                SO PARA CURRICULO DE PROVA (`origemDoCurriculo === 'prova'`), e
                essa condicao e a segunda metade da guarda. `aptidao` ja recusa
                curriculo de cartoes; aqui a recusa e outra: quando a lista da
                meta nao chegou, a folha mostra o curriculo que ele TREINA, e
                dizer "apto ao 3o grau" por ter completado o de azul afirmaria
                aptidao a uma prova cuja lista ninguem tem. O aviso logo abaixo
                diz exatamente isso; o selo nao pode contradize-lo.
              */}
              {folha.aptidao === 'apto' && origemDoCurriculo === 'prova' && (
                <span className="selo-apto" title={`Todas as ${folha.total} competências do ${nomeDaMeta(meta)} estão atestadas`}>
                  apto ao {nomeDaMeta(meta).toLowerCase()}
                </span>
              )}
            </h3>
            <p className="apoio" style={{ margin: '4px 0 0' }}>
              <strong style={{ color: corDaFaixa(faixaDaPontuacao(folha.progresso)) }}>
                {folha.atestados} de {folha.total}
              </strong>{' '}
              competências atestadas · {porcento(folha.progresso)}
            </p>
          </div>

          <div className="medidor" style={{ width: 160, marginTop: 8 }}>
            <i
              style={{
                width: `${Math.round(folha.progresso * 100)}%`,
                background: corDaFaixa(faixaDaPontuacao(folha.progresso)),
              }}
            />
          </div>
        </div>

        {/*
          A FOLHA DIZ QUANDO NAO ESTA FECHANDO GRAU NENHUM.
          Sem esta linha, marcar 81 itens de azul pareceria completar o 4o grau —
          e a barra encheria confirmando a leitura errada. O aviso troca a
          promessa: aqui voce registra o que VIU, e o grau fica para quando a
          lista dele chegar.
        */}
        {origemDoCurriculo === 'estudo' && (
          <p className="aviso" style={{ marginTop: 12, marginBottom: 0 }}>
            A lista de itens do <strong>{nomeDaMeta(meta)}</strong> ainda não chegou. Esta
            folha mostra o currículo que ele <strong>treina</strong> ({nomeDaMeta(idDoCurriculo)}):
            atestar aqui registra o que você viu no tatame, e <strong>não</strong> fecha o{' '}
            {nomeDaMeta(meta)}.
          </p>
        )}

        {/*
          AS AULAS SAO REQUISITO SEPARADO, E O NUMERO E DA TURMA.

          DOIS NUMEROS, E CADA UM DIZ DE QUEM E. "a turma já deu" e o que o app
          calcula do programa; ao lado, quando divergem, as aulas DO ALUNO que o
          professor registrou no cadastro. Divergem exatamente no caso que criou
          o campo: "o Henrique ja tem 12 aulas mas ficou varios meses parado" — a
          RGI seguiu dando aula sem ele.

          Chamar qualquer um dos dois de "cumpridas" faria a folha afirmar
          presenca, que o app nao tem.

          E o numero nao condiciona o selo "apto": "pode acontecer de um aluno se
          destacar e conseguir estar apto ao grau antes do tempo" (palavras dele).
          Ele esta aqui como CONTEXTO — 29 de 29 atestadas com 3 aulas dadas
          merece um segundo olhar, e sem esta linha a folha nao daria o sinal.
        */}
        {folha.aulas.exigidas !== null && (
          <p className="apoio" style={{ marginTop: 12, marginBottom: 0 }}>
            Aulas exigidas pelo {nomeDaMeta(meta)}: <strong>{folha.aulas.exigidas}</strong> ·{' '}
            {folha.aulas.cumpridas === null ? (
              <>
                a turma já deu: <strong>—</strong> (não consegui ler o programa da turma;
                confira você)
              </>
            ) : (
              <>
                a <strong>{nomeDaTurma(turma)}</strong> já deu{' '}
                <strong>{folha.aulas.cumpridas}</strong>
                {faltamAulas !== null && faltamAulas > 0
                  ? ` · faltam ${faltamAulas} à turma`
                  : ' · a turma fechou as aulas'}
                {aulasDoGrau !== folha.aulas.cumpridas && (
                  <>
                    {' '}
                    · <strong>ele fez {aulasDoGrau}</strong>
                  </>
                )}
                .
              </>
            )}
          </p>
        )}

        {mensagem && (
          <p className={fase === 'erro' ? 'aviso' : 'apoio'} style={{ marginTop: 12, marginBottom: 0 }}>
            {mensagem}
          </p>
        )}

        {jaConcedida && (
          <p className="apoio" style={{ marginTop: 12, marginBottom: 0 }}>
            ✓ {nomeDaMeta(meta)} já concedido
            {graduacoes
              .filter((g) => g.meta === meta)
              .map((g) => ` em ${dataCurta(g.concedidaEm)}`)
              .join('')}
            .
          </p>
        )}
      </section>

      {folha.aptidao === 'apto' && !jaConcedida && (
        <Conceder
          folha={folha}
          meta={meta}
          aulasDoGrau={aulasDoGrau}
          gravando={gravando}
          aoConceder={aoConceder}
        />
      )}

      {folha.grupos.map((g) => {
        /**
         * OS ITENS DO GRUPO QUE FALTAM — o que "atestar a area inteira" grava.
         *
         * SO OS NAO ATESTADOS entram. Incluir os ja atestados gravaria registro
         * repetido num log append-only: poluicao PERMANENTE, e a folha passaria a
         * mostrar "3 registros" em itens onde nada aconteceu duas vezes.
         */
        const faltando = g.linhas.filter((l) => !l.competente)
        return (
        <section className="cartao" key={g.moduloId}>
          <h3>
            {g.nome}
            <span className="contagem-linhas">
              {g.atestados} de {g.total}
            </span>
            {faltando.length > 0 && (
              <button
                className="botao botao--pequeno atestado-grupo"
                disabled={gravando}
                onClick={() => {
                  // Um por um, e nao um lote: `aoAtestar` da folha grava UM
                  // registro. Trocar para lote aqui exigiria mudar a interface
                  // do hook e a da matriz junto — e com 10 itens no maior grupo
                  // do 1o grau, dez gravacoes seguidas sao instantaneas.
                  for (const l of faltando) {
                    aoAtestar({
                      itemId: l.item.id,
                      competente: true,
                      texto: procedencia,
                      origem: 'aula_regular',
                    })
                  }
                }}
                title={`Atesta os ${faltando.length} itens de ${g.nome} que faltam, gravando "${procedencia}"`}
              >
                atestar os {faltando.length} que faltam
              </button>
            )}
          </h3>
          <ul className="lista-atestado">
            {g.linhas.map((l) => (
              <Linha
                key={l.item.id}
                linha={l}
                gravando={gravando}
                procedencia={procedencia}
                aoAtestar={aoAtestar}
              />
            ))}
          </ul>
        </section>
        )
      })}
    </>
  )
}
