/**
 * A GRADE DE HORARIO — a semana da turma, com as aulas designadas.
 *
 * UM COMPONENTE PARA DOIS LUGARES, e nao dois parecidos:
 *
 *   - na PAGINA DA TURMA, abaixo da rosca de progresso: ver a semana e designar
 *     a proxima aula sem data
 *   - dentro de uma MODAL no card da aula do planner: designar AQUELA aula
 *
 * O que muda entre os dois e uma coisa so — se a aula alvo e conhecida — e ela
 * entra como `aulaEmFoco`. Fazer dois componentes faria a semana da turma e a da
 * modal divergirem no primeiro ajuste de layout, e o professor veria duas grades
 * diferentes da mesma turma no mesmo dia.
 *
 * SO OS SLOTS DA TURMA APARECEM, e nao os sete dias. Uma grade com segunda,
 * quarta e sexta vazias para uma turma de terca e quinta gasta cinco setimos da
 * largura dizendo "nao ha aula" — e o professor ja sabe.
 *
 * O CONTEUDO APARECE NO SLOT, e nao so o numero da aula. O pedido foi literal:
 * "e importante que o calendario da turma que contem o conteudo dos treinos seja
 * visualizado, pois a ideia e caso o professor Joao nao for na aula um professor
 * substituto pode ver".
 *
 * Para quem MONTOU a aula, `Aula 6` basta — ele lembra o que pos ali. Para um
 * SUBSTITUTO, o numero e a mesma informacao que uma caixa vazia: ele chega na
 * terca as 8h e precisa saber que tecnicas dar.
 */

import type { SlotDaSemana } from '@faixa-azul/core/application/agenda'
import { DIAS_DA_SEMANA, rotuloDoDia } from '@faixa-azul/core/application/agenda'
import type { ResumoDaAula } from '@faixa-azul/core/application/programa'
import { aulaTemConteudo } from '@faixa-azul/core/application/programa'
import { nomeDaTurma } from '@faixa-azul/core/domain/turmas'

export function GradeDeHorario({
  turma,
  slots,
  conteudo,
  rotulo,
  podeVoltar,
  podeAvancar,
  aoVoltar,
  aoAvancar,
  aoIrParaHoje,
  aulaEmFoco = null,
  proximaSemData = null,
  gravando,
  aoDesignar,
  aoDesagendar,
}: {
  turma: string
  slots: readonly SlotDaSemana[]
  /**
   * O conteudo de cada aula, por numero. Vem de `resumoDasAulas`.
   *
   * MAPA E NAO CAMPO NO SLOT: o slot e sobre TEMPO (quando, ocupado, passado) e o
   * conteudo e sobre CURRICULO. Juntar os dois faria `slotsDaSemana` — que hoje e
   * puro e testado contra fuso — precisar do curriculo inteiro para responder que
   * horas e a aula.
   */
  conteudo: ReadonlyMap<number, ResumoDaAula>
  rotulo: string
  podeVoltar: boolean
  podeAvancar: boolean
  aoVoltar: () => void
  aoAvancar: () => void
  aoIrParaHoje: () => void
  /**
   * A aula que o clique vai designar, quando ela e conhecida (modal do card).
   *
   * `null` na pagina da turma: ali o clique designa `proximaSemData`.
   */
  aulaEmFoco?: number | null
  /** A proxima aula sem data — o que um clique designa quando nao ha foco. */
  proximaSemData?: number | null
  gravando: boolean
  aoDesignar: (slotId: string) => void
  aoDesagendar: (numeroDaAula: number) => void
}) {
  const comFoco = aulaEmFoco !== null

  return (
    <section className="cartao grade">
      <div className="grade-topo">
        <div>
          <h2>Grade de Horário · {nomeDaTurma(turma)}</h2>
          <p className="apoio" style={{ margin: '2px 0 0' }}>
            {comFoco ? (
              <>
                Clique num horário para designar a <strong>aula {aulaEmFoco}</strong>.
              </>
            ) : proximaSemData !== null ? (
              <>
                Clique num horário livre para designar a{' '}
                <strong>aula {proximaSemData}</strong> — a próxima sem data.
              </>
            ) : (
              <>Todas as 80 aulas já têm data.</>
            )}
          </p>
        </div>

        <div className="grade-navegacao">
          <button
            className="botao botao--claro botao--pequeno"
            onClick={aoVoltar}
            disabled={!podeVoltar}
            aria-label="Semana anterior"
          >
            ←
          </button>
          <span className="grade-semana">{rotulo}</span>
          <button
            className="botao botao--claro botao--pequeno"
            onClick={aoAvancar}
            disabled={!podeAvancar}
            aria-label="Semana seguinte"
          >
            →
          </button>
          <button className="botao botao--claro botao--pequeno" onClick={aoIrParaHoje}>
            Hoje
          </button>
        </div>
      </div>

      {slots.length === 0 ? (
        /* SEM HORARIO NAO E SEMANA VAZIA. A turma pode nao ter horario
           cadastrado, e a tela diz isso em vez de mostrar um espaco em branco
           que se le como defeito. */
        <p className="apoio" style={{ marginBottom: 0 }}>
          A turma <strong>{nomeDaTurma(turma)}</strong> não tem horário cadastrado — sem
          horário não há onde designar aula.
        </p>
      ) : (
        <ul className="grade-slots">
          {slots.map((s) => {
            const ocupado = s.aula !== null
            const eOFoco = comFoco && s.aula === aulaEmFoco
            /**
             * O QUE UM CLIQUE FAZ, e os dois lugares diferem de proposito:
             *
             * - COM FOCO (modal do card): clicar TROCA, mesmo ocupado. Você
             *   escolheu a aula e o horário; desalojar quem estava lá é a
             *   intenção, e a mensagem diz qual saiu.
             * - SEM FOCO (página da turma): slot ocupado NÃO é alvo. Ali o
             *   clique designaria "a próxima sem data", e um clique errado
             *   sobrescreveria uma aula que você montou — destrutivo por
             *   descuido, não por escolha. Para trocar, use `Tirar`.
             */
            const podeDesignar = comFoco ? true : !ocupado && proximaSemData !== null

            const resumo = s.aula === null ? undefined : conteudo.get(s.aula)
            const temConteudo = aulaTemConteudo(resumo)

            return (
              <li
                key={s.id}
                className={[
                  'grade-slot',
                  ocupado ? 'grade-slot--ocupado' : '',
                  eOFoco ? 'grade-slot--foco' : '',
                  s.passado ? 'grade-slot--passado' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="grade-slot-linha">
                <div className="grade-slot-quando">
                  <strong>{DIAS_DA_SEMANA[s.diaDaSemana]}</strong> {rotuloDoDia(s.quando)}
                  <span className="grade-slot-hora">
                    {s.inicio}–{s.fim}
                  </span>
                  {/* O QUE JA PASSOU FICA VISIVEL E NAO SOME: a aula dada e o
                      que vai contar para o 1o grau, e esconder a semana passada
                      esconderia justamente o que aconteceu. */}
                  {s.passado && <span className="grade-slot-passado">já passou</span>}
                </div>

                {ocupado ? (
                  <div className="grade-slot-aula">
                    <span className="etiqueta">Aula {s.aula}</span>
                    <button
                      className="botao botao--claro botao--pequeno"
                      onClick={() => aoDesagendar(s.aula as number)}
                      disabled={gravando}
                      title="Tira a data desta aula e devolve ela para a fila"
                    >
                      Tirar
                    </button>
                    {comFoco && !eOFoco && (
                      <button
                        className="botao botao--principal botao--pequeno"
                        onClick={() => aoDesignar(s.id)}
                        disabled={gravando}
                        title={`Põe a aula ${aulaEmFoco} aqui e devolve a aula ${s.aula} para a fila`}
                      >
                        Trocar
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    className="botao botao--principal botao--pequeno"
                    onClick={() => aoDesignar(s.id)}
                    disabled={gravando || !podeDesignar}
                    title={
                      comFoco
                        ? `Designa a aula ${aulaEmFoco} para este horário`
                        : proximaSemData !== null
                          ? `Designa a aula ${proximaSemData} para este horário`
                          : 'Todas as aulas já têm data'
                    }
                  >
                    {comFoco
                      ? `Designar aula ${aulaEmFoco}`
                      : proximaSemData !== null
                        ? `Designar aula ${proximaSemData}`
                        : 'Livre'}
                  </button>
                )}
                </div>

                {/*
                  O CONTEUDO DO TREINO — a razao de ser desta parte da tela.
                  Sem ele, um substituto le "Aula 6" e nao sabe o que dar.
                */}
                {ocupado && (
                  <div className="grade-slot-conteudo">
                    {resumo?.foco.trim() !== '' && resumo?.foco !== undefined && (
                      <p className="grade-slot-foco">{resumo.foco}</p>
                    )}

                    {temConteudo ? (
                      <ul className="grade-slot-tecnicas">
                        {resumo?.tecnicas.map((t) => (
                          <li key={t}>
                            <span className="chip-item chip-item--posto">{t}</span>
                          </li>
                        ))}
                        {/* O rotulo pontual aparece com a MESMA marca tracejada
                            do planner: ele nao e item do curriculo, e o
                            substituto precisa saber que aquilo foi acrescentado
                            a mao — nao esta em lista nenhuma para ele consultar. */}
                        {resumo?.rotulos.map((r) => (
                          <li key={r}>
                            <span className="chip-item chip-item--rotulo">{r}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      /* AULA AGENDADA E VAZIA E UM AVISO, e nao um espaco em
                         branco: se o Prof. Joao faltar nesta terca, o substituto
                         chega e nao ha o que dar. Dizer isso ANTES do dia e o
                         unico jeito de dar tempo de montar. */
                      <p className="grade-slot-sem-conteudo">
                        A aula {s.aula} não tem técnica programada — um substituto não
                        teria o que dar.
                      </p>
                    )}

                    {resumo && resumo.desconhecidos.length > 0 && (
                      <p className="grade-slot-sem-conteudo">
                        {resumo.desconhecidos.length}{' '}
                        {resumo.desconhecidos.length === 1 ? 'técnica' : 'técnicas'} desta aula
                        não existe(m) mais no currículo.
                      </p>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
