# @faixa-azul/core

Domínio, aplicação, persistência e seed. **Sem React, sem tela.**

Importado pelo app do aluno e (em breve) pela central do professor. É o que
impede o currículo de 56 itens e as regras de progresso de divergirem entre as
duas aplicações.

## Como importar

Os caminhos espelham as camadas de propósito — a camada fica visível em cada
import, e neste código a camada importa:

```ts
import { progressoPorItem } from '@faixa-azul/core/application/progresso'
import type { TechniqueItem } from '@faixa-azul/core/domain/types'
import { ITENS } from '@faixa-azul/core/seed'
```

## A regra de dependência

```
domain       não importa NADA          (1.606 linhas)
application  importa domain e persistence
persistence  importa domain            (nunca application)
```

`persistence/alunos.ts` já importou `application/torre` — inversão desfeita na
extração deste pacote movendo `ResumoDoAluno` para `domain/resumo.ts`. A forma
mora no domínio; o cálculo continua em `application/torre`.

## Testes

458 testes, rodados da raiz com `npm test`. Nenhum precisa de navegador.

**Cuidado conhecido:** o Vitest transpila sem checar tipo. Teste verde não
significa que compila — `npm run typecheck` é um portão separado, e já houve
commit quebrado por confiar só nos testes.
