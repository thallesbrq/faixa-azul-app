/**
 * Abstracao de armazenamento.
 *
 * Existe para que os casos de uso sejam testados sem navegador e para que trocar
 * localStorage por outra coisa (IndexedDB, arquivo, servidor) nao toque em regra
 * de negocio.
 */

export interface Deposito {
  ler(chave: string): string | null
  escrever(chave: string, valor: string): void
  remover(chave: string): void
}

/** Deposito em memoria — usado nos testes. */
export function depositoEmMemoria(inicial: Record<string, string> = {}): Deposito {
  const mapa = new Map(Object.entries(inicial))
  return {
    ler: (c) => mapa.get(c) ?? null,
    escrever: (c, v) => void mapa.set(c, v),
    remover: (c) => void mapa.delete(c),
  }
}

/**
 * Deposito do navegador. Devolve `null` quando localStorage nao esta disponivel
 * (modo privado em alguns navegadores, storage cheio, iframe restrito) — o
 * chamador decide o que fazer em vez de o app quebrar na inicializacao.
 */
export function depositoLocalStorage(): Deposito | null {
  try {
    const sonda = '__faixa_azul_sonda__'
    window.localStorage.setItem(sonda, '1')
    window.localStorage.removeItem(sonda)
  } catch {
    return null
  }

  return {
    ler: (c) => window.localStorage.getItem(c),
    escrever: (c, v) => window.localStorage.setItem(c, v),
    remover: (c) => window.localStorage.removeItem(c),
  }
}
