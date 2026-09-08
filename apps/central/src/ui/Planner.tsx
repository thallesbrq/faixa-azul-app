/**
 * O PLANNER DA TURMA — as 80 aulas, diagramado para tela grande.
 *
 * E A MESMA IDEIA DO `Montar` do app do aluno, e NAO o mesmo componente. O que
 * muda nao e estilo:
 *
 *   - lá sao 10 aulas de UM aluno; aqui sao 81 caixas de uma TURMA
 *   - lá o bolsao ENCOLHE (cada item tem um lugar so); aqui ele e um CATALOGO,
 *     porque repetir e o metodo (ver `application/programa`)
 *   - lá o alvo e "tudo encaixado"; aqui e "as 25 primeiras sugeridas e o resto
 *     no criterio do professor"
 *
 * Compartilhar o componente exigiria parametrizar as tres coisas, e a terceira
 * muda o que a tela CONSIDERA PRONTO — que e a definicao da tela.
 *
 * O LAYOUT: bolsao fixo a esquerda, aulas rolando a direita. Uma aula fica
 * SELECIONADA, e clicar no bolsao poe naquela aula. Foi a unica forma que
 * funciona sem arrastar: montar 25 aulas com arrasto num trackpad e pior do que
 * dois cliques, e arrasto acessivel por teclado exige um vocabulario inteiro.
 */

import { useMemo, useState } from 'react'
import {
  AULAS_DO_1GRAU,
  AULAS_PRE_PREENCHIDAS,
  AULA_EXPERIMENTAL,
  POSICOES_DO_ROTULO,
  ROTULO_DO_BLOCO,
  TIPOS_DO_ROTULO,
  ULTIMA_AULA,
  descreverRotulo,
  tipoPrecisaPosicao,
} from '@faixa-azul/core/application/programa'
import type { AulaNoPlanner, BlocoDoPrograma, EstadoDoPlanner, RotuloDaAula } from '@faixa-azul/core/application/programa'
import { ROTULO_BLOCO } from '@faixa-azul/core/domain/taxonomia'
import { nomeDaTurma } from '@faixa-azul/core/domain/turmas'
import type { TechniqueItem } from '@faixa-azul/core/domain/types'

const FILTROS: { id: BlocoDoPrograma | 'todas'; rotulo: string; ajuda: string }[] = [
  { id: 'todas', rotulo: 'Todas', ajuda: 'As 80 aulas mais a experimental' },
  { id: 'experimental', rotulo: 'Experimental', ajuda: 'Aula 00 — defesa pessoal, presencial' },
  { id: '1grau', rotulo: '1º grau', ajuda: 'Aulas 1 a 35 — as 25 primeiras vêm sugeridas' },
  { id: 'seguintes', rotulo: '2º ao 4º', ajuda: 'Aulas 36 a 80 — livres, currículo de azul' },
]

export function Planner({
  planner,
  turma,
  gravando,
  mensagem,
  aoVoltar,
  aoAplicarSugestao,
  aoPorItem,
  aoTirarItem,
  aoAcrescentarRotulo,
  aoRemoverRotulo,
  aoMudarFoco,
}: {
  planner: EstadoDoPlanner
  turma: string
  gravando: boolean
  mensagem: string | null
  aoVoltar: () => void
  aoAplicarSugestao: () => void
  aoPorItem: (numero: number, itemId: string) => void
  aoTirarItem: (numero: number, itemId: string) => void
  aoAcrescentarRotulo: (numero: number, r: RotuloDaAula) => void
  aoRemoverRotulo: (numero: number, id: string) => void
  aoMudarFoco: (numero: number, foco: string) => void
}) {
  const [filtro, setFiltro] = useState<BlocoDoPrograma | 'todas'>('1grau')
  /**
   * A aula selecionada comeca na 1, e nao na 0.
   *
   * A experimental e presencial e nao tem programacao de curriculo — abrir o
   * planner nela poria o professor a montar a aula que ele nao monta.
   */
  const [selecionada, setSelecionada] = useState(1)
  const [buscaNoBolsao, setBuscaNoBolsao] = useState('')

  const aulas = useMemo(
    () => (filtro === 'todas' ? planner.aulas : planner.aulas.filter((a) => a.bloco === filtro)),
    [planner.aulas, filtro],
  )

  const aula = planner.aulas.find((a) => a.numero === selecionada) ?? null

  const bolsaoFiltrado = useMemo(() => {
    const t = buscaNoBolsao.trim().toLowerCase()
    if (t === '') return planner.bolsao
    return planner.bolsao
      .map((g) => ({
        ...g,
        itens: g.itens.filter(
          (i) =>
            i.nome.toLowerCase().includes(t) ||
            i.slot.toLowerCase().includes(t) ||
            i.posicao.toLowerCase().includes(t),
        ),
      }))
      .filter((g) => g.itens.length > 0)
  }, [planner.bolsao, buscaNoBolsao])

  const do1Grau = planner.aulas.filter((a) => a.bloco === '1grau')
  const montadasNo1Grau = do1Grau.filter((a) => a.itens.length > 0 || a.rotulos.length > 0).length

  return (
    <main className="planner">
      <div className="planner-topo">
        <button className="botao botao--claro botao--pequeno" onClick={aoVoltar}>
          ← Turmas
        </button>
        <h1>
          Programa da {nomeDaTurma(turma)}
          <span className="planner-contagem">
            {planner.aulasComConteudo} de {ULTIMA_AULA + 1} aulas com conteúdo
          </span>
        </h1>
        <div className="planner-acoes">
          {/* O BOTAO DIZ O QUE VAI FAZER, com o numero: "aplicar sugestao" sem
              dizer onde faria o professor clicar sem saber o que muda. */}
          <button
            className="botao botao--principal botao--pequeno"
            onClick={aoAplicarSugestao}
            disabled={gravando}
            title={`Preenche as aulas 1 a ${AULAS_PRE_PREENCHIDAS} com os 29 itens do 1º grau. Não sobrescreve aula que já tem conteúdo.`}
          >
            {gravando ? 'Gravando…' : `Sugerir aulas 1–${AULAS_PRE_PREENCHIDAS}`}
          </button>
        </div>
      </div>

      {mensagem && <p className="aviso">{mensagem}</p>}

      <div className="planner-filtros" role="tablist" aria-label="Blocos do programa">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filtro === f.id}
            className={filtro === f.id ? 'aba-turma aba-turma--ativa' : 'aba-turma'}
            onClick={() => setFiltro(f.id)}
            title={f.ajuda}
          >
            {f.rotulo}
          </button>
        ))}
        <span className="apoio-inline">
          1º grau: {montadasNo1Grau} de {AULAS_DO_1GRAU} montadas
        </span>
      </div>

      <div className="planner-corpo">
        {/* --------------------------------------------------------- bolsao */}
        <aside className="planner-bolsao">
          <h2>Currículo de azul</h2>
          <p className="apoio">
            {/* O CATALOGO NAO ENCOLHE, e a tela precisa dizer isso: um professor
                que conhece o `Montar` do app espera o item sair da lista quando
                usado, e aqui ele fica — porque vai voltar em outra aula. */}
            Clique num item para pôr na aula selecionada. Um item pode entrar em
            várias aulas — rever com intervalo fixa mais do que ver tudo de uma vez.
          </p>
          <input
            className="planner-busca"
            value={buscaNoBolsao}
            onChange={(e) => setBuscaNoBolsao(e.target.value)}
            placeholder="Buscar técnica ou posição…"
            aria-label="Buscar no currículo"
          />
          {bolsaoFiltrado.length === 0 && <p className="apoio">Nada encontrado.</p>}
          {bolsaoFiltrado.map((g) => (
            <section key={g.bloco} className="bolsao-grupo">
              <h3>
                {ROTULO_BLOCO[g.bloco]} <span>{g.itens.length}</span>
              </h3>
              <ul>
                {g.itens.map((i) => (
                  <li key={i.id}>
                    <button
                      className="chip-item"
                      onClick={() => aoPorItem(selecionada, i.id)}
                      disabled={aula === null || selecionada === AULA_EXPERIMENTAL}
                      title={`${i.posicao} · ${i.slot}${i.nome ? ` — ${i.nome}` : ''}`}
                    >
                      {i.nome || i.slot}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* O QUE FICOU FORA DO PROGRAMA e a informacao mais util desta tela
              para quem esta fechando um grau: e a lista do que o aluno nunca vai
              ter visto. Uma contagem sem nomes seria um numero sem endereco. */}
          {planner.itensForaDoPrograma.length > 0 && (
            <section className="bolsao-grupo bolsao-grupo--fora">
              <h3>
                Fora do programa <span>{planner.itensForaDoPrograma.length}</span>
              </h3>
              <p className="apoio">Não aparecem em nenhuma aula das 80.</p>
            </section>
          )}
        </aside>

        {/* ---------------------------------------------------------- aulas */}
        <div className="planner-aulas">
          {aulas.map((a) => (
            <Aula
              key={a.numero}
              aula={a}
              selecionada={a.numero === selecionada}
              aoSelecionar={() => setSelecionada(a.numero)}
              aoTirarItem={(itemId) => aoTirarItem(a.numero, itemId)}
              aoAcrescentarRotulo={(r) => aoAcrescentarRotulo(a.numero, r)}
              aoRemoverRotulo={(id) => aoRemoverRotulo(a.numero, id)}
              aoMudarFoco={(foco) => aoMudarFoco(a.numero, foco)}
            />
          ))}
        </div>
      </div>
    </main>
  )
}

function Aula({
  aula,
  selecionada,
  aoSelecionar,
  aoTirarItem,
  aoAcrescentarRotulo,
  aoRemoverRotulo,
  aoMudarFoco,
}: {
  aula: AulaNoPlanner
  selecionada: boolean
  aoSelecionar: () => void
  aoTirarItem: (itemId: string) => void
  aoAcrescentarRotulo: (r: RotuloDaAula) => void
  aoRemoverRotulo: (id: string) => void
  aoMudarFoco: (foco: string) => void
}) {
  const [abrindoRotulo, setAbrindoRotulo] = useState(false)
  const experimental = aula.bloco === 'experimental'

  return (
    <section
      className={[
        'aula-cartao',
        selecionada ? 'aula-cartao--ativa' : '',
        experimental ? 'aula-cartao--experimental' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={aoSelecionar}
    >
      <header>
        <h3>
          {experimental ? 'Aula 00' : `Aula ${aula.numero}`}
          {selecionada && <span className="aula-marca">selecionada</span>}
        </h3>
        <span className="aula-bloco">{ROTULO_DO_BLOCO[aula.bloco]}</span>
      </header>

      {experimental ? (
        /* A EXPERIMENTAL NAO E MONTAVEL, e a tela diz por que em vez de so
           desabilitar: o conteudo dela e defesa pessoal, dada presencialmente, e
           o app nao ensina defesa contra golpe por texto (ADR-012). */
        <p className="apoio">
          Defesa pessoal, presencial. Não é programada aqui — o app não ensina esse
          conteúdo por texto, e ela vem antes da aula 1.
        </p>
      ) : (
        <>
          <input
            className="aula-foco"
            value={aula.foco}
            onChange={(e) => aoMudarFoco(e.target.value)}
            placeholder="Foco da aula (opcional)"
            aria-label={`Foco da aula ${aula.numero}`}
            onClick={(e) => e.stopPropagation()}
          />

          {aula.itens.length === 0 && aula.rotulos.length === 0 && (
            <p className="apoio">Vazia. Clique num item do currículo à esquerda.</p>
          )}

          <ul className="aula-itens">
            {aula.itens.map((i) => (
              <li key={i.id}>
                <button
                  className="chip-item chip-item--posto"
                  onClick={(e) => {
                    e.stopPropagation()
                    aoTirarItem(i.id)
                  }}
                  title={`${i.posicao} · ${i.slot} — clique para tirar`}
                >
                  {i.nome || i.slot} <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
            {aula.rotulos.map((r) => (
              <li key={r.id}>
                <button
                  className="chip-item chip-item--rotulo"
                  onClick={(e) => {
                    e.stopPropagation()
                    aoRemoverRotulo(r.id)
                  }}
                  title="Anotação sua — clique para tirar"
                >
                  {descreverRotulo(r)} <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>

          {/* ID GUARDADO QUE NAO EXISTE MAIS: aparece como aviso em vez de
              desaparecer. Sumir faria a aula encolher em silencio depois de uma
              mudanca no seed, e o professor procuraria o que ele mesmo pos. */}
          {aula.desconhecidos.length > 0 && (
            <p className="aviso">
              {aula.desconhecidos.length}{' '}
              {aula.desconhecidos.length === 1 ? 'técnica' : 'técnicas'} desta aula não
              existe(m) mais no currículo: {aula.desconhecidos.join(', ')}
            </p>
          )}

          {abrindoRotulo ? (
            <FormularioDeRotulo
              aoCancelar={() => setAbrindoRotulo(false)}
              aoSalvar={(r) => {
                aoAcrescentarRotulo(r)
                setAbrindoRotulo(false)
              }}
            />
          ) : (
            <button
              className="botao botao--claro botao--pequeno aula-mais"
              onClick={(e) => {
                e.stopPropagation()
                setAbrindoRotulo(true)
              }}
              title="Acrescentar uma técnica que não está no currículo"
            >
              + técnica
            </button>
          )}
        </>
      )}
    </section>
  )
}

/**
 * O formulario do "+".
 *
 * TRES CAMPOS E NAO UM: posicao, tipo e nome. Um campo de texto livre so
 * produziria "gravata" — que nao diz de onde sai nem o que e, e em seis meses
 * ninguem sabe que aula era aquela. Com os tres, "Montada · Finalização ·
 * Gravata romana" se le sozinho.
 *
 * A POSICAO DESAPARECE para queda e avulsa, e nao fica desabilitada: uma queda
 * nao sai de posicao nenhuma, e um campo cinza ali sugeriria que falta preencher.
 */
function FormularioDeRotulo({
  aoSalvar,
  aoCancelar,
}: {
  aoSalvar: (r: RotuloDaAula) => void
  aoCancelar: () => void
}) {
  const [tipo, setTipo] = useState<string>(TIPOS_DO_ROTULO[0].id)
  const [posicao, setPosicao] = useState<string>(POSICOES_DO_ROTULO[0])
  const [nome, setNome] = useState('')
  const precisa = tipoPrecisaPosicao(tipo)

  return (
    <div className="rotulo-form" onClick={(e) => e.stopPropagation()}>
      <label className="campo">
        <span>Tipo</span>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS_DO_ROTULO.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </label>

      {precisa && (
        <label className="campo">
          <span>De onde</span>
          <select value={posicao} onChange={(e) => setPosicao(e.target.value)}>
            {POSICOES_DO_ROTULO.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="campo">
        <span>Nome da técnica</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Gravata romana"
          autoFocus
        />
      </label>

      <div className="rotulo-form-acoes">
        <button
          className="botao botao--principal botao--pequeno"
          disabled={nome.trim() === ''}
          onClick={() =>
            aoSalvar({
              // Id local: o documento e sobrescrito inteiro, entao basta ser
              // unico dentro da aula.
              id: `r-${Date.now()}`,
              posicao: precisa ? posicao : '',
              tipo,
              nome: nome.trim(),
            })
          }
        >
          Acrescentar
        </button>
        <button className="botao botao--claro botao--pequeno" onClick={aoCancelar}>
          Cancelar
        </button>
      </div>
      <p className="apoio">
        {/* O ESCOPO DO ROTULO, ESCRITO NA TELA. Sem isto o professor poderia
            supor que o que ele escreve entra no currículo e conta para o grau. */}
        Fica só nesta aula. Não entra no currículo e não conta para o 1º grau.
      </p>
    </div>
  )
}

export type { TechniqueItem }
