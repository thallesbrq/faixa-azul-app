/**
 * Cadastros e convites na nuvem.
 *
 * O CICLO QUE ESTE ARQUIVO FECHA, e que era impossivel antes:
 *
 *   professor convida por E-MAIL  ->  convites/{email}
 *   convidado entra pela primeira vez
 *   app le o convite e cria       ->  pessoas/{uid}
 *   app apaga o convite            (uso unico)
 *
 * O e-mail e a ponte porque o `uid` so nasce no primeiro login — o professor
 * nao teria o que digitar. Ver a explicacao completa em firestore.rules.
 *
 * O QUE VEM DO CONVITE E NAO DO CLIENTE: papel e academia. As regras exigem que
 * coincidam, entao mandar outra coisa e recusado pelo servidor — mas o cliente
 * tambem nao TENTA, para nao produzir erro que pareceria bug.
 */

import type { FirebaseApp } from 'firebase/app'
import type { Papel } from '../domain/papeis'
import { papelDe } from '../domain/papeis'
import { SEM_TURMA } from '../domain/turmas'
import { SEM_META } from '../domain/metas'
import { FalhaDaNuvem } from './cliente'

export interface Cadastro {
  uid: string
  nome: string
  /**
   * `Papel`, E NAO `Origem` (ADR-017, decisao 1).
   *
   * Eram o mesmo tipo porque tinham os mesmos dois valores. `Origem` e carregada
   * pelo MERGE — `maisRecente` desempata por `alteradoPor` em ordem alfabetica —
   * e acrescentar `'admin'` a ela mudaria quem ganha um merge empatado dentro de
   * codigo que nao fala de papel nenhum. Ver domain/papeis.
   */
  papel: Papel
  academiaId: string
  ativo: boolean
  /**
   * Turma do aluno. `SEM_TURMA` ('') quando o professor ainda nao atribuiu.
   *
   * `string` e nao uniao fechada: quem escreve e o cliente, e o tipo desaparece
   * na compilacao — fechar daria falsa seguranca. Ver domain/turmas.
   *
   * NUNCA `undefined`: as regras comparam a turma do cadastro com a do convite
   * usando `get('turma', '')`, entao mandar o campo ausente e mandar ''. Deixar
   * o tipo opcional faria o TypeScript aceitar os dois, e os dois NAO sao a
   * mesma coisa do lado do professor — ausente e "cadastro antigo", '' e
   * "decidi que ele nao tem turma ainda". No cliente colapsamos para '', e este
   * comentario existe para quem for tentado a reabrir a distincao.
   */
  turma: string
  /**
   * A proxima graduacao que ele persegue: '1grau' ... 'azul'. `SEM_META` ('')
   * quando o professor ainda nao definiu.
   *
   * META E DO ALUNO, NAO DA TURMA (ADR-016, decisao 3): o 1o grau vem antes do
   * azul, e um faixa branca novo e alguem com tres graus cabem na MESMA turma de
   * iniciantes. Se o curriculo fosse da turma, um dos dois seria medido contra a
   * prova errada. Ver domain/metas.
   */
  meta: string
  /**
   * O CURRICULO que ele treina no app: 'azul', '1grau', ou '' quando nao ha.
   *
   * SEPARADO DE `meta` (ADR-017, decisao 6). Meta e a PROVA, `estuda` e o
   * CONTEUDO, e no meu proprio caso eles divergem: persigo o 3o grau e treino o
   * curriculo de azul inteiro (guarda fechada e meia guarda incluidas). Com um
   * campo so, um dos dois seria mentira.
   *
   * Cadastro anterior a este campo cai em `meta` — ver `comoCadastro`.
   */
  estuda: string
  /**
   * Contratou aulas particulares?
   *
   * FEATURE QUE LIGA E DESLIGA POR ALUNO, e nao um numero: o pacote de 10 aulas
   * (`TOTAL_DE_AULAS`) e coisa contratada, e a maioria da turma nao contratou.
   * Mostrar "0 de 10 particulares" para quem nunca contratou seria inventar uma
   * divida que nao existe.
   *
   * NAO CONFUNDIR com as aulas da TURMA, que sao o contador do gate do 1o grau.
   */
  temParticulares: boolean
  /**
   * Cadastro de DEMONSTRACAO: estado semeado, nao treinado no tatame.
   *
   * Existe para o Prof. Joao nao ver em RGI um aluno que ele nunca conheceu, com
   * progresso, sem saber que sou eu (ADR-017, decisao 5). Desligavel — quando eu
   * comecar a treinar de verdade como Floki, o campo vira mentira ao contrario.
   */
  demo: boolean
}

export interface Convite {
  email: string
  nome: string
  papel: Papel
  academiaId: string
  /** Turma em que a pessoa NASCE. As regras exigem que o cadastro coincida. */
  turma: string
  /** Meta em que a pessoa NASCE. As regras tambem exigem que coincida. */
  meta: string
  /**
   * Curriculo em que a pessoa NASCE.
   *
   * NAO E COMPARADO PELAS REGRAS, ao contrario de turma e meta — e a diferenca e
   * deliberada. `meta` decide contra que prova o aluno e avaliado, entao
   * deixa-la escolhida pelo cliente seria o aluno escolhendo o proprio exame.
   * `estuda` decide o que ele TREINA, e trocar isso nao muda avaliacao nenhuma:
   * e o equivalente a escolher qual apostila abrir. Uma regra a mais para
   * proteger isso seria mais uma comparacao com `get(..., '')` para manter, sem
   * nada protegido.
   */
  estuda: string
  convidadoEm: string
}

export interface Dados {
  cadastroDe(uid: string): Promise<Cadastro | null>
  /**
   * Cria o proprio cadastro a partir do convite, e consome o convite.
   *
   * Lanca `sem-convite` quando nao ha convite para o e-mail. Esse caso NAO e
   * erro de sistema: e alguem que entrou sem ter sido convidado, e a tela
   * precisa dizer isso em vez de mostrar falha tecnica.
   */
  criarDoConvite(uid: string, email: string): Promise<Cadastro>
  convidar(entrada: {
    email: string
    nome: string
    papel: Papel
    turma: string
    meta: string
    estuda: string
  }): Promise<void>
  listarConvites(): Promise<Convite[]>
  cancelarConvite(email: string): Promise<void>
  listarPessoas(): Promise<Cadastro[]>
  atualizarNome(uid: string, nome: string): Promise<void>
  /**
   * Atribui ou troca a turma de alguem. So o professor consegue — as regras
   * negam ao proprio aluno (`hasOnly(['nome'])`), e e o que faz a media da
   * turma nao ser opiniao de quem esta sendo medido.
   */
  atualizarTurma(uid: string, turma: string): Promise<void>
  /**
   * Troca a meta de alguem. So o professor: as regras negam ao proprio aluno
   * pelo mesmo `hasOnly(['nome'])` que ja protegia a turma — a lista de
   * PERMISSAO fez o campo novo nascer protegido sem uma linha de regra nova.
   */
  atualizarMeta(uid: string, meta: string): Promise<void>
  /**
   * Troca o CURRICULO que a pessoa estuda. So o gestor, pelo mesmo
   * `hasOnly(['nome'])` que ja protegia turma e meta — a lista de PERMISSAO fez
   * o campo novo nascer protegido sem uma linha de regra nova. Terceira vez que
   * isso se paga (turma, meta, agora `estuda`).
   */
  atualizarEstuda(uid: string, estuda: string): Promise<void>
  /** Liga ou desliga as aulas particulares de alguem. */
  atualizarParticulares(uid: string, tem: boolean): Promise<void>
}

/** Normaliza o e-mail: ele e o ID do documento, e caixa diferente viraria dois. */
function idDoEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function abrirDados(app: FirebaseApp, minhaAcademia: string): Promise<Dados> {
  const fs = await import('firebase/firestore')
  const db = fs.getFirestore(app)

  const comoCadastro = (uid: string, d: Record<string, unknown>): Cadastro => ({
    uid,
    nome: typeof d.nome === 'string' ? d.nome : '',
    papel: papelDe(d.papel),
    academiaId: typeof d.academiaId === 'string' ? d.academiaId : minhaAcademia,
    ativo: d.ativo === true,
    // Cadastro criado antes deste campo existir nao tem a chave. '' e o valor
    // certo: "sem turma" e o que ele de fato e, ate o professor atribuir.
    turma: typeof d.turma === 'string' ? d.turma : SEM_TURMA,
    // Cadastro anterior a este campo nao tem a chave: '' e o que ele de fato e.
    meta: typeof d.meta === 'string' ? d.meta : SEM_META,
    /**
     * CADASTRO SEM `estuda` CAI NA `meta`, e nao em ''.
     *
     * Este e o unico default deste arquivo que ADIVINHA, e a razao e que a
     * alternativa e pior: todos os cadastros que existem hoje nasceram quando um
     * campo so fazia os dois papeis, e o valor que eles guardam em `meta` E o
     * curriculo que a pessoa estuda. Cair em '' faria cada aluno existente
     * aparecer sem progresso ate alguem reatribuir um por um — dado bom
     * escondido por uma migracao de campo.
     */
    estuda: typeof d.estuda === 'string' ? d.estuda : (typeof d.meta === 'string' ? d.meta : SEM_META),
    // Ausente = nao contratou. O default certo e o que a maioria da turma e.
    temParticulares: d.temParticulares === true,
    demo: d.demo === true,
  })

  return {
    async cadastroDe(uid) {
      const s = await fs.getDoc(fs.doc(db, 'pessoas', uid))
      return s.exists() ? comoCadastro(uid, s.data()) : null
    },

    async criarDoConvite(uid, email) {
      const id = idDoEmail(email)
      const conv = await fs.getDoc(fs.doc(db, 'convites', id))
      if (!conv.exists()) throw new FalhaDaNuvem('sem-convite')

      const c = conv.data()
      const cadastro: Cadastro = {
        uid,
        nome: typeof c.nome === 'string' && c.nome.trim() !== '' ? c.nome : '',
        papel: papelDe(c.papel),
        academiaId: typeof c.academiaId === 'string' ? c.academiaId : minhaAcademia,
        ativo: true,
        // Convite antigo nao tem turma, e as regras comparam com `get('turma','')`
        // dos dois lados — entao '' aqui e o unico valor que elas aceitam.
        turma: typeof c.turma === 'string' ? c.turma : SEM_TURMA,
        meta: typeof c.meta === 'string' ? c.meta : SEM_META,
        estuda:
          typeof c.estuda === 'string'
            ? c.estuda
            : typeof c.meta === 'string'
              ? c.meta
              : SEM_META,
        temParticulares: c.temParticulares === true,
        demo: c.demo === true,
      }

      // Papel, academia, TURMA e META vem DO CONVITE. As regras recusam outra coisa.
      await fs.setDoc(fs.doc(db, 'pessoas', uid), {
        nome: cadastro.nome,
        papel: cadastro.papel,
        academiaId: cadastro.academiaId,
        turma: cadastro.turma,
        meta: cadastro.meta,
        estuda: cadastro.estuda,
        temParticulares: cadastro.temParticulares,
        demo: cadastro.demo,
        ativo: true,
        criadoEm: new Date().toISOString(),
      })

      // Consome o convite. Se falhar, o cadastro JA existe — entao nao desfaz
      // nada: melhor um convite orfao (inutil, porque `pessoas/{uid}` ja existe
      // e nao pode ser criado duas vezes) do que a pessoa sem cadastro.
      try {
        await fs.deleteDoc(fs.doc(db, 'convites', id))
      } catch {
        // silencioso de proposito: ver acima
      }

      return cadastro
    },

    async convidar({ email, nome, papel, turma, meta, estuda }) {
      await fs.setDoc(fs.doc(db, 'convites', idDoEmail(email)), {
        nome: nome.trim(),
        papel,
        academiaId: minhaAcademia,
        turma,
        meta,
        estuda,
        convidadoEm: new Date().toISOString(),
      })
    },

    async listarConvites() {
      const q = await fs.getDocs(fs.collection(db, 'convites'))
      return q.docs.map((d) => {
        const x = d.data()
        return {
          email: d.id,
          nome: typeof x.nome === 'string' ? x.nome : '',
          papel: papelDe(x.papel),
          academiaId: typeof x.academiaId === 'string' ? x.academiaId : minhaAcademia,
          turma: typeof x.turma === 'string' ? x.turma : SEM_TURMA,
          meta: typeof x.meta === 'string' ? x.meta : SEM_META,
          estuda:
            typeof x.estuda === 'string'
              ? x.estuda
              : typeof x.meta === 'string'
                ? x.meta
                : SEM_META,
          convidadoEm: typeof x.convidadoEm === 'string' ? x.convidadoEm : '',
        } satisfies Convite
      })
    },

    async cancelarConvite(email) {
      await fs.deleteDoc(fs.doc(db, 'convites', idDoEmail(email)))
    },

    async listarPessoas() {
      const q = await fs.getDocs(fs.collection(db, 'pessoas'))
      return q.docs.map((d) => comoCadastro(d.id, d.data()))
    },

    async atualizarNome(uid, nome) {
      await fs.updateDoc(fs.doc(db, 'pessoas', uid), { nome: nome.trim() })
    },

    async atualizarTurma(uid, turma) {
      await fs.updateDoc(fs.doc(db, 'pessoas', uid), { turma })
    },

    async atualizarMeta(uid, meta) {
      await fs.updateDoc(fs.doc(db, 'pessoas', uid), { meta })
    },

    async atualizarEstuda(uid, estuda) {
      await fs.updateDoc(fs.doc(db, 'pessoas', uid), { estuda })
    },

    async atualizarParticulares(uid, tem) {
      await fs.updateDoc(fs.doc(db, 'pessoas', uid), { temParticulares: tem })
    },
  }
}
