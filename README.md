# Faixa Azul

Treinador de recuperação ativa para a prova de graduação da faixa azul — Academia Rilion
Gracie Garopaba.

Não é uma biblioteca de vídeos nem um app de pontos: pede que você **tente lembrar antes
de consultar**, distribui as revisões ao longo do tempo e mostra onde estão suas lacunas.

> ⚠️ O professor é a autoridade técnica. O app organiza o estudo; **ele** define nomes,
> variações, critérios de execução, pontuação e o que de fato cai na prova. Todo conteúdo
> não validado aparece marcado como tal.

## Abrir o app

**<https://thallesbrq.github.io/faixa-azul-app/>**

Funciona offline depois da primeira visita e pode ser instalado na tela inicial do celular
(no iPhone: Compartilhar → Adicionar à Tela de Início). O progresso fica salvo **no
aparelho**, não em servidor — cada celular tem o seu, e nada é enviado para lugar nenhum.

## Os três eixos

O app nunca resume o preparo a um número só, porque três coisas diferentes precisam ser
verdade ao mesmo tempo — e uma pode esconder a falta das outras:

| Eixo | Pergunta | Onde se move |
|------|----------|--------------|
| **Domínio** | eu lembro os passos? | estudo sozinho (ter/qui/sex) |
| **Validado** | o professor aprovou esta versão? | aula particular |
| **Funciona** | sai contra alguém resistindo? | rolamento (seg/qua) |

Recuperar de memória uma técnica que o professor nunca viu pode ser decorar a versão
errada. E dominar mais validar ainda não é conseguir aplicar.

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

**Fatias 0 e 1 concluídas** — 68 testes passando.

- **Fatia 0:** fundação, modelo de domínio e scheduler, com um teste de propriedade que
  garante que **nenhum cartão vence depois da prova** ([ADR-011](docs/adr/ADR-011-horizonte-de-prova.md))
- **Fatia 1:** currículo de 81 itens, **215 cartões** gerados (≈17 revisões/dia em 63
  dias) e 10 aulas particulares com circuito de validação

Próximas fatias: fila diária e tela de revisão (2), currículo e dúvidas (3), simulado e
progresso (4), registro de treino e aulas (5), deploy e migração (6).

## Números do baralho

| Tipo de cartão | Quantidade |
|---|---|
| Explicação (recordação livre / oral) | 71 |
| Sequência (ordenar etapas) | 70 |
| Classificação (raspagem/passagem/finalização…) | 56 |
| Requisito ("quantas a prova exige?") | 10 |
| Teoria (valores, história, pontuação) | 8 |
| **Total** | **215** |

Os tipos *erro comum*, *gatilho* e *cadeia de reação* do spec §11 **não** são gerados: o
spec proíbe inventar esse conteúdo, e a ausência dele virou pergunta ao professor.

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
