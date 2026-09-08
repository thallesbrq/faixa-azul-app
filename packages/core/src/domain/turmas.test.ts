import { describe, expect, it } from 'vitest'
import {
  nomeDaTurma,
  ROTULO_SEM_TURMA,
  SEM_TURMA,
  TURMAS,
  turmaPorId,
} from './turmas'

describe('turmas', () => {
  it('tem as duas turmas da academia', () => {
    // RGI substituiu RG1A e RG1B (ADR-017, decisao 8): uma turma de iniciantes.
    expect(TURMAS.map((t) => t.id)).toEqual(['RGI', 'RG2'])
  })

  it('RG1A e RG1B nao voltam como turma oferecida', () => {
    // Elas nunca tiveram cadastro, entao a renomeacao nao migrou nada. Este
    // teste existe para nao voltarem por copia de um exemplo antigo.
    expect(turmaPorId('RG1A')).toBeNull()
    expect(turmaPorId('RG1B')).toBeNull()
  })

  it('mas um cadastro em RG1A ainda mostra RG1A, e nao desaparece', () => {
    // Se algum cadastro tiver o valor antigo, esconde-lo faria o professor ver
    // uma pessoa a menos na academia — que e o pior desfecho possivel.
    expect(nomeDaTurma('RG1A')).toBe('RG1A')
  })

  it('turma NAO decide mais o curriculo — quem decide e a meta', () => {
    // `medeCurriculoDeAzul` vivia aqui e foi removido (ADR-016, decisao 3):
    // dois alunos da mesma turma podem perseguir graduacoes diferentes. Este
    // teste existe para o campo nao voltar por conveniencia.
    expect(TURMAS.every((t) => !('medeCurriculoDeAzul' in t))).toBe(true)
  })

  it('sem turma tem rotulo proprio, e nao fica em branco', () => {
    // Cadastro em branco na central e uma linha que o professor nao sabe ler.
    expect(nomeDaTurma(SEM_TURMA)).toBe(ROTULO_SEM_TURMA)
  })

  it('turma desconhecida mostra o proprio id, e nao erro', () => {
    // Se o Firestore tem RG3 e este aparelho e antigo, o professor precisa ver
    // RG3 para entender o que esta olhando.
    expect(nomeDaTurma('RG3')).toBe('RG3')
  })

  it('turmaPorId devolve null para o que nao existe', () => {
    expect(turmaPorId('RGI')?.descricao).toBe('Iniciantes — faixa branca')
    expect(turmaPorId('nada')).toBeNull()
    expect(turmaPorId(SEM_TURMA)).toBeNull()
  })
})
