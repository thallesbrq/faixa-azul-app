/**
 * PROGRAMA DA TURMA no celular — a tela do professor substituto.
 *
 * POR QUE ELA EXISTE. O Prof. Joao pode faltar, e quem cobre precisa saber o que
 * dar. As regras ja permitiam isso desde o ADR-017 (decisao 3): o programa da
 * turma nao contem dado pessoal — e curriculo — e `programas/{turma}/aulas/{n}`
 * tem `allow read: if souAtivo()`, aberto a qualquer pessoa ativa da academia,
 * de qualquer turma. Faltava a TELA. A decisao estava tomada e construida pela
 * metade.
 *
 * ---------------------------------------------------------------------------
 * FILA E NAO GRADE SEMANAL, e a diferenca e o aparelho.
 *
 * No computador o professor esta MONTANDO: ele precisa ver a semana, os espacos
 * livres e o que ja esta ocupado — por isso a Central tem a Grade de Horario com
 * paginacao. No celular, na porta do tatame, a pergunta e outra e e uma so: "o
 * que eu dou hoje?". Uma paginacao semana a semana obrigaria o substituto a
 * navegar ate achar hoje, com cinco minutos e uma mao livre.
 *
 * Por isso aqui e uma FILA: de hoje para frente, hoje em destaque.
 * ---------------------------------------------------------------------------
 *
 * A TURMA E ESCOLHIVEL, e nao a do proprio cadastro. O caso que motivou a tela e
 * o Kainã cobrindo a RGI sem ser da RGI. Prender na turma do cadastro faria a
 * tela existir e nao servir para nada.
 */

import { useMemo, useState } from 'react'
import { proximasAulas } from '@faixa-azul/core/application/agenda'
import { DIAS_DA_SEMANA, rotuloDoDia } from '@faixa-azul/core/application/agenda'
import { aulaTemConteudo, montarPlanner, resumoDasAulas } from '@faixa-azul/core/application/programa'
import { horariosDaTurma, nomeDaTurma, TURMAS } from '@faixa-azul/core/domain/turmas'
import { CURRICULO_AZUL } from '@faixa-azul/core/seed/curriculos'
import { ITENS_1GRAU } from '@faixa-azul/core/seed/primeiro-grau'
import type { AulaDoPrograma } from '@faixa-azul/core/application/programa'
import { useProgramaDaTurma } from '../useProgramaDaTurma'

/** Constantes de MODULO: expressao inline aqui alimenta laco de dependencia. */
const ITENS_CONHECIDOS = [...CURRICULO_AZUL.itens, ...ITENS_1GRAU]

/**
 * Quantas aulas a fila mostra.
 *
 * OITO E DUAS SEMANAS E MEIA com a RGI (terca e quinta). O suficiente para o
 * substituto ver a de hoje e as proximas sem rolar a tela inteira; mais que isso
 * e planejamento, e planejamento e no computador.
 */
const QUANTAS = 8

export function Programa({
  logado,
  hoje,
  aulasDeTeste,
}: {
  logado: boolean
  hoje: Date
  /**
   * Aulas injetadas pela pagina de amostra, para conferir o layout em 375px sem
   * rede e sem login.
   *
   * SEAM DE VERIFICACAO E NAO ATALHO DE PRODUCAO: `App.tsx` nunca passa isto. A
   * tela so aparece para papel de professor, e a sessao vem de um link magico no
   * e-mail — sem este parametro a unica conferencia possivel seria "compila", e
   * o que quebra aqui e nome de tecnica longo em tela estreita.
   */
  aulasDeTeste?: readonly AulaDoPrograma[]
}) {
  const [turma, setTurma] = useState<string>(TURMAS[0].id)
  const daNuvem = useProgramaDaTurma({ logado: logado && !aulasDeTeste, turma })
  const estado = aulasDeTeste
    ? { fase: 'pronto' as const, aulas: aulasDeTeste, mensagem: null }
    : daNuvem.estado
  const recarregar = daNuvem.recarregar

  const horarios = useMemo(() => horariosDaTurma(turma), [turma])

  /**
   * O conteudo sai de `montarPlanner`, e nao das aulas cruas.
   *
   * As aulas guardadas tem `itemIds`; a tela precisa de NOMES. `montarPlanner` e
   * quem resolve id -> item, e ele conhece os 29 do 1o grau (que nao estao no
   * curriculo de azul) — sem ele, as 25 primeiras aulas apareceriam inteiras como
   * "tecnica que nao existe mais": dado certo exibido como erro.
   */
  const conteudo = useMemo(
    () =>
      resumoDasAulas(
        montarPlanner({
          turma,
          aulas: estado.aulas,
          itensDoBolsao: CURRICULO_AZUL.itens,
          itensConhecidos: ITENS_CONHECIDOS,
        }).aulas,
      ),
    [turma, estado.aulas],
  )

  const fila = useMemo(
    () => proximasAulas({ aulas: estado.aulas, hoje, quantas: QUANTAS, horarios }),
    [estado.aulas, hoje, horarios],
  )

  return (
    <div className="card">
      <div className="topo-secao">
        <h3 className="detalhe-secao" style={{ marginBottom: 0 }}>
          Programa da turma
        </h3>
        {logado && (
          <button
            className="link-desfazer"
            onClick={() => void recarregar()}
            disabled={estado.fase === 'carregando'}
          >
            {estado.fase === 'carregando' ? 'lendo…' : 'recarregar'}
          </button>
        )}
      </div>
      <p className="instrucao">
        O que está programado para cada aula. Serve para quem for dar a aula — inclusive
        quem estiver cobrindo.
      </p>

      {/* O SELETOR DE TURMA E O PONTO DA TELA: quem cobre a RGI pode nao ser da
          RGI. Prender na turma do cadastro faria a tela nao servir. */}
      <div className="programa-turmas" role="tablist" aria-label="Turmas">
        {TURMAS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={turma === t.id}
            className={turma === t.id ? 'botao botao--principal' : 'botao botao--secundario'}
            onClick={() => setTurma(t.id)}
          >
            {t.nome}
          </button>
        ))}
      </div>

      <p className="instrucao">
        {horarios.length === 0 ? (
          <>Esta turma não tem horário cadastrado.</>
        ) : (
          <>
            {nomeDaTurma(turma)} treina{' '}
            {horarios.map((h, i) => (
              <span key={`${h.diaDaSemana}-${h.inicio}`}>
                {i > 0 && ' e '}
                <strong>
                  {DIAS_DA_SEMANA[h.diaDaSemana]} {h.inicio}–{h.fim}
                </strong>
              </span>
            ))}
            .
          </>
        )}
      </p>

      {/* SEM CONTA A RESPOSTA CERTA E "entre", e nao um erro tecnico: as regras
          exigem cadastro para ler o programa, e tentar sem ele daria uma falha de
          permissao que a tela mostraria como defeito. */}
      {!logado && (
        <p className="instrucao">
          O programa vem da sua conta na academia. Entre em <strong>Perfil</strong> para
          vê-lo.
        </p>
      )}

      {logado && estado.fase === 'carregando' && (
        <p className="instrucao">Lendo o programa…</p>
      )}

      {logado && estado.fase === 'erro' && (
        <p className="aviso">
          <span aria-hidden="true">⚠️</span>
          <span>{estado.mensagem}</span>
        </p>
      )}

      {logado && estado.fase === 'pronto' && fila.length === 0 && (
        /* NENHUMA AULA AGENDADA NAO E ERRO, e a frase diz de quem e a acao: o
           programa existe no planner e ninguem deu data as aulas. Um substituto
           lendo "nada encontrado" concluiria que o app esta quebrado. */
        <p className="instrucao">
          Nenhuma aula da {nomeDaTurma(turma)} tem data marcada de hoje em diante. O
          programa é montado na Central, no computador.
        </p>
      )}

      <ul className="programa-fila">
        {fila.map((a) => {
          const r = conteudo.get(a.numero)
          const tem = aulaTemConteudo(r)
          return (
            <li key={a.slot} className={a.hoje ? 'programa-aula programa-aula--hoje' : 'programa-aula'}>
              <div className="programa-aula-topo">
                <span className="programa-aula-quando">
                  <strong>{DIAS_DA_SEMANA[a.diaDaSemana]}</strong> {rotuloDoDia(a.quando)}
                  {' · '}
                  {a.inicio}–{a.fim}
                </span>
                {a.hoje && <span className="programa-hoje">hoje</span>}
              </div>

              <div className="programa-aula-corpo">
                <span className="etiqueta">Aula {a.numero}</span>
                {r && r.foco.trim() !== '' && <p className="programa-foco">{r.foco}</p>}

                {tem ? (
                  <ul className="programa-tecnicas">
                    {r?.tecnicas.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                    {/* O rotulo pontual vem MARCADO: nao e item do curriculo, e
                        quem cobre precisa saber que aquilo foi acrescentado a
                        mao — nao esta em lista nenhuma para consultar. */}
                    {r?.rotulos.map((x) => (
                      <li key={x} className="programa-tecnica--rotulo">
                        {x}
                      </li>
                    ))}
                  </ul>
                ) : (
                  /* AULA COM DATA E SEM CONTEUDO E UM AVISO. Se o professor
                     faltar nesse dia, quem cobre chega e nao ha o que dar —
                     dizer isso antes e o unico jeito de dar tempo. */
                  <p className="programa-sem-conteudo">
                    Sem técnica programada. Fale com o professor antes da aula.
                  </p>
                )}

                {r && r.desconhecidos.length > 0 && (
                  <p className="programa-sem-conteudo">
                    {r.desconhecidos.length}{' '}
                    {r.desconhecidos.length === 1 ? 'técnica' : 'técnicas'} desta aula não
                    existe(m) mais no currículo.
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
