# Documento de Arquitetura e Projeto Técnico (TDD)
## Termo Duelo — Implementação 1v1 PWA (Design Arena Cyber)

**Projeto:** Termo Duelo  
**Versão:** 1.0  
**Design Base:** Protótipo 01 — Arena Cyber Duel (Esports / Neon Glassmorphism)  
**Autor:** Antigravity Engineering  
**Data:** 13 de Outubro de 2026  

---

## 1. Visão Geral da Arquitetura

O **Termo Duelo** é uma aplicação web em tempo real (PWA) orientada a eventos, com arquitetura cliente-servidor leve e independente de serviços em nuvem pagos.

```
+-------------------------------------------------------------------+
|                        CLIENTE A (PWA)                            |
|  - UI Cyber Duel (HTML/CSS)                                       |
|  - Game State Local (Tentativas, Linhas, Teclado)                 |
|  - Web Audio Synthesizer (SFX)                                    |
|  - Socket.io Client                                               |
+---------------------------------+---------------------------------+
                                  | WebSocket (Eventos Bidirecionais)
                                  v
+-------------------------------------------------------------------+
|                     SERVIDOR NODE.JS / EXPRESS                    |
|  - Room Manager (Salas privadas, códigos de 6 dígitos)            |
|  - Matchmaker Fila Rápida                                         |
|  - Árbitro da Corrida (Validação de vitória e anti-cheat)         |
|  - Dicionários Temáticos (Cinema, Esportes, Games, Geral)         |
|  - Static Asset Delivery (PWA Manifest & Service Worker)          |
+---------------------------------+---------------------------------+
                                  ^
                                  | WebSocket (Eventos Bidirecionais)
+---------------------------------+---------------------------------+
|                        CLIENTE B (PWA)                            |
|  - UI Cyber Duel (HTML/CSS)                                       |
|  - Mini-Grid do Oponente A em Tempo Real                          |
+-------------------------------------------------------------------+
```

---

## 2. Estrutura do Repositório e Arquivos

```
Termo2/
├── PRD.md                       # Requisitos do Produto
├── TECH_SPEC.md                 # Este documento de especificação técnica
├── package.json                 # Dependências e scripts npm
├── server/
│   ├── server.js                # Ponto de entrada Express + Socket.io
│   ├── roomManager.js           # Gerenciamento de ciclo de vida das salas
│   ├── gameEngine.js            # Validador de chutes e lógica de árbitro
│   └── words/                   # Bancos de palavras por categoria
│       ├── cinema.json
│       ├── esportes.json
│       ├── games.json
│       └── geral.json
└── public/
    ├── index.html               # Aplicação principal (Lobby + Arena)
    ├── css/
    │   ├── cyber-theme.css      # Sistema de design Arena Cyber (Neon/Glass)
    │   ├── animations.css       # 3D Flip, Shakes, Confetes, Pulso
    │   └── a11y.css             # Modos de alto contraste e daltônico
    ├── js/
    │   ├── app.js               # Orquestrador do frontend
    │   ├── socketClient.js      # Conexão e tratamento de eventos de rede
    │   ├── boardRenderer.js     # Renderizador do tabuleiro principal
    │   ├── opponentTracker.js   # Renderizador do mini-grid do oponente
    │   ├── virtualKeyboard.js   # Teclado interativo tátil e físico
    │   └── audioSynth.js        # Motor de áudio nativo (Web Audio API)
    ├── manifest.json            # Manifesto da PWA
    └── sw.js                    # Service Worker para cache offline
```

---

## 3. Protocolo de Comunicação & Máquina de Estados (Socket.io)

### 3.1 Máquina de Estados de uma Sala

```
[CRIADA / ESPERANDO] 
        │
        ├─ Jogador 2 conecta
        ▼
[CONTAGEM REGRESSIVA (3s)]
        │
        ├─ Timer expira -> Envia 'match-start'
        ▼
[EM CORRIDA (IN_RACE)] ◄─── (Troca de eventos 'opponent-progress')
        │
        ├─ Um jogador acerta a palavra (5 verdes)
        ├─ OU ambos esgotam 6 tentativas
        ├─ OU desconexão (W.O. após 15s)
        ▼
[FIM DE JOGO (GAME_OVER)]
        │
        ├─ Revanche aceita -> Reinicia para [CONTAGEM REGRESSIVA]
```

### 3.2 Tabela de Eventos Socket

| Evento | Origem | Destino | Payload | Descrição |
|---|---|---|---|---|
| `create-room` | Cliente | Servidor | `{ theme: string, nickname: string }` | Cria nova sala e devolve código de 6 dígitos. |
| `join-room` | Cliente | Servidor | `{ roomCode: string, nickname: string }` | Entra em sala existente por código ou link. |
| `matchmaking-join`| Cliente | Servidor | `{ theme: string, nickname: string }` | Entra na fila de partida rápida. |
| `match-start` | Servidor | Ambos | `{ wordLength: 5, theme: string, countdown: 3 }` | Inicia o duelo simultâneo com countdown. |
| `submit-guess` | Cliente | Servidor | `{ guess: string, row: number }` | Envia o palpite do jogador para validação. |
| `guess-result` | Servidor | Jogador | `{ row: number, result: Array<'correct'\|'present'\|'absent'> }` | Retorna o feedback de cores para o jogador local. |
| `opponent-progress`| Servidor | Adversário| `{ row: number, mask: Array<'correct'\|'present'\|'absent'> }` | Atualiza o mini-grid do oponente **sem letras**. |
| `match-won` | Servidor | Ambos | `{ winnerId: string, secretWord: string, reason: string }` | Finaliza a corrida com vitória imediata. |
| `player-left` | Servidor | Jogador | `{ message: string, wonByForfeit: boolean }` | Trata abandono ou desconexão do adversário. |

---

## 4. Segurança e Prevenção de Trapaças (Anti-Cheat)

1. **A Palavra Secreta Permanece no Servidor:**  
   Em hipótese alguma a palavra da rodada é enviada no payload inicial para o cliente (`match-start`).
2. **Validação Server-Side:**  
   O cliente envia o palpite (`submit-guess`). O servidor compara com a palavra secreta, calcula o array de estados (`correct`, `present`, `absent`) e devolve ao jogador.
3. **Mascaração para o Oponente:**  
   O oponente recebe apenas o array de estados (`opponent-progress`) para pintar os blocos do seu mini-grid. Ele nunca tem acesso às letras digitadas pelo adversário no tráfego de rede, eliminando qualquer possibilidade de inspecionar o DevTools para obter a resposta.
4. **Validação de Dicionário:**  
   O servidor rejeita tentativas com palavras inexistentes no dicionário, impedindo força bruta com combinações aleatórias de letras.

---

## 5. Implementação do Design 1 (Arena Cyber Duel)

### 5.1 Tokens CSS e Sistema de Cores (cyber-theme.css)

```css
:root {
  /* Superfícies e Profundidade */
  --cyber-bg: #07090e;
  --cyber-surface-card: rgba(15, 23, 42, 0.78);
  --cyber-surface-elevated: rgba(22, 33, 62, 0.90);
  --cyber-border: rgba(56, 189, 248, 0.22);
  --cyber-border-glow: 0 0 16px rgba(56, 189, 248, 0.35);

  /* Feedback do Jogo */
  --cyber-correct: #00e599;           /* Esmeralda Neon */
  --cyber-correct-glow: 0 0 14px rgba(0, 229, 153, 0.5);
  --cyber-present: #fbbf24;           /* Âmbar Elétrico */
  --cyber-present-glow: 0 0 14px rgba(251, 191, 36, 0.45);
  --cyber-absent: #1e293b;            /* Grafite Escuro */
  --cyber-absent-border: #334155;

  /* Luzes da Arena e Tensão */
  --cyber-cyan: #38bdf8;
  --cyber-magenta: #ec4899;
  --cyber-gradient: linear-gradient(135deg, #38bdf8, #818cf8);

  /* Tipografia */
  --font-display: 'Syne', sans-serif;
  --font-mono: 'Space Grotesk', sans-serif;
}
```

### 5.2 Microinterações Chave
* **3D Flip Card com Iluminação Traseira:**
  Ao validar uma linha, os blocos giram 180 graus no eixo X em cascata de 160ms por letra. No momento em que atingem 90 graus, a cor de fundo e a sombra de néon (`--cyber-correct-glow`) são aplicadas.
* **Radar de Pulso do Oponente:**
  O avatar do oponente e a barra de progresso emitem uma onda luminosa a cada letra que o adversário digita, transmitindo a urgência de uma corrida física.

---

## 6. Motor de Áudio Nativo (Web Audio API)

Para evitar latência ou dependência de carregamento de arquivos MP3 externos, todos os efeitos sonoros são gerados programaticamente via osciladores senoidais e triangulares:

```javascript
// audioSynth.js
export class CyberAudioEngine {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }
  playKeyClick() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }
  playCorrectLetter() {
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.18);
  }
}
```

---

## 7. Estratégia de PWA & Cache Offline (Service Worker)

* **Estratégia de Cache:** *Cache First, Network Fallback* para assets estáticos (HTML, CSS, JS, manifest, ícones, fontes locais).
* **Conexões WebSockets:** Bypass total de cache, conexão direta ao endpoint de Socket.io.
* **Manifesto PWA (`manifest.json`):**
  * `display: "standalone"`
  * `theme_color: "#07090e"`
  * `background_color: "#07090e"`
  * `orientation: "portrait-primary"`

---

## 8. Roteiro Passo a Passo de Execução

### Passo 1: Inicialização do Backend
* Criar `package.json` com dependências: `express`, `socket.io`.
* Criar `server/server.js` configurando servidor HTTP e WebSocket.
* Implementar `server/roomManager.js` com geração de códigos de sala (`ABC123`) e controle de estado dos jogadores.

### Passo 2: Bancos de Palavras & Árbitro de Regras
* Criar os arquivos JSON das 4 categorias (`cinema.json`, `esportes.json`, `games.json`, `geral.json`).
* Implementar função de sanitização (remover acentos para comparação, ex: `HERÓI` -> `HEROI`).
* Implementar `gameEngine.js` que avalia os palpites com algoritmo exato de Wordle (dupla contagem de letras repetidas resolvida com precisão).

### Passo 3: Frontend PWA — Arena Cyber
* Estruturar tela de **Lobby de Entrada** (Criar Sala / Entrar com Código / Partida Rápida).
* Estruturar a **Arena de Batalha**:
  * Placar superior com status VS e Mini-Grid do adversário.
  * Tabuleiro 6x5 do jogador com animações Cyber.
  * Teclado virtual reativo com modo daltônico integrado.

### Passo 4: Conexão em Tempo Real & Sincronização
* Integrar `socketClient.js` para escutar e emitir os eventos da corrida.
* Exibir tela de contagem regressiva 3, 2, 1 antes de liberar o teclado.
* Conectar o Mini-Grid do adversário aos eventos `opponent-progress`.

### Passo 5: Telas de Vitória, Derrota e Revanche
* Animação de vitória imediata com chuva de confetes cibernéticos na tela do vencedor.
* Revelação da palavra secreta na tela do derrotado com tempo de resposta do campeão.
* Botão *"Pedir Revanche"* para nova rodada imediata sem precisar recriar a sala.

### Passo 6: PWA & Homologação Local
* Adicionar `manifest.json` e `sw.js`.
* Testar com duas abas simultâneas no navegador simulando Jogador 1 vs Jogador 2.
