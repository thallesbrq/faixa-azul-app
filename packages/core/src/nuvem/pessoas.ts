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
import type { Origem } from '../domain/procedencia'
import { FalhaDaNuvem } from './cliente'

export interface Cadastro {
  uid: string
  nome: string
  papel: Origem
  academiaId: string
  ativo: boolean
}

export interface Convite {
  email: string
  nome: string
  papel: Origem
  academiaId: string
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
  convidar(entrada: { email: string; nome: string; papel: Origem }): Promise<void>
  listarConvites(): Promise<Convite[]>
  cancelarConvite(email: string): Promise<void>
  listarPessoas(): Promise<Cadastro[]>
  atualizarNome(uid: string, nome: string): Promise<void>
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
    papel: d.papel === 'professor' ? 'professor' : 'aluno',
    academiaId: typeof d.academiaId === 'string' ? d.academiaId : minhaAcademia,
    ativo: d.ativo === true,
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
        papel: c.papel === 'professor' ? 'professor' : 'aluno',
        academiaId: typeof c.academiaId === 'string' ? c.academiaId : minhaAcademia,
        ativo: true,
      }

      // Papel e academia vem DO CONVITE. As regras recusariam outra coisa.
      await fs.setDoc(fs.doc(db, 'pessoas', uid), {
        nome: cadastro.nome,
        papel: cadastro.papel,
        academiaId: cadastro.academiaId,
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

    async convidar({ email, nome, papel }) {
      await fs.setDoc(fs.doc(db, 'convites', idDoEmail(email)), {
        nome: nome.trim(),
        papel,
        academiaId: minhaAcademia,
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
          papel: x.papel === 'professor' ? 'professor' : 'aluno',
          academiaId: typeof x.academiaId === 'string' ? x.academiaId : minhaAcademia,
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
  }
}
