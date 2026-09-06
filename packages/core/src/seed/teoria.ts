/**
 * Cartoes de teoria (valores, filosofia, historia, pontuacao, juramento).
 *
 * GERADO por scripts/importar-legado.mjs a partir dos flashcards construidos
 * antes. Os `validationStatus` seguem o spec 12: apenas os 5 valores eticos
 * vem literalmente do PDF; historia, biografia e pontuacao ficam aguardando
 * confirmacao do professor.
 */

import type { Card } from '../domain/types'

export const CARTOES_TEORIA: Card[] = [
  {
    "id": "teoria-1",
    "type": "teoria",
    "prompt": "Quais os 5 valores éticos que são pilares da Rilion Gracie Garopaba?",
    "resposta": [
      "Respeito · Lealdade · Amizade · Amor · Humildade."
    ],
    "validationStatus": "validado_pelo_professor",
    "ativo": true
  },
  {
    "id": "teoria-2",
    "type": "teoria",
    "prompt": "Os ensinamentos aprendidos no tatame devem ficar apenas dentro dele? Por quê?",
    "resposta": [
      "Não. Os princípios do tatame — respeito, disciplina, humildade, autocontrole e superação — devem ser levados para toda a vida: em casa, no trabalho e nas relações. O Jiu-Jitsu forma o caráter, não só o lutador."
    ],
    "validationStatus": "aguardando_validacao",
    "ativo": true
  },
  {
    "id": "teoria-3",
    "type": "teoria",
    "prompt": "Ao me graduar, devo subestimar ou desrespeitar os menos graduados? Tenho compromisso de ajudá-los?",
    "resposta": [
      "Não devo subestimar nem desrespeitar ninguém. Com a graduação vem mais responsabilidade: ter humildade e o compromisso de ajudar os menos graduados a evoluir, sendo exemplo dentro e fora do tatame."
    ],
    "validationStatus": "aguardando_validacao",
    "ativo": true
  },
  {
    "id": "teoria-4",
    "type": "teoria",
    "prompt": "O Jiu-Jitsu deve ser usado como defesa pessoal quando eu quiser? Explique.",
    "resposta": [
      "Não. Só deve ser usado em legítima defesa — para proteger a si mesmo ou a alguém em perigo real. Nunca para agredir, intimidar, exibir-se ou provocar. O verdadeiro praticante usa a arte para evitar o conflito."
    ],
    "validationStatus": "aguardando_validacao",
    "ativo": true
  },
  {
    "id": "teoria-5",
    "type": "teoria",
    "prompt": "História do Jiu-Jitsu no Brasil e a família Gracie.",
    "resposta": [
      "O japonês Mitsuyo Maeda (Conde Koma) trouxe o judô/jiu-jitsu ao Brasil e ensinou Carlos Gracie. Carlos, com seus irmãos (entre eles Hélio Gracie), adaptou a arte para vencer oponentes maiores usando alavanca e técnica no solo — nascendo o Jiu-Jitsu brasileiro (Gracie Jiu-Jitsu), difundido pelo mundo."
    ],
    "validationStatus": "aguardando_validacao",
    "ativo": true
  },
  {
    "id": "teoria-6",
    "type": "teoria",
    "prompt": "Quem é Rilion Gracie e quem é seu pai?",
    "resposta": [
      "Rilion Gracie é um dos mestres da família Gracie, reconhecido pelo jiu-jitsu técnico e voltado à defesa pessoal. Seu pai é Carlos Gracie, um dos fundadores do Jiu-Jitsu brasileiro. (Confirme detalhes com seu professor João Eduardo.)"
    ],
    "validationStatus": "aguardando_validacao",
    "ativo": true
  },
  {
    "id": "teoria-7",
    "type": "teoria",
    "prompt": "Pontuação — quantos pontos vale cada posição?",
    "resposta": [
      "Referência (padrão IBJJF — confirme com a academia):",
      "• Queda: 2",
      "• Raspagem: 2",
      "• Passagem de guarda: 3",
      "• Montada: 4",
      "• Pegada nas costas (com ganchos): 4",
      "• Joelho na barriga: 2"
    ],
    "validationStatus": "aguardando_validacao",
    "ativo": true
  },
  {
    "id": "teoria-8",
    "type": "teoria",
    "prompt": "Recite o Juramento da faixa.",
    "resposta": [
      "Prometo honrar e ser leal ao meu mestre, à família Rilion Gracie e aos irmãos de tatame. Prometo levar todos os ensinamentos do tatame comigo para sempre disseminar o bem. Prometo sempre representar da melhor forma a bandeira do Jiu-Jitsu por onde andar. Oss!"
    ],
    "validationStatus": "aguardando_validacao",
    "ativo": true
  }
]
