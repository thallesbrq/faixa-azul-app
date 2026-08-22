# ADR-011 — Intervalos de revisão limitados pelo horizonte da prova

**Status:** Accepted · **Data:** 22/08/2026

## Contexto

O scheduler da Fase 1 do spec (§10) tem uma escada de intervalos que chega a 30 dias
para itens dominados. Isso pressupõe um horizonte de estudo aberto — o caso do Anki,
onde o objetivo é retenção indefinida.

Aqui o horizonte é fechado e curto: a preparação tem cerca de 9 semanas. Um cartão que
recebesse 30 dias de intervalo no dia 10/10, faltando 14 dias para a prova, só voltaria
em 09/11 — **depois do exame**. O aluno nunca mais o revisaria, e o app não saberia que
deixou um item cair fora da preparação.

O spec §RF-09 já pedia uma "janela de taper/revisão final", mas não a conectava ao
scheduler.

## Decisão

O intervalo calculado é limitado por um teto derivado dos dias restantes:

- prova hoje ou já passada → **1 dia** (segue circulando, não congela)
- dentro dos últimos **10 dias** (taper) → teto de **2 dias**, e nunca maior que os dias
  que de fato restam
- caso geral → teto de **metade dos dias restantes**, garantindo espaço para pelo menos
  uma revisão adicional antes da prova

A regra é uma função pura (`capPorHorizonte`) e o `agora` é sempre injetado, para que os
testes sejam determinísticos.

## Consequências

**Positivas:** nenhum cartão vence depois da prova; o taper acontece automaticamente,
sem o aluno configurar nada; a preparação se adensa naturalmente conforme a data chega.

**Negativas:** os intervalos deixam de ser "ótimos" pela teoria de repetição espaçada
puramente — a prova passa a mandar mais que a curva de esquecimento. É a troca correta
para um horizonte fechado, mas significa que este scheduler **não serve** para estudo
contínuo depois da graduação sem revisão desta decisão.

**Revisar quando:** houver um horizonte aberto (estudo pós-graduação) ou quando a data
oficial da prova for confirmada e a meta provisória deixar de ser usada.

## Verificação

Existe um teste de propriedade que varre todos os cenários (1 a 70 dias restantes × 4
ratings × 0 a 5 acertos consecutivos × com e sem dica) e afirma que **nenhum intervalo
ultrapassa os dias restantes**.

Esse teste pegou um bug real na primeira execução: o teto do taper devolvia 2 dias
mesmo faltando 1 dia para a prova, o que jogaria o cartão para depois do exame — exatamente
a falha que este ADR existe para impedir.
