/**
 * Convidar alunos DA CENTRAL — o pedido literal dele: "irei passar um invite
 * para eles via central com o email deles".
 *
 * POR QUE ISTO NAO E CODIGO DUPLICADO do `Convidar` do app do aluno, e o que
 * mudaria se eu tentasse compartilhar: o do celular e uma tela inteira, com
 * seletor de papel (aluno ou professor) e a lista de pendentes como assunto
 * principal. Este e um painel dentro da tabela da turma, sem seletor de papel —
 * ele convida ALUNO, na turma que ja esta selecionada acima — e a lista de
 * pendentes nao aparece aqui porque os convidados JA SAO LINHAS DA TABELA
 * (ADR-017, decisao 4). Compartilhar o componente obrigaria a parametrizar as
 * duas diferencas e a lista que um mostra e o outro nao.
 *
 * A TURMA E A META VEM DE FORA, do filtro que o professor ja escolheu. Repetir
 * os seletores aqui criaria o caso em que ele esta olhando a RGI e convida
 * alguem para a RG2 sem perceber.
 *
 * NAO HA COMO PRE-CRIAR OS ALUNOS SEM O E-MAIL DELES: o id do documento de
 * convite E o e-mail, e inventar `willian@exemplo.com` criaria documentos reais
 * e inuteis no banco. Por isso os nomes vem sugeridos e o e-mail e digitado.
 */

import { useState } from 'react'
import { nomeDaTurma, SEM_TURMA } from '@faixa-azul/core/domain/turmas'
import { nomeDaMeta, SEM_META } from '@faixa-azul/core/domain/metas'

/**
 * Os tres alunos reais da turma, para o professor nao digitar o nome.
 *
 * Isto e uma CONVENIENCIA e nao um cadastro: clicar preenche o campo de nome, e
 * nada acontece no banco antes de haver um e-mail. Somem da lista assim que a
 * pessoa e convidada, porque ai ela ja e uma linha da tabela.
 */
const SUGESTOES = ['Willian', 'Roberto', 'Eduardo']

export function Convidar({
  turma,
  meta,
  jaConvidados,
  aoConvidar,
  aoCancelar,
}: {
  /** A turma selecionada na barra. `SEM_TURMA` quando e a visao "Todas". */
  turma: string
  /** A meta padrao dos novos alunos desta turma. */
  meta: string
  /** Nomes que ja tem cadastro ou convite — para nao sugerir de novo. */
  jaConvidados: readonly string[]
  aoConvidar: (entrada: { email: string; nome: string; turma: string; meta: string }) => Promise<void>
  aoCancelar: (email: string) => Promise<void>
}) {
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ultimo, setUltimo] = useState<string | null>(null)

  const existentes = new Set(jaConvidados.map((n) => n.trim().toLowerCase()))
  const sugestoes = SUGESTOES.filter((n) => !existentes.has(n.toLowerCase()))

  /**
   * SEM TURMA SELECIONADA NAO DA PARA CONVIDAR, e isso e trava e nao falta.
   *
   * As regras exigem que a turma do cadastro coincida com a do convite, e o
   * convite e de uso unico: convidar sem turma cria alguem que nao aparece em
   * turma nenhuma, e a unica saida seria o professor atribuir a mao depois. Com
   * "Todas" selecionado nao existe resposta certa para qual turma usar.
   */
  const semTurma = turma === SEM_TURMA
  const podeEnviar = !semTurma && email.trim() !== '' && nome.trim() !== '' && !enviando

  async function enviar() {
    setEnviando(true)
    setAviso(null)
    const alvo = email.trim().toLowerCase()
    try {
      await aoConvidar({ email: alvo, nome: nome.trim(), turma, meta })
      setUltimo(alvo)
      setEmail('')
      setNome('')
    } catch (e) {
      setAviso((e as Error)?.message ?? 'Não foi possível criar o convite.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className="cartao">
      <h2>Convidar para a {semTurma ? 'turma' : nomeDaTurma(turma)}</h2>

      {semTurma ? (
        <p className="apoio">
          Escolha uma turma na barra acima para convidar. Um convite sem turma cria alguém que
          não aparece em turma nenhuma.
        </p>
      ) : (
        <>
          <p className="apoio">
            A pessoa entra pelo link no próprio e-mail e nasce na{' '}
            <strong>{nomeDaTurma(turma)}</strong>
            {meta !== SEM_META && (
              <>
                , buscando o <strong>{nomeDaMeta(meta)}</strong>
              </>
            )}
            . Enquanto não entrar, ela aparece na tabela como <em>convidada</em>.
          </p>

          {sugestoes.length > 0 && (
            <p className="apoio">
              Alunos da turma:{' '}
              {sugestoes.map((n) => (
                <button
                  key={n}
                  type="button"
                  className="botao botao--claro botao--pequeno"
                  onClick={() => setNome(n)}
                >
                  {n}
                </button>
              ))}
            </p>
          )}

          <div className="convite-campos">
            <label className="campo">
              <span>Nome</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Willian"
                autoComplete="off"
              />
            </label>
            <label className="campo">
              <span>E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                autoComplete="off"
              />
            </label>
            <button
              className="botao botao--principal"
              onClick={() => void enviar()}
              disabled={!podeEnviar}
            >
              {enviando ? 'Criando…' : 'Criar convite'}
            </button>
          </div>

          {aviso && <p className="aviso">{aviso}</p>}

          {/* O CONVITE CRIADO NAO SOME DA TELA sem confirmacao: sem esta linha o
              professor nao sabe se o clique funcionou, e cria de novo. O botao
              de cancelar fica junto porque o erro tipico e e-mail digitado
              errado, e ele aparece no mesmo segundo. */}
          {ultimo && (
            <p className="apoio">
              Convite criado para <strong>{ultimo}</strong>.{' '}
              <button
                type="button"
                className="botao botao--claro botao--pequeno"
                onClick={() => {
                  void aoCancelar(ultimo)
                  setUltimo(null)
                }}
              >
                Cancelar
              </button>
            </p>
          )}
        </>
      )}
    </section>
  )
}
