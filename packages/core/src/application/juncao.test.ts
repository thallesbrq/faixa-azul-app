import { describe, expect, it } from 'vitest'
import {
  FORMATO,
  abrirEnvelope,
  empacotar,
  mesclarEstados,
  nomeDoArquivo,
} from './juncao'
import { ACADEMIA_PADRAO, VERSAO_ATUAL, estadoInicial } from '../persistence/repositorio'
import type { EstadoPersistido } from '../persistence/repositorio'
import type { Marca, Origem } from '../domain/procedencia'

const AGORA = new Date('2026-09-05T12:00:00.000Z')

const m = (por: Origem, iso: string, versao = 1): Marca => ({
  alteradoEm: iso,
  alteradoPor: por,
  versao,
})

function base(id = 'aluno-1', nome = 'Thalles Alvim'): EstadoPersistido {
  return {
    ...estadoInicial(AGORA, () => id),
    perfil: { id, nome, papel: 'aluno', academiaId: ACADEMIA_PADRAO },
  }
}

function ev(id: string) {
  return { id, cardId: 'c1', side: 'unico', rating: 'good', usouDica: false, createdAt: AGORA.toISOString() } as never
}

// ---------------------------------------------------------------------------
// envelope
// ---------------------------------------------------------------------------

describe('envelope', () => {
  it('empacota com formato, versao e quem exportou', () => {
    const env = empacotar(base(), AGORA)
    expect(env.formato).toBe(FORMATO)
    expect(env.versaoDoEstado).toBe(VERSAO_ATUAL)
    expect(env.exportadoPor).toBe('aluno')
    expect(env.nome).toBe('Thalles Alvim')
  })

  it('faz a volta completa', () => {
    const env = empacotar(base(), AGORA)
    const r = abrirEnvelope(JSON.stringify(env), VERSAO_ATUAL)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.envelope.estado.perfil.id).toBe('aluno-1')
  })

  it('recusa lixo, JSON invalido e arquivo de outro app', () => {
    expect(abrirEnvelope('nao e json', VERSAO_ATUAL)).toEqual({ ok: false, motivo: 'formato' })
    expect(abrirEnvelope('{"a":1}', VERSAO_ATUAL)).toEqual({ ok: false, motivo: 'formato' })
    expect(abrirEnvelope(JSON.stringify({ formato: 'outro', versaoDoEstado: 2, estado: {} }), VERSAO_ATUAL)).toEqual({
      ok: false,
      motivo: 'formato',
    })
  })

  it('ACEITA arquivo de versao ANTERIOR — alunos entram aos poucos e versoes convivem', () => {
    // Recusar o antigo deixaria o aluno de fora ate ele atualizar o app, que e
    // exatamente o caso comum com entrada gradual.
    const env = { ...empacotar(base(), AGORA), versaoDoEstado: 1 }
    expect(abrirEnvelope(JSON.stringify(env), VERSAO_ATUAL).ok).toBe(true)
  })

  it('RECUSA arquivo de versao mais nova — este app nao sabe o que ha nele', () => {
    const env = { ...empacotar(base(), AGORA), versaoDoEstado: VERSAO_ATUAL + 1 }
    expect(abrirEnvelope(JSON.stringify(env), VERSAO_ATUAL)).toEqual({ ok: false, motivo: 'versao-futura' })
  })

  it('recusa arquivo de OUTRO aluno quando o destino espera o proprio', () => {
    // Sem isto, o aluno importaria o progresso de um colega por cima do dele e
    // os dois virariam um estado so, sem separacao possivel depois.
    const env = empacotar(base('aluno-2', 'Outro'), AGORA)
    expect(abrirEnvelope(JSON.stringify(env), VERSAO_ATUAL, 'aluno-1')).toEqual({
      ok: false,
      motivo: 'outro-aluno',
    })
  })

  it('a central do professor aceita QUALQUER aluno — ela nao passa perfil esperado', () => {
    const env = empacotar(base('aluno-2', 'Outro'), AGORA)
    expect(abrirEnvelope(JSON.stringify(env), VERSAO_ATUAL).ok).toBe(true)
  })
})

describe('nomeDoArquivo', () => {
  it('usa o nome da pessoa e a data — vinte "estado.json" seriam indistinguiveis', () => {
    expect(nomeDoArquivo(base('x', 'Thalles Alvim'), AGORA)).toBe('faixa-azul-thalles-alvim-2026-09-05.json')
  })

  it('tira acento e nao quebra com nome vazio', () => {
    expect(nomeDoArquivo(base('x', 'João Eduardo'), AGORA)).toBe('faixa-azul-joao-eduardo-2026-09-05.json')
    expect(nomeDoArquivo(base('x', ''), AGORA)).toBe('faixa-azul-aluno-2026-09-05.json')
  })
})

// ---------------------------------------------------------------------------
// juncao
// ---------------------------------------------------------------------------

describe('mesclarEstados', () => {
  it('O CENARIO PRINCIPAL: a grade do professor e o estudo do aluno convivem', () => {
    // Professor monta a grade 10h. Aluno estuda e marca a aula 1 as 11h.
    // Nenhum dos dois pode apagar o outro.
    const aluno: EstadoPersistido = {
      ...base(),
      eventos: [ev('e1'), ev('e2')],
      aulas: [
        {
          numero: 1,
          realizadaEm: '2026-09-02T11:00:00.000Z',
          marcas: { realizadaEm: m('aluno', '2026-09-02T11:00:00.000Z') },
        },
      ],
    }
    const doProfessor: EstadoPersistido = {
      ...base(),
      aulas: [
        {
          numero: 1,
          itemIds: ['x', 'y'],
          marcas: { itemIds: m('professor', '2026-09-02T10:00:00.000Z') },
        },
      ],
    }

    const r = mesclarEstados({ local: aluno, recebido: doProfessor })

    expect(r.estado.aulas[0].itemIds).toEqual(['x', 'y'])
    expect(r.estado.aulas[0].realizadaEm).toBe('2026-09-02T11:00:00.000Z')
    expect(r.estado.eventos).toHaveLength(2)
    expect(r.mudou).toBe(true)
  })

  it('logs se unem sem perder nada dos dois lados', () => {
    const a: EstadoPersistido = { ...base(), eventos: [ev('e1'), ev('e2')] }
    const b: EstadoPersistido = { ...base(), eventos: [ev('e2'), ev('e3')] }
    const r = mesclarEstados({ local: a, recebido: b })
    expect(r.estado.eventos.map((e) => e.id)).toEqual(['e1', 'e2', 'e3'])
    expect(r.relatorio.novos['revisões']).toBe(1)
  })

  it('NUNCA mescla o perfil — importar nao troca a identidade do aparelho', () => {
    // Sem isto, o professor viraria o aluno ao importar o arquivo dele.
    const professor: EstadoPersistido = {
      ...base('prof-1', 'João Eduardo'),
      perfil: { id: 'prof-1', nome: 'João Eduardo', papel: 'professor', academiaId: ACADEMIA_PADRAO },
    }
    const r = mesclarEstados({ local: professor, recebido: base('aluno-9', 'Thalles') })
    expect(r.estado.perfil).toEqual(professor.perfil)
  })

  it('NUNCA mescla config — e preferencia de quem usa AQUELE aparelho', () => {
    const local: EstadoPersistido = { ...base(), config: { limiteDiario: 30, novosPorDia: 12 } }
    const recebido: EstadoPersistido = { ...base(), config: { limiteDiario: 5, novosPorDia: 1 } }
    expect(mesclarEstados({ local, recebido }).estado.config).toEqual({ limiteDiario: 30, novosPorDia: 12 })
  })

  it('a indicacao do professor NAO apaga o video que o aluno escolheu', () => {
    // Sao coisas diferentes que o aluno quer ver juntas, e por isso vivem em
    // colecoes separadas.
    const aluno: EstadoPersistido = {
      ...base(),
      itens: [{ itemId: 'i1', video: 'https://meu', marcas: { video: m('aluno', '2026-09-01T08:00:00.000Z') } }],
    }
    const prof: EstadoPersistido = {
      ...base(),
      indicacoes: [{ itemId: 'i1', video: 'https://do-mestre', marca: m('professor', '2026-09-02T08:00:00.000Z') }],
    }
    const r = mesclarEstados({ local: aluno, recebido: prof })
    expect(r.estado.itens[0].video).toBe('https://meu')
    expect(r.estado.indicacoes[0].video).toBe('https://do-mestre')
  })

  it('OS DOIS APARELHOS CHEGAM AO MESMO RESULTADO — a propriedade que evita divergencia', () => {
    const aluno: EstadoPersistido = {
      ...base(),
      eventos: [ev('e1')],
      aulas: [{ numero: 1, realizadaEm: 'x', marcas: { realizadaEm: m('aluno', '2026-09-02T11:00:00.000Z') } }],
      itens: [{ itemId: 'i1', dificuldade: 'dificil', marcas: { dificuldade: m('aluno', '2026-09-01T08:00:00.000Z') } }],
    }
    const prof: EstadoPersistido = {
      ...base(),
      eventos: [ev('e2')],
      aulas: [{ numero: 1, itemIds: ['a'], marcas: { itemIds: m('professor', '2026-09-02T10:00:00.000Z') } }],
      indicacoes: [{ itemId: 'i1', video: 'https://v', marca: m('professor', '2026-09-02T10:00:00.000Z') }],
    }

    const noAluno = mesclarEstados({ local: aluno, recebido: prof }).estado
    const noProf = mesclarEstados({ local: prof, recebido: aluno }).estado

    expect(noAluno.aulas[0].itemIds).toEqual(noProf.aulas[0].itemIds)
    expect(noAluno.aulas[0].realizadaEm).toEqual(noProf.aulas[0].realizadaEm)
    expect(noAluno.itens[0].dificuldade).toEqual(noProf.itens[0].dificuldade)
    expect(noAluno.indicacoes[0].video).toEqual(noProf.indicacoes[0].video)
    expect(new Set(noAluno.eventos.map((e) => e.id))).toEqual(new Set(noProf.eventos.map((e) => e.id)))
  })

  it('e idempotente: mesclar o mesmo arquivo de novo nao muda nada nem anuncia mudanca', () => {
    // Importante na pratica: o professor reenvia o mesmo arquivo por engano e o
    // aluno nao pode ver "12 novidades" que nao existem.
    const aluno: EstadoPersistido = { ...base(), eventos: [ev('e1')] }
    const prof: EstadoPersistido = {
      ...base(),
      aulas: [{ numero: 1, itemIds: ['a'], marcas: { itemIds: m('professor', '2026-09-02T10:00:00.000Z') } }],
    }

    const uma = mesclarEstados({ local: aluno, recebido: prof })
    const duas = mesclarEstados({ local: uma.estado, recebido: prof })

    expect(duas.estado.aulas).toEqual(uma.estado.aulas)
    expect(duas.estado.eventos).toEqual(uma.estado.eventos)
    expect(duas.mudou).toBe(false)
  })

  it('mesclar com um estado vazio nao anuncia mudanca', () => {
    const r = mesclarEstados({ local: base(), recebido: base() })
    expect(r.mudou).toBe(false)
  })

  it('o relatorio conta o que entrou, para a tela poder contar', () => {
    // Juncao silenciosa e indistinguivel de perda de dado.
    const aluno: EstadoPersistido = { ...base(), eventos: [ev('e1')] }
    const prof: EstadoPersistido = { ...base(), eventos: [ev('e2'), ev('e3')] }
    const r = mesclarEstados({ local: aluno, recebido: prof })
    expect(r.relatorio.novos['revisões']).toBe(2)
  })
})
