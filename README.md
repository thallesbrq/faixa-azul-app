# Faixa Azul

Treinador de recuperação ativa para a prova de graduação da faixa azul — Academia Rilion
Gracie Garopaba.

Não é uma biblioteca de vídeos nem um app de pontos: pede que você **tente lembrar antes
de consultar**, distribui as revisões ao longo do tempo e mostra onde estão suas lacunas.

> ⚠️ O professor é a autoridade técnica. O app organiza o estudo; **ele** define nomes,
> variações, critérios de execução, pontuação e o que de fato cai na prova. Todo conteúdo
> não validado aparece marcado como tal.

## Como executar

```bash
npm install
npm run dev
```

## Como testar

```bash
npm test           # roda uma vez
npm run test:watch # modo observação
npm run lint
npm run build      # tsc + build de produção (gera service worker e manifest)
```

## Estrutura

```
src/
  domain/       regras e tipos — NÃO importa React (spec §13)
  application/  casos de uso
  persistence/  repositórios (localStorage)
  seed/         currículo versionado
  ui/           telas e componentes
docs/
  INVENTARIO.md  requisitos, decisões e ambiguidades em aberto
  adr/           registros de decisão arquitetural
```

O domínio é puro e testável: o scheduler não faz I/O e recebe o `agora` por parâmetro,
para que os testes sejam determinísticos.

## Estado atual

**Fatia 0 concluída** — fundação, modelo de domínio e scheduler com 24 testes passando,
incluindo um teste de propriedade que garante que **nenhum cartão vence depois da prova**
(ADR-011).

Próximas fatias: seed do currículo e geração de cartões (1), fila diária e tela de revisão
(2), currículo e dúvidas (3), simulado e progresso (4), registro de treino e 10 aulas (5),
deploy e migração (6).

## Seed do currículo

O seed nasce dos 81 itens já mapeados do PDF da prova. Dos 81:

- **56** (Seções 4 e 5 — guardas e saídas) têm passo a passo, marcado como *sugestão não
  validada*
- **14** (Base e Movimentação, Quedas) recebem passo a passo na Fatia 1
- **11** (Defesa Pessoal) entram apenas como referência com aviso de supervisão — ver
  [ADR-012](docs/adr/ADR-012-defesa-pessoal-sem-instrucao.md)

Campos que o app deliberadamente **não** preenche (gatilho, erros comuns, cadeias de
reação) viram automaticamente perguntas ao professor, para serem levadas às 10 aulas
particulares.

## Documentos

- [INVENTARIO.md](docs/INVENTARIO.md) — decisões, escopo, cortes e as 10 ambiguidades
  pendentes de confirmação
- [ADRs](docs/adr/README.md) — inclui as revisões dos ADRs do spec e 4 decisões novas
