/**
 * A folha de atestacao — o formato que o professor mandou.
 *
 * AS SEIS SECOES SAO AS DELE, na ordem dele: Quedas, Guarda fechada, Educativos,
 * Posicao individual, Finalizacoes, Saidas. Vem dos modulos do curriculo, que
 * foram escritos com as palavras dele. Reagrupar aqui criaria uma segunda
 * linguagem que ninguem na academia fala.
 *
 * ATESTAR PEDE O TEXTO, sempre. Nao e formalidade: `criarCompetencia` e as
 * regras do Firestore recusam registro sem justificativa, porque "atestei" sem
 * dizer o que viu nao ajuda ninguem seis meses depois — e e isso que transforma
 * a folha em evidencia em vez de um punhado de caixinhas marcadas.
 *
 * DOIS REQUISITOS, MOSTRADOS SEPARADOS. As 29 competencias o sistema conta; as
 * 35 aulas nao — ainda. Fundir os dois num unico "apto" faria a tela afirmar
 * algo que ela nao sabe. Enquanto a contagem nao existir, o numero de aulas e
 * pedido ao professor NO ATO de conceder, e o registro guarda que veio dele.
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
  gravando,
  aoConceder,
}: {
  folha: FolhaDeAtestado
  meta: string
  gravando: boolean
  aoConceder: (e: { meta: string; texto: string; aulasConfirmadas: number | null }) => void
}) {
  const [texto, setTexto] = useState('')
  const [aulas, setAulas] = useState('')
  const exigidas = folha.aulas.exigidas
  const numeroDeAulas = aulas.trim() === '' ? null : Number(aulas)
  const aulasValidas =
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
            Falta confirmar as <strong>{exigidas} aulas</strong> — o app ainda não conta
            presença, então esse número vem de você e fica registrado como tal.
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
            onChange={(e) => setAulas(e.target.value)}
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

      <button
        className="botao"
        disabled={texto.trim() === '' || !aulasValidas || gravando}
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
      {exigidas !== null && !aulasValidas && aulas.trim() !== '' && (
        <p className="aviso" style={{ marginTop: 10, marginBottom: 0 }}>
          A regra pede ao menos {exigidas} aulas.
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
  aulasCumpridas: number | null
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
  aulasCumpridas,
  fase,
  mensagem,
  aoAtestar,
  aoConceder,
}: AtestadoProps) {
  if (fase === 'carregando') return <p className="apoio">Lendo as competências…</p>

  const folha = montarAtestado({ curriculo, modulos, registros, meta, aulasCumpridas })
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

        {/* AS AULAS SAO REQUISITO SEPARADO, e a tela nao finge saber. `—` aqui
            significa "o app nao conta isso ainda" — nao zero. */}
        {folha.aulas.exigidas !== null && (
          <p className="apoio" style={{ marginTop: 12, marginBottom: 0 }}>
            Aulas exigidas: <strong>{folha.aulas.exigidas}</strong> ·{' '}
            {faltamAulas === null ? (
              <>
                cumpridas: <strong>—</strong> (o app ainda não conta presença; confira você)
              </>
            ) : (
              <>
                cumpridas: <strong>{folha.aulas.cumpridas}</strong>
                {faltamAulas > 0 ? ` · faltam ${faltamAulas}` : ' · requisito fechado'}
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

      {folha.competenciasCompletas && !jaConcedida && (
        <Conceder folha={folha} meta={meta} gravando={gravando} aoConceder={aoConceder} />
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
