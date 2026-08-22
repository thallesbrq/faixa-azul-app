/**
 * Shell da Fatia 0. As telas reais (Hoje, Revisao, Curriculo, Simulado,
 * Progresso, Duvidas, Aulas) entram nas fatias seguintes.
 */

import { capPorHorizonte, diasAteProva } from '../domain/scheduler'

// Meta provisoria: o professor ainda nao marcou a prova. A UI deixa isso
// explicito e o valor sera editavel em Configuracoes (Fatia 6).
const META_PROVISORIA = '2026-10-24T12:00:00.000Z'

export function App() {
  const agora = new Date()
  const dias = diasAteProva(agora, META_PROVISORIA)

  return (
    <main
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: 'calc(var(--espacamento-base) * 3)',
      }}
    >
      <header style={{ marginBottom: 'calc(var(--espacamento-base) * 3)' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--azul-faixa)' }}>Faixa Azul</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--cor-texto-suave)', fontSize: '0.9rem' }}>
          Academia Rilion Gracie Garopaba
        </p>
      </header>

      <section
        style={{
          background: 'var(--cor-superficie)',
          border: '1px solid var(--cor-borda)',
          borderRadius: 'var(--raio-card)',
          padding: 'calc(var(--espacamento-base) * 2)',
        }}
      >
        <p style={{ margin: 0, fontSize: '2rem', fontWeight: 700, color: 'var(--azul-faixa)' }}>
          {dias} dias
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--cor-texto-suave)' }}>
          até a meta <strong>provisória</strong> — o professor ainda não marcou a data
        </p>
        <p
          style={{
            margin: 'calc(var(--espacamento-base) * 2) 0 0',
            fontSize: '0.85rem',
            color: 'var(--cor-texto-suave)',
          }}
        >
          Intervalo máximo de revisão hoje: <strong>{capPorHorizonte(dias)} dias</strong> — nenhum
          cartão pode vencer depois da prova.
        </p>
      </section>

      <p
        style={{
          marginTop: 'calc(var(--espacamento-base) * 3)',
          fontSize: '0.8rem',
          color: 'var(--cor-texto-suave)',
        }}
      >
        Fatia 0 concluída: fundação, domínio e scheduler testado. As telas entram nas próximas
        fatias.
      </p>
    </main>
  )
}
