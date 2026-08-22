# ADR-013 — Triagem das ferramentas já construídas

**Status:** Accepted · **Data:** 22/08/2026

## Contexto

O spec foi escrito como se o projeto fosse greenfield, mas já existiam 7 ferramentas em
`watcher/prova-azul-jiujitsu/`, construídas e aprovadas em sessões anteriores:

`index.html` (app com 7 abas) · `apostila.html` · `calendario-v2.html` ·
`calendario-v3.html` · `mapa-mental.html` (árvore) · `mapa-mental-classico.html`
(organograma) · `mapa-mental-compartilhar.html` (publicado)

A arquitetura de informação do spec (§8.1) é *Hoje, Currículo, Simulado, Progresso,
Dúvidas, Configurações* — e **não contém** cronograma, 10 aulas, mapa mental, apostila,
diário nem vídeos. Implementar o spec ao pé da letra seria **regressão de produto**.

Também havia redundância latente: `index.html` tem checklist, teoria e diário, que o app
novo também terá — dois lugares com progressos que não conversam.

## Decisão

**Absorvidos pelo app** (a PWA faz melhor, com scheduler e validação integrados):
checklist de técnicas → Currículo · flashcards de teoria → cartões · diário → Registro de
treino · vídeos salvos · 10 aulas particulares · cronograma → calendário de RF-09.

**Portados para dentro do app:** as **duas** visualizações do mapa mental — a árvore
(vira a tela Currículo, que ela já prototipava) e o organograma horizontal (segundo modo
de visualização, "ver o todo"). O algoritmo de layout já está resolvido e testado.

**Mantidos como arquivos estáticos ao lado:** `apostila.html` (impressão) e
`calendario-v3.html` (referência), publicados junto da PWA no mesmo host.

**Aposentados:** `index.html` (funções absorvidas, com migração do `localStorage`
`prova_azul_v1`), `calendario-v2.html` (superado pelo v3) e
`mapa-mental-compartilhar.html` (a PWA hospedada assume o papel de link para o mestre).

## Consequências

**Positivas:** nada que o aluno aprovou é perdido; a redundância de progresso é eliminada;
o esforço de porte fica restrito ao que tem valor único.

**Negativas:** portar as duas visualizações custa cerca de meio a um dia de trabalho a
mais do que mantê-las como arquivos separados. A migração do `localStorage` antigo precisa
ser feita sem perder dados (o histórico antigo não é append-only, então entra como estado
inicial, sem eventos retroativos).

**Revisar quando:** o porte de alguma visualização se mostrar mais caro que o previsto —
nesse caso ela volta a ser arquivo estático ao lado, sem prejuízo funcional.
