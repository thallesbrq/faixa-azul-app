import { describe, expect, it } from 'vitest'
import {
  nomeDaTurma,
  ROTULO_SEM_TURMA,
  SEM_TURMA,
  TURMAS,
  turmaPorId,
} from './turmas'

describe('turmas', () => {
  it('tem as tres turmas da academia', () => {
    expect(TURMAS.map((t) => t.id)).toEqual(['RG1A', 'RG1B', 'RG2'])
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
    expect(turmaPorId('RG1A')?.descricao).toBe('Iniciantes')
    expect(turmaPorId('nada')).toBeNull()
    expect(turmaPorId(SEM_TURMA)).toBeNull()
  })
})
