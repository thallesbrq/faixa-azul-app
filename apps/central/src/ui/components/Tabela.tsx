/**
 * A tabela de alunos — onde a referencia tinha funcionalidades.
 *
 * AS COLUNAS VEM DO CURRICULO ATIVO (`gruposComItens`), e nao de uma constante.
 * Hoje o seed ativa Secoes 4 e 5, o que da quatro grupos com itens; Quedas,
 * Fundamentos e Defesa Pessoal estao desativados e nao viram coluna. No dia em
 * que forem ativados, as colunas aparecem sozinhas — sem editar este arquivo.
 *
 * PERCENTUAL COLORIDO E NAO BOLINHA (ADR-015, decisao 3). A bolinha da
 * referencia representava tres verdades discretas; a nossa pontuacao e continua,
 * e com sete colunas perder a gradacao apagaria a diferenca entre "comecou" e
 * "quase la" — justamente o que o professor procura para escolher a pauta.
 *
 * `—` E NAO `0%` onde nao ha dado, e a coluna Situacao diz qual dos dois motivos
 * e. Sem essa distincao, um aluno que nunca entrou fica identico a um que entrou
 * e nao estudou, e o primeiro precisa de um convite enquanto o segundo precisa
 * de uma conversa.
 */

import type { GrupoTecnico } from '@faixa-azul/core/domain/taxonomia'
import { ROTULO_GRUPO } from '@faixa-azul/core/domain/taxonomia'
import { nomeDaTurma } from '@faixa-azul/core/domain/turmas'
import type { LinhaDaCentral } from '@faixa-azul/core/application/central'
import { atividade, corDaFaixa, numero, porcento } from '../formato'
import { faixaDaPontuacao } from '@faixa-azul/core/application/progresso'

const ROTULO_SITUACAO = {
  'nunca-estudou': 'nunca estudou',
  parado: 'parado',
  'em-dia': 'em dia',
} as const

/** Uma celula de grupo: percentual colorido, ou tracinho com o motivo no title. */
function Celula({ valor, motivo }: { valor: number | undefined; motivo: string | null }) {
  if (typeof valor !== 'number') {
    return (
      <td className="num" title={motivo ?? undefined}>
        <span className="vazio">—</span>
      </td>
    )
  }
  return (
    <td className="num" style={{ color: corDaFaixa(faixaDaPontuacao(valor)) }}>
      {porcento(valor)}
    </td>
  )
}

export function Tabela({
  linhas,
  grupos,
  mostrarTurma,
  aoEscolher,
}: {
  linhas: LinhaDaCentral[]
  grupos: readonly GrupoTecnico[]
  /** So na visao "Todas": com uma turma selecionada a coluna repetiria o filtro. */
  mostrarTurma: boolean
  aoEscolher: (uid: string) => void
}) {
  if (linhas.length === 0) {
    return <p className="apoio">Nenhum aluno nesta seleção.</p>
  }

  const explicacao = (l: LinhaDaCentral): string | null => {
    if (l.motivo === 'sem-dados') return 'Este aluno ainda não sincronizou nenhuma vez.'
    if (l.motivo === 'turma-sem-curriculo')
      return 'Turma sem currículo próprio: o exame de azul não é a meta dela.'
    return null
  }

  return (
    <div className="tabela-rolagem">
      <table className="tabela">
        <thead>
          <tr>
            <th>Aluno</th>
            {mostrarTurma && <th>Turma</th>}
            <th className="num">Progresso</th>
            {grupos.map((g) => (
              <th className="num" key={g}>
                {ROTULO_GRUPO[g]}
              </th>
            ))}
            <th className="num" title="Fração do currículo que você confirmou">
              Validado
            </th>
            <th className="num" title="Domina, mas você ainda não viu">
              Esperando
            </th>
            <th>Situação</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.uid} onClick={() => aoEscolher(l.uid)} className="linha-clicavel">
              <td>
                <button className="link-aluno" onClick={() => aoEscolher(l.uid)}>
                  {l.nome}
                </button>
              </td>
              {mostrarTurma && (
                <td>
                  <span className="etiqueta">{nomeDaTurma(l.turma)}</span>
                </td>
              )}
              <td className="num">
                <strong style={{ color: corDaFaixa(l.faixa) }}>{porcento(l.progresso)}</strong>
                {/* Medidor so onde ha numero: uma barra de largura zero se le
                    como "zero por cento", e ausencia nao e zero. */}
                {l.progresso !== null && (
                  <span className="medidor medidor--pequeno">
                    <i
                      style={{
                        width: `${Math.round(l.progresso * 100)}%`,
                        background: corDaFaixa(l.faixa),
                      }}
                    />
                  </span>
                )}
              </td>
              {grupos.map((g) => (
                <Celula key={g} valor={l.porGrupo[g]} motivo={explicacao(l)} />
              ))}
              <Celula valor={l.validado ?? undefined} motivo={explicacao(l)} />
              <td className="num">{numero(l.aguardandoValidacao)}</td>
              <td>
                {l.situacao === null ? (
                  <span className="situacao situacao--sem-dados">nunca sincronizou</span>
                ) : (
                  <span className={`situacao situacao--${l.situacao}`}>
                    {ROTULO_SITUACAO[l.situacao]}
                  </span>
                )}
                <span className="situacao-apoio">{atividade(l.diasSemEstudar)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
