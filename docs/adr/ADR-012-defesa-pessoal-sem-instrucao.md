# ADR-012 — Defesa Pessoal sem instrução textual

**Status:** Accepted · **Data:** 22/08/2026 · **Estende:** ADR-008 (conteúdo de risco)

## Contexto

O currículo tem 81 itens. Destes, 56 (Seções 4 e 5 — guardas e saídas) já tinham passo a
passo redigido em sessões anteriores, como *sugestão padrão de faixa azul* e com aviso de
não validação. Faltavam 25: Base e Movimentação (9), Quedas (5) e Defesa Pessoal (11).

O spec é explícito em duas direções que colidem aqui:

- §20: *"não invente conteúdo técnico de jiu-jitsu"*
- §1: o app deve organizar o estudo de todo o currículo
- §27 e RNF-06: defesa pessoal, quedas, estrangulamentos e finalizações devem ser
  *"tratados como material de revisão vinculado à demonstração supervisionada"*

Defesa Pessoal é o grupo de maior risco: defesa de soco, de chute, de empurrão, de puxão
de cabelo e de enforcamento no chão. É também o conteúdo em que uma descrição textual
imprecisa tem a pior consequência — o aluno pode treinar sozinho um movimento errado
contra um golpe real.

## Decisão

- **Base e Movimentação (9)** e **Quedas (5)** recebem passo a passo. São movimentos
  padronizados, de baixo risco relativo, e o aluno pode treinar rolamento, ukemi e fuga
  de quadril sozinho em casa — o que atende ao cenário "em casa: executar fundamentos".
- **Defesa Pessoal (11)** entra apenas como **item de currículo**: nome, aviso de
  supervisão obrigatória e `validationStatus: 'aguardando_validacao'`. Sem `passos`.
- Os cartões desses 11 itens ficam restritos a reconhecimento ("quais defesas a prova
  exige?"), nunca a execução.

## Consequências

**Positivas:** o app não ensina defesa contra golpes por texto; o aviso empurra o aluno
para a aula presencial, que é onde esse conteúdo deve ser aprendido.

**Negativas:** 11 itens da prova ficam sem material de estudo no app — é uma lacuna real
de cobertura, e o aluno depende inteiramente das aulas para eles. A lacuna está
documentada como risco no INVENTARIO.

**Revisar quando:** o Prof. João Eduardo fornecer o protocolo de defesa pessoal da
academia. Nesse caso o conteúdo entra com `validationStatus: 'validado_pelo_professor'`,
que é o único estado em que instrução de risco deve existir no app.
