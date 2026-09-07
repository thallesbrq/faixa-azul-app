/**
 * A academia no celular do professor — a aba Central do app.
 *
 * SUBSTITUI A TORRE, que importava arquivo `.json` que o aluno exportava e
 * guardava no `localStorage` do aparelho. Com a nuvem, aquela tela passou a ser
 * um segundo lugar mostrando progresso, lendo outra fonte, capaz de discordar da
 * Central no mesmo dia (ADR-015, decisao 12).
 *
 * RESPONDE UMA PERGUNTA SO: QUEM PRECISA DE MIM AGORA. E por isso a ordem nao e
 * alfabetica e quem parou aparece marcado — o mesmo argumento de
 * `ordenarLinhas`, que esta tela reusa em vez de reordenar por conta propria.
 *
 * O PAINEL COMPLETO E NO COMPUTADOR. Uma tabela de dez colunas em 375px nao se
 * le, e insistir nisso daria duas telas ruins em vez de uma boa. Aqui ficam as
 * quatro coisas que valem no tatame — nome, turma, progresso e quanto tempo sem
 * estudar — mais o atalho para a Central.
 */

import type { LinhaDaCentral } from '@faixa-azul/core/application/central'
import { ordenarLinhas } from '@faixa-azul/core/application/central'
import { nomeDaTurma } from '@faixa-azul/core/domain/turmas'
import type { EstadoDaAcademia } from '../useAcademia'

/** O endereco da Central. Absoluto porque ela e outra aplicacao. */
const CENTRAL = '/central/'

function porcento(v: number | null): string {
  return v === null ? '—' : `${Math.round(v * 100)}%`
}

function situacaoTexto(l: LinhaDaCentral): string {
  if (l.motivo === 'sem-dados') return 'nunca sincronizou'
  if (l.diasSemEstudar === null) return 'sem nenhuma revisão'
  if (l.diasSemEstudar === 0) return 'estudou hoje'
  if (l.diasSemEstudar === 1) return 'estudou ontem'
  return `${l.diasSemEstudar} dias sem estudar`
}

/** Classe da etiqueta de situacao — cor E palavra, nunca cor sozinha (RNF-04). */
function classeDaSituacao(l: LinhaDaCentral): string {
  if (l.motivo === 'sem-dados' || l.situacao === null) return 'situacao-aluno situacao-aluno--sem'
  if (l.situacao === 'em-dia') return 'situacao-aluno situacao-aluno--ok'
  if (l.situacao === 'parado') return 'situacao-aluno situacao-aluno--parado'
  return 'situacao-aluno situacao-aluno--nunca'
}

export interface AcademiaProps {
  estado: EstadoDaAcademia
  aoRecarregar: () => void
}

export function Academia({ estado, aoRecarregar }: AcademiaProps) {
  const linhas = ordenarLinhas(estado.linhas)

  return (
    <div className="card">
      <div className="topo-secao">
        <h3 className="detalhe-secao" style={{ marginBottom: 0 }}>
          Alunos
        </h3>
        <button
          className="link-desfazer"
          onClick={aoRecarregar}
          disabled={estado.fase === 'carregando'}
        >
          {estado.fase === 'carregando' ? 'lendo…' : 'recarregar'}
        </button>
      </div>

      {estado.fase === 'erro' && (
        <p className="aviso">
          <span aria-hidden="true">⚠️</span>
          <span>{estado.mensagem}</span>
        </p>
      )}

      {/* Falha de leitura NAO some: sem este aviso, um aluno ilegivel aparece
          como um aluno sem dado, e o professor conclui que ele nao estuda. */}
      {estado.falhas > 0 && (
        <p className="aviso">
          <span aria-hidden="true">⚠️</span>
          <span>
            Não consegui ler {estado.falhas} {estado.falhas === 1 ? 'aluno' : 'alunos'} — é falha
            de leitura, não falta de estudo.
          </span>
        </p>
      )}

      {estado.fase === 'carregando' && linhas.length === 0 && (
        <p className="instrucao" style={{ marginBottom: 0 }}>
          Lendo a academia…
        </p>
      )}

      {estado.fase === 'pronta' && linhas.length === 0 && (
        <p className="instrucao" style={{ marginBottom: 0 }}>
          Nenhum aluno ativo ainda. Convide alguém abaixo — a lista se enche quando ele entrar e
          estudar.
        </p>
      )}

      {linhas.length > 0 && (
        <ul className="lista-alunos">
          {linhas.map((l) => (
            <li key={l.uid}>
              <div className="aluno-linha">
                <div className="aluno-quem">
                  <strong>{l.nome}</strong>
                  <span className="aluno-turma">{nomeDaTurma(l.turma)}</span>
                </div>
                {/* `—` e nao `0%`: ausencia de dado nao e desempenho zero. */}
                <span className="aluno-progresso">{porcento(l.progresso)}</span>
              </div>
              <div className={classeDaSituacao(l)}>{situacaoTexto(l)}</div>
              {/*
                O `—` PRECISA DIZER POR QUE, e este caso nao estava dito.

                "Nunca sincronizou" ja se explica na linha de situacao. Mas um
                aluno de turma sem curriculo mostra `—` ao lado de "estudou
                ontem" — um traco sem numero ao lado de atividade recente, sem
                nada que ligue os dois. Na Central do computador ha uma nota no
                topo da turma; aqui a lista mistura turmas, entao a explicacao
                tem de vir na propria linha.
              */}
              {l.motivo === 'turma-sem-curriculo' && (
                <div className="aluno-nota">turma sem currículo próprio ainda</div>
              )}
              {l.duvidasAbertas > 0 && (
                <div className="aluno-duvidas">
                  {l.duvidasAbertas} {l.duvidasAbertas === 1 ? 'dúvida' : 'dúvidas'} esperando
                  resposta
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/*
        O atalho vem DEPOIS da lista, e nao antes: quem abriu o app no celular
        quer olhar, nao trocar de aparelho. Mas precisa existir, porque a
        programacao de aulas e a tabela por tipo de tecnica moram la.
      */}
      <a className="botao botao--secundario atalho-central" href={CENTRAL}>
        Abrir a Central no computador →
      </a>
      <p className="instrucao" style={{ marginTop: 8, marginBottom: 0 }}>
        Lá ficam a tabela por tipo de técnica, o progresso de cada aluno e a fila de validação.
      </p>
    </div>
  )
}
