import { describe, expect, it } from 'vitest'
import {
  medeCurriculoDeAzul,
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

  it('so as turmas de iniciantes medem o curriculo de azul', () => {
    // A regra de negocio do ADR-015: RG2 e intermediario/avancado, e medi-la
    // contra o exame de azul mostraria a turma inteira em vermelho por nao usar
    // um app de preparacao para uma prova que ja fizeram.
    expect(medeCurriculoDeAzul('RG1A')).toBe(true)
    expect(medeCurriculoDeAzul('RG1B')).toBe(true)
    expect(medeCurriculoDeAzul('RG2')).toBe(false)
  })

  it('turma desconhecida NAO mede curriculo — escolha conservadora', () => {
    // Numero errado com aparencia de certo e pior que lacuna visivel.
    expect(medeCurriculoDeAzul('RG9')).toBe(false)
    expect(medeCurriculoDeAzul(SEM_TURMA)).toBe(false)
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
