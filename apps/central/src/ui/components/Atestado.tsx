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
  aoAtestar,
}: {
  linha: LinhaDoAtestado
  gravando: boolean
  aoAtestar: (e: { itemId: string; competente: boolean; texto: string; origem: OrigemDaCompetencia }) => void
}) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const [origem, setOrigem] = useState<OrigemDaCompetencia>('aula_regular')
  const retirando = linha.competente

  return (
    <li className={linha.competente ? 'linha-atestado linha-atestado--ok' : 'linha-atestado'}>
      <div className="atestado-topo">
        <span className="atestado-nome">
          {linha.item.nome.trim() === '' ? linha.item.slot : linha.item.nome}
          {/* Item atestado e retirado mais de uma vez merece um olhar: pode ser
              hesitacao real, e o historico esta ali para isso. */}
          {linha.vezes > 1 && <span className="atestado-vezes">{linha.vezes} registros</span>}
        </span>

        <button
          className={linha.competente ? 'botao-texto' : 'botao botao--pequeno'}
          onClick={() => setAberto((a) => !a)}
          disabled={gravando}
        >
          {aberto ? 'cancelar' : linha.competente ? 'retirar' : 'atestar'}
        </button>
      </div>

      {linha.ultimo && !aberto && (
        <div className="atestado-quando">
          {linha.competente ? 'atestado' : 'retirado'} em {dataCurta(linha.ultimo.registradaEm)} ·{' '}
          {ROTULO_ORIGEM[linha.ultimo.origem]} — “{linha.ultimo.texto}”
        </div>
      )}

      {aberto && (
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

            <button
              className="botao botao--pequeno"
              disabled={texto.trim() === '' || gravando}
              onClick={() => {
                aoAtestar({
                  itemId: linha.item.id,
                  competente: !retirando,
                  texto: texto.trim(),
                  origem,
                })
                setTexto('')
                setAberto(false)
              }}
            >
              {retirando ? 'Retirar' : 'Atestar'}
            </button>
          </div>
          {/* O botao fica desabilitado sem texto, e a tela diz POR QUE — senao
              parece defeito. */}
          {texto.trim() === '' && (
            <p className="apoio" style={{ margin: '6px 0 0', fontSize: '0.72rem' }}>
              O texto é obrigatório: é ele que faz a folha valer como evidência.
            </p>
          )}
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
  aulasCumpridas,
  fase,
  mensagem,
  aoAtestar,
  aoConceder,
}: AtestadoProps) {
  if (fase === 'carregando') return <p className="apoio">Lendo as competências…</p>

  const folha = montarAtestado({ curriculo, modulos, registros, meta, aulasCumpridas })
  const gravando = fase === 'gravando'
  const faltamAulas = aulasFaltando(folha.aulas)
  const jaConcedida = graduacoes.some((g) => g.meta === meta)

  return (
    <>
      <section className="cartao">
        <div className="topo-grade">
          <div>
            <h3 style={{ margin: 0 }}>{nomeDaMeta(meta)}</h3>
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

      {folha.grupos.map((g) => (
        <section className="cartao" key={g.moduloId}>
          <h3>
            {g.nome}
            <span className="contagem-linhas">
              {g.atestados} de {g.total}
            </span>
          </h3>
          <ul className="lista-atestado">
            {g.linhas.map((l) => (
              <Linha key={l.item.id} linha={l} gravando={gravando} aoAtestar={aoAtestar} />
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
