/**
 * Pauta das 10 aulas particulares — o motor de validacao do conteudo.
 *
 * GERADO por scripts/importar-legado.mjs. Agrupadas por familia de posicao (nao
 * por contagem), do jeito que uma aula particular flui: a cadeia de ataques de
 * uma guarda inteira em vez de tecnicas isoladas.
 *
 * Cada aula traz os itens a cobrir. As correcoes do professor sao registradas
 * fora daqui, em `ValidacaoDoProfessor` (src/domain/validacao.ts) — a unica
 * forma de um item chegar a "validado pelo professor".
 *
 * Estas 10 aulas cobrem apenas as Secoes 4 e 5. Os 25 itens de Fundamentos,
 * Defesa Pessoal e Quedas sao validados na aula regular de segunda e quarta
 * (origem 'aula_regular'), por decisao de planejamento.
 */

import type { AulaParticular } from '../domain/types'

export const AULAS: AulaParticular[] = [
  {
    "numero": 1,
    "tema": "Guarda Fechada — Ataques",
    "foco": "Raspadas e passagens da guarda fechada",
    "itemIds": [
      "guarda-fechada--raspada-1",
      "guarda-fechada--raspada-2",
      "guarda-fechada--passagem-simples",
      "guarda-fechada--passagem-quebrando-o-joelho"
    ]
  },
  {
    "numero": 2,
    "tema": "Guarda Fechada — Finalizações",
    "foco": "Cadeia completa de finalizações da guarda fechada",
    "itemIds": [
      "guarda-fechada--armlock",
      "guarda-fechada--triangulo",
      "guarda-fechada--omoplata",
      "guarda-fechada--estrangulamento-1",
      "guarda-fechada--estrangulamento-2",
      "guarda-fechada--estrangulamento-3",
      "guarda-fechada--esgrima-com-ida-para-as-costas"
    ]
  },
  {
    "numero": 3,
    "tema": "Meia-Guarda completa",
    "foco": "Raspadas, passagens e finalizações da meia-guarda",
    "itemIds": [
      "meia-guarda-tradicional-e-escudo--raspada-1",
      "meia-guarda-tradicional-e-escudo--raspada-2",
      "meia-guarda-tradicional-e-escudo--passagem-simples",
      "meia-guarda-tradicional-e-escudo--passagem-quebrando-o-joelho",
      "meia-guarda-tradicional-e-escudo--armlock",
      "meia-guarda-tradicional-e-escudo--triangulo",
      "meia-guarda-tradicional-e-escudo--estrangulamento",
      "meia-guarda-tradicional-e-escudo--esgrima-com-ida-para-as-costas"
    ]
  },
  {
    "numero": 4,
    "tema": "Guarda Gancho + Guarda Laço",
    "foco": "Duas guardas de base sentada",
    "itemIds": [
      "guarda-gancho--raspada-1",
      "guarda-gancho--raspada-2",
      "guarda-gancho--passagem",
      "guarda-gancho--finalizacao",
      "guarda-laco--raspada-1",
      "guarda-laco--raspada-2",
      "guarda-laco--passagem"
    ]
  },
  {
    "numero": 5,
    "tema": "Guarda Aranha completa",
    "foco": "Raspadas, passagem e as 2 finalizações da aranha",
    "itemIds": [
      "guarda-aranha--raspada-1",
      "guarda-aranha--raspada-2",
      "guarda-aranha--passagem",
      "guarda-aranha--finalizacao-omoplata",
      "guarda-aranha--finalizacao-triangulo"
    ]
  },
  {
    "numero": 6,
    "tema": "Guarda De La Riva completa",
    "foco": "Sit-up, ida às costas, passagem e finalizações",
    "itemIds": [
      "guarda-de-la-riva--raspada-1",
      "guarda-de-la-riva--raspada-2",
      "guarda-de-la-riva--passagem",
      "guarda-de-la-riva--finalizacao-1",
      "guarda-de-la-riva--finalizacao-2"
    ]
  },
  {
    "numero": 7,
    "tema": "Guarda Aberta completa",
    "foco": "Tripé, xícara e as 2 passagens",
    "itemIds": [
      "guarda-aberta--raspada-1",
      "guarda-aberta--raspada-2",
      "guarda-aberta--passagem-simples",
      "guarda-aberta--passagem-emborcando"
    ]
  },
  {
    "numero": 8,
    "tema": "Complexo Moderno",
    "foco": "One Leg, 50-50, Guarda X e Berimbolo — raspagem + passagem",
    "itemIds": [
      "guarda-one-leg-50-50-x-berimbolo--one-leg-raspagem",
      "guarda-one-leg-50-50-x-berimbolo--one-leg-passagem",
      "guarda-one-leg-50-50-x-berimbolo--50-50-raspagem",
      "guarda-one-leg-50-50-x-berimbolo--50-50-passagem",
      "guarda-one-leg-50-50-x-berimbolo--guarda-x-raspagem",
      "guarda-one-leg-50-50-x-berimbolo--guarda-x-passagem",
      "guarda-one-leg-50-50-x-berimbolo--berimbolo-execucao",
      "guarda-one-leg-50-50-x-berimbolo--berimbolo-passagem-defesa"
    ]
  },
  {
    "numero": 9,
    "tema": "Saídas I (ponto 5)",
    "foco": "Montada, costas e a 1ª saída dos 100 kg",
    "itemIds": [
      "saidas--saida-da-montada-1",
      "saidas--saida-da-montada-2",
      "saidas--saida-das-costas",
      "saidas--saida-dos-100-kg-1"
    ]
  },
  {
    "numero": 10,
    "tema": "Saídas II + Simulado final",
    "foco": "100 kg, norte-sul, defesas de armlock/triângulo — e rodar tudo",
    "itemIds": [
      "saidas--saida-dos-100-kg-2",
      "saidas--norte-sul",
      "saidas--armlock",
      "saidas--triangulo"
    ]
  }
]
