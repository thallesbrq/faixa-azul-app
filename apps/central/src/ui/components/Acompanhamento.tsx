/**
 * A MATRIZ DE ACOMPANHAMENTO — alunos x os 29 itens do 1o grau.
 *
 * "A necessidade do professor e acompanhar conforme as aulas progridem se o aluno
 * esta aprendendo as tecnicas necessarias do curriculo do 1o grau nas 35 aulas."
 *
 * A folha do atestado responde isso por UM aluno. Esta tela responde pela turma,
 * e a diferenca nao e conveniencia: com quatro alunos e 29 itens, a pergunta
 * "quem falta no Ukemi" exige abrir quatro folhas e comparar de cabeca.
 *
 * ---------------------------------------------------------------------------
 * UM CLIQUE, SEM TEXTO — pedido dele, e o dado real deu razao a ele.
 *
 * O campo de justificativa era obrigatorio. Das seis primeiras atestacoes em
 * producao, CINCO tinham o texto `"ok"`. O campo nao produzia justificativa;
 * produzia atrito. Agora o app escreve a procedencia (`"Aula 5 · RGI ·
 * 22/09/2026"`), que responde onde e quando — a pergunta que a justificativa
 * deveria responder e nao respondia. Ver `domain/competencia`.
 * ---------------------------------------------------------------------------
 *
 * ATESTAR A AREA INTEIRA fica no cabecalho de cada modulo, uma vez por aluno e
 * uma vez para a turma. So os PENDENTES entram no lote: incluir o que ja esta
 * atestado poluiria um log append-only com repeticao permanente, e incluir o que
 * foi RETIRADO desfaria uma decisao do professor sem ele ver.
 */

import type {
  Acompanhamento,
  EstadoDoItem,
  GrupoDoAcompanhamento,
  ItemNoAcompanhamento,
  ParaAtestar,
} from '@faixa-azul/core/application/acompanhamento'
import { paresPendentes } from '@faixa-azul/core/application/acompanhamento'
import { nomeDaTurma } from '@faixa-azul/core/domain/turmas'

/** O que cada estado mostra. Uma marca, e o `title` diz o resto. */
const MARCA: Record<EstadoDoItem, { texto: string; rotulo: string; classe: string }> = {
  atestado: { texto: '✓', rotulo: 'atestado', classe: 'ac-celula--atestado' },
  pendente: { texto: '•', rotulo: 'aula dada, falta atestar', classe: 'ac-celula--pendente' },
  'nao-ensinado': { texto: '', rotulo: 'aula ainda não dada', classe: 'ac-celula--futuro' },
  retirado: { texto: '↺', rotulo: 'atestado retirado por você', classe: 'ac-celula--retirado' },
}

export function Acompanhamento({
  dados,
  gravando,
  aoAtestar,
}: {
  dados: Acompanhamento
  gravando: boolean
  /** Recebe os pares já filtrados por `paresPendentes`. */
  aoAtestar: (pares: readonly ParaAtestar[], oQue: string) => void
}) {
  const { alunos, grupos } = dados

  if (alunos.length === 0) {
    /* TURMA VAZIA NAO E ERRO, e a frase diz de quem e a acao: os convites estao
       criados e ninguem entrou ainda. Uma matriz de 29 linhas e zero colunas
       pareceria defeito. */
    return (
      <section className="cartao">
        <h2>Acompanhamento · {nomeDaTurma(dados.turma)}</h2>
        <p className="apoio" style={{ marginBottom: 0 }}>
          Nenhum aluno entrou nesta turma ainda. Quem foi convidado aparece na tabela
          acima como <em>convidado</em>; a matriz começa quando ele criar a conta.
        </p>
      </section>
    )
  }

  const todosOsItens = grupos.flatMap((g) => g.itens)

  return (
    <section className="cartao">
      <div className="ac-topo">
        <div>
          <h2>Acompanhamento · {nomeDaTurma(dados.turma)}</h2>
          <p className="apoio" style={{ margin: '2px 0 0' }}>
            {dados.ensinados} de {dados.totalDeItens} itens já foram dados em aula ·{' '}
            {/* O NUMERO QUE IMPORTA E O PENDENTE: e a unica coisa nesta tela que
                depende de uma acao dele. */}
            <strong className={dados.pendentes > 0 ? 'ac-pendente-forte' : undefined}>
              {dados.pendentes}
            </strong>{' '}
            {dados.pendentes === 1 ? 'atestação pendente' : 'atestações pendentes'}
          </p>
        </div>

        {dados.pendentes > 0 && (
          <button
            className="botao botao--principal botao--pequeno"
            disabled={gravando}
            onClick={() =>
              aoAtestar(paresPendentes(todosOsItens), `${dados.pendentes} atestações da turma`)
            }
            title="Atesta tudo que já foi dado em aula e ainda não foi marcado"
          >
            {gravando ? 'Gravando…' : `Atestar as ${dados.pendentes} pendentes`}
          </button>
        )}
      </div>

      <div className="tabela-rolagem">
        <table className="tabela ac-tabela">
          <thead>
            <tr>
              <th>Técnica</th>
              <th className="ac-col-aula">Aula</th>
              {alunos.map((a) => (
                <th key={a.uid} className="ac-col-aluno">
                  <span className="ac-aluno-nome">{a.nome}</span>
                  <span className="ac-aluno-placar">
                    {a.atestados}/{dados.totalDeItens}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => (
              <LinhasDoGrupo
                key={g.modulo.id}
                grupo={g}
                alunos={alunos}
                gravando={gravando}
                aoAtestar={aoAtestar}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="apoio ac-legenda">
        <span className="ac-celula ac-celula--atestado">✓</span> atestado ·{' '}
        <span className="ac-celula ac-celula--pendente">•</span> aula dada, falta atestar ·{' '}
        <span className="ac-celula ac-celula--futuro">&nbsp;</span> aula ainda não dada ·{' '}
        <span className="ac-celula ac-celula--retirado">↺</span> você retirou
      </p>

      {/* O QUE A TELA NAO SABE, dito na tela e nao so no codigo: sem presenca,
          "aula dada" e sobre a TURMA e nao sobre este aluno. Um aluno que faltou
          na aula 1 aparece como pendente no Ukemi igual a quem estava lá. */}
      <p className="apoio" style={{ marginBottom: 0 }}>
        <strong>Atenção:</strong> o app ainda não registra presença. “Aula dada” quer dizer
        que a aula aconteceu — não que este aluno estava nela.
      </p>
    </section>
  )
}

function LinhasDoGrupo({
  grupo,
  alunos,
  gravando,
  aoAtestar,
}: {
  grupo: GrupoDoAcompanhamento
  alunos: Acompanhamento['alunos']
  gravando: boolean
  aoAtestar: (pares: readonly ParaAtestar[], oQue: string) => void
}) {
  return (
    <>
      {/* O CABECALHO DO MODULO E ONDE MORA "ATESTAR A AREA INTEIRA".
          Um botao por aluno (a coluna dele naquele modulo) e um para a turma. */}
      <tr className="ac-grupo">
        <th colSpan={2}>
          {grupo.modulo.nome}
          {grupo.pendentes > 0 && (
            <button
              className="botao botao--claro botao--pequeno ac-atestar-grupo"
              disabled={gravando}
              onClick={() =>
                aoAtestar(
                  paresPendentes(grupo.itens),
                  `${grupo.pendentes} de ${grupo.modulo.nome}`,
                )
              }
              title={`Atesta os ${grupo.pendentes} pendentes de ${grupo.modulo.nome}, para todos os alunos`}
            >
              atestar {grupo.pendentes}
            </button>
          )}
        </th>
        {alunos.map((a) => {
          const pares = paresPendentes(grupo.itens, a.uid)
          return (
            <th key={a.uid} className="ac-col-aluno">
              {pares.length > 0 && (
                <button
                  className="botao botao--claro botao--pequeno ac-atestar-grupo"
                  disabled={gravando}
                  onClick={() =>
                    aoAtestar(pares, `${grupo.modulo.nome} de ${a.nome} (${pares.length})`)
                  }
                  title={`Atesta ${pares.length} de ${grupo.modulo.nome} para ${a.nome}`}
                >
                  +{pares.length}
                </button>
              )}
            </th>
          )
        })}
      </tr>

      {grupo.itens.map((i) => (
        <LinhaDoItem key={i.item.id} item={i} gravando={gravando} aoAtestar={aoAtestar} />
      ))}
    </>
  )
}

function LinhaDoItem({
  item,
  gravando,
  aoAtestar,
}: {
  item: ItemNoAcompanhamento
  gravando: boolean
  aoAtestar: (pares: readonly ParaAtestar[], oQue: string) => void
}) {
  const nome = item.item.nome || item.item.slot

  return (
    <tr className={item.ensinado ? undefined : 'ac-linha--futuro'}>
      <td>
        {nome}
        {/* A POSICAO DESAMBIGUA nomes repetidos: "Estrangulamento cruzado"
            aparece tres vezes nos 29 itens, de posicoes diferentes, e sem a
            posicao a linha nao diz qual e. */}
        <span className="ac-posicao">{item.item.posicao}</span>
      </td>
      <td className="ac-col-aula">
        {item.aula === null ? (
          /* ITEM FORA DO PROGRAMA e uma lacuna que o professor precisa ver: se
             ele nunca programar, o aluno nunca vai ver, e o 1o grau fica preso
             sem que nada na tela diga por que.

             PARCIALMENTE PROGRAMADO E OUTRA LACUNA, e a frase muda: o requisito
             ESTA no programa, pela metade. "Ukemi conta como todos frente,
             costas e lateral" — decisao do professor — e sem esta distincao um
             requisito com duas das tres partes programadas ficaria identico a um
             que nunca foi tocado. As duas exigem acao dele, mas acoes
             diferentes: uma e completar, a outra e comecar.

             A CONDICAO E `programadas > 0` E NAO `partes !== null`. Com
             `partes !== null` a tela dizia "falta parte" para "Raspagem de
             tesoura", cuja unica parte nao esta programada em lugar nenhum — nao
             falta parte, falta o requisito. A pagina de amostra mostrou isso na
             primeira olhada. */
          item.partes && item.partes.programadas > 0 ? (
            <span
              className="ac-sem-aula"
              title={`Este requisito é composto por ${item.partes.total} itens do currículo de azul, e ${item.partes.programadas} deles estão no programa. Ele só conta como dado quando todos estiverem.`}
            >
              falta parte
            </span>
          ) : (
            <span className="ac-sem-aula" title="Este item não está em nenhuma aula do programa">
              fora do programa
            </span>
          )
        ) : (
          <span title={item.data ? `Aula ${item.aula} em ${item.data}` : `Aula ${item.aula}, sem data`}>
            {item.aula}
            {item.data === null && <span className="ac-sem-data"> sem data</span>}
          </span>
        )}
        {/* O PARCIAL SO APARECE ENQUANTO FALTA ALGO E SO A PARTIR DE DUAS PARTES.
            Mostrar "3 de 3" em toda linha completa poria ruido em 16 das 29
            linhas para dizer o que a coluna da aula ja diz; e com UMA parte
            "parte" nao e um conceito util — o requisito esta ou nao esta no
            programa. Sem o `total > 1`, a tela imprimia "0 de 1 partes" em sete
            linhas, que foi o que a amostra revelou. */}
        {item.partes && item.partes.total > 1 && item.partes.dadas < item.partes.total && (
          <span className="ac-partes" title="Partes deste requisito já dadas em aula">
            {item.partes.dadas} de {item.partes.total} partes
          </span>
        )}
      </td>
      {item.celulas.map((c) => {
        const m = MARCA[c.estado]
        const podeClicar = c.estado === 'pendente'
        return (
          <td key={c.alunoUid} className="ac-col-aluno">
            <button
              className={`ac-celula ${m.classe}`}
              disabled={gravando || !podeClicar}
              onClick={() => aoAtestar([{ alunoUid: c.alunoUid, itemId: c.itemId }], nome)}
              title={podeClicar ? `Atestar ${nome}` : m.rotulo}
              aria-label={`${nome}: ${m.rotulo}`}
            >
              {m.texto || ' '}
            </button>
          </td>
        )
      })}
    </tr>
  )
}
