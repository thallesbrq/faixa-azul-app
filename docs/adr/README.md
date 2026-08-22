# ADRs

Registros de decisão arquitetural. Os ADRs 001–010 vêm do spec (§15); abaixo estão
as **revisões** e as decisões **novas** tomadas no planejamento e na implementação.

## Revisões dos ADRs do spec

| ADR | Original no spec | Revisão | Motivo |
|---|---|---|---|
| **001** | PWA local-first, sincronização depois | PWA **hospedada** com service worker | O mestre precisa de URL para revisar; celular precisa de ícone e storage confiável |
| **004** | Scheduler simples no MVP, **FSRS depois** | FSRS **cortado do escopo** | Com ~9 semanas, intervalo adaptativo longo não tem onde rodar. Ver ADR-011 |
| **006** | Bilateralidade sempre separada | Schema pronto, **desligada por padrão** | O próprio spec §2.2 diz que o critério de lados **não foi confirmado** pelo professor. Ligar dobraria o volume diário sem base |

Mantidos sem alteração: **002** (currículo versionado + validação humana),
**003** (recuperação ativa antes da resposta), **005** (intercalação após
familiarização), **007** (gamificação leve), **008** (conteúdo de risco exige
supervisão), **009** (IA como assistente controlado — aqui: IA fora do produto),
**010** (histórico append-only).

## ADRs novos

| ADR | Decisão |
|---|---|
| [011](ADR-011-horizonte-de-prova.md) | Intervalos de revisão limitados pelo horizonte da prova |
| [012](ADR-012-defesa-pessoal-sem-instrucao.md) | Defesa Pessoal sem instrução textual |
| [013](ADR-013-ferramentas-existentes.md) | Triagem das ferramentas já construídas |
| [014](ADR-014-vite5-node21.md) | Vite 5 fixado por incompatibilidade do Node 21 |
