import { describe, expect, it } from 'vitest'
import {
  nomeDaTurma,
  ROTULO_SEM_TURMA,
  horariosDaTurma,
  SEM_TURMA,
  TURMAS,
  turmaPorId,
} from './turmas'

describe('turmas', () => {
  it('tem as duas turmas da academia', () => {
    // RGI substituiu RG1A e RG1B (ADR-017, decisao 8); RG2 virou RGA.
    expect(TURMAS.map((t) => t.id)).toEqual(['RGI', 'RGA'])
  })

  it('TODA turma tem horario — turma e horario, e nada mais', () => {
    // O cabecalho deste arquivo diz isso desde o inicio, e agora o dado
    // sustenta: sem horario nao ha slot, e sem slot nao ha como agendar aula.
    for (const t of TURMAS) {
      expect(t.horarios.length).toBeGreaterThan(0)
      for (const h of t.horarios) {
        expect(h.diaDaSemana).toBeGreaterThanOrEqual(0)
        expect(h.diaDaSemana).toBeLessThanOrEqual(6)
        expect(h.inicio).toMatch(/^\d{2}:\d{2}$/)
        expect(h.fim).toMatch(/^\d{2}:\d{2}$/)
        // Fim depois do inicio, comparado como texto — 'HH:MM' de dois digitos
        // ordena igual ao relogio, e e por isso que o formato e fixo.
        expect(h.fim > h.inicio).toBe(true)
      }
    }
  })

  it('a RGI treina terca e quinta, 8h as 9h', () => {
    // Ditado pelo professor. Se alguem mudar sem ele pedir, o teste falha.
    const rgi = turmaPorId('RGI')!
    expect(rgi.horarios.map((h) => h.diaDaSemana)).toEqual([2, 4])
    expect(rgi.horarios.every((h) => h.inicio === '08:00' && h.fim === '09:00')).toBe(true)
  })

  it('a RGA e 19h as 20h — e os DIAS sao suposicao minha', () => {
    // O horario veio do professor; os dias nao. Assumi os mesmos da RGI, e este
    // teste existe para a suposicao ficar visivel em vez de virar fato.
    const rga = turmaPorId('RGA')!
    expect(rga.horarios.every((h) => h.inicio === '19:00' && h.fim === '20:00')).toBe(true)
    expect(rga.horarios.map((h) => h.diaDaSemana)).toEqual([2, 4])
  })

  it('turma sem horario cadastrado devolve lista vazia, e nao um padrao', () => {
    // Inventar um horario padrao poria aula onde nao ha aula.
    expect(horariosDaTurma('RG3')).toEqual([])
    expect(horariosDaTurma(SEM_TURMA)).toEqual([])
  })

  it('RG2 nao volta como turma oferecida, mas ainda tem nome', () => {
    // Havia um convite pendente para RG2, entao o valor pode aparecer no banco.
    // Ele nao e oferecido e continua legivel — esconder faria o professor ver
    // uma pessoa a menos na academia.
    expect(turmaPorId('RG2')).toBeNull()
    expect(nomeDaTurma('RG2')).toBe('RG2')
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
