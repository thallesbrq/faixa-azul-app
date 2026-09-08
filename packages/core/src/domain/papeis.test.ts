import { describe, expect, it } from 'vitest'
import {
  nomeDoPapel,
  papelDe,
  podeAdministrar,
  podeAssinarEvidencia,
  podeConvidarComPapel,
  podeMudarPapel,
  podeVerAcademia,
  type Papel,
} from './papeis'
import { marcar, maisRecente } from './procedencia'

const PAPEIS: Papel[] = ['aluno', 'professor', 'admin']

describe('papelDe', () => {
  it('reconhece os tres papeis', () => {
    expect(papelDe('aluno')).toBe('aluno')
    expect(papelDe('professor')).toBe('professor')
    expect(papelDe('admin')).toBe('admin')
  })

  it('papel desconhecido cai em aluno, e nao em algo com poder', () => {
    // Uma versao futura pode gravar `papel: 'diretor'`. Numa versao antiga que
    // nao sabe o que isso significa, o valor certo e o mais restrito.
    for (const lixo of ['diretor', 'ADMIN', 'Professor', '', null, undefined, 42, {}]) {
      expect(papelDe(lixo)).toBe('aluno')
    }
  })
})

describe('quem assina evidencia', () => {
  it('so o professor', () => {
    expect(podeAssinarEvidencia('professor')).toBe(true)
    expect(podeAssinarEvidencia('admin')).toBe(false)
    expect(podeAssinarEvidencia('aluno')).toBe(false)
  })

  it('o admin ve tudo e NAO assina — e o ponto do papel existir', () => {
    // ADR-017, decisao 1: o desenvolvedor precisa da visao geral sem poder
    // conceder a si mesmo a graduacao.
    expect(podeVerAcademia('admin')).toBe(true)
    expect(podeAdministrar('admin')).toBe(true)
    expect(podeAssinarEvidencia('admin')).toBe(false)
  })
})

describe('quem mexe em papel', () => {
  it('so o professor muda papel', () => {
    expect(podeMudarPapel('professor')).toBe(true)
    expect(podeMudarPapel('admin')).toBe(false)
    expect(podeMudarPapel('aluno')).toBe(false)
  })

  it('o admin convida aluno, mas nao professor nem outro admin', () => {
    // Sem isto a divisao e teatro: o admin se convidaria de novo como professor
    // com um segundo e-mail e assinaria. ADR-017, decisao 2.
    expect(podeConvidarComPapel('admin', 'aluno')).toBe(true)
    expect(podeConvidarComPapel('admin', 'professor')).toBe(false)
    expect(podeConvidarComPapel('admin', 'admin')).toBe(false)
  })

  it('o aluno nao convida ninguem', () => {
    for (const alvo of PAPEIS) {
      expect(podeConvidarComPapel('aluno', alvo)).toBe(false)
    }
  })

  it('nenhum papel pode assinar sem poder ver', () => {
    // Invariante de forma: quem assina evidencia de um aluno precisa alcancar
    // esse aluno. Se algum dia um papel puder assinar sem ver, a tela ofereceria
    // um botao para um aluno que ela nao consegue listar.
    for (const p of PAPEIS) {
      if (podeAssinarEvidencia(p)) expect(podeVerAcademia(p)).toBe(true)
    }
  })
})

describe('papel NAO e Origem (ADR-017, decisao 1)', () => {
  it('o desempate do merge continua entre aluno e professor', () => {
    /**
     * ESTE TESTE E UM ALARME, e nao uma verificacao de comportamento novo.
     *
     * `maisRecente` desempata por `alteradoPor` em ordem alfabetica quando data
     * e versao empatam. Se alguem algum dia unificar `Papel` e `Origem` — que e
     * a tentacao obvia, porque dois deles tem os mesmos nomes — `'admin'`
     * entraria nesse desempate ANTES de `'aluno'`, e o vencedor de um merge
     * empatado mudaria dentro de codigo que nao fala de papel.
     *
     * O teste falha se o desempate deixar de ser este par.
     */
    const quando = new Date('2026-09-07T10:00:00.000Z')
    const doAluno = marcar('aluno', quando)
    const doProfessor = marcar('professor', quando)

    expect(maisRecente(doAluno, doProfessor).alteradoPor).toBe('aluno')
    // E o mesmo resultado com os argumentos trocados: o desempate nao pode
    // depender da ordem, senao os dois aparelhos divergem.
    expect(maisRecente(doProfessor, doAluno).alteradoPor).toBe('aluno')
  })
})

describe('nomeDoPapel', () => {
  it('da nome aos tres', () => {
    expect(nomeDoPapel('aluno')).toBe('Aluno')
    expect(nomeDoPapel('professor')).toBe('Professor')
    expect(nomeDoPapel('admin')).toBe('Administrador')
  })
})
