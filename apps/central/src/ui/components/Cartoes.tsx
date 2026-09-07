/**
 * Os seis cartoes do topo.
 *
 * O CALCULO NAO ESTA AQUI: vem de `cartoesDaTurma` (application/central), que
 * tem teste. Este arquivo so desenha — inclusive a decisao de quantos cartoes
 * existem, que segue os grupos ativos do curriculo.
 *
 * FRACAO GANHA MEDIDOR, CONTAGEM NAO. Uma barra sob "Aguardando sua validacao:
 * 7" precisaria de um maximo, e nao existe maximo para fila de trabalho —
 * desenhar um inventaria uma meta que ninguem definiu.
 */

import type { CartaoDaCentral } from '@faixa-azul/core/application/central'
import { corDaFaixa, numero, porcento } from '../formato'

export function Cartoes({ cartoes }: { cartoes: CartaoDaCentral[] }) {
  return (
    <div className="cartoes">
      {cartoes.map((c) => (
        <div className="kpi" key={c.chave}>
          <div className="kpi-rotulo">{c.rotulo}</div>
          <div className="kpi-valor" style={{ color: corDaFaixa(c.faixa) }}>
            {c.formato === 'fracao' ? porcento(c.valor) : numero(c.valor)}
          </div>
          {c.formato === 'fracao' && (
            <div className="medidor">
              <i
                style={{
                  width: `${Math.round((c.valor ?? 0) * 100)}%`,
                  background: corDaFaixa(c.faixa),
                }}
              />
            </div>
          )}
          <div className="kpi-apoio">{c.apoio}</div>
        </div>
      ))}
    </div>
  )
}
