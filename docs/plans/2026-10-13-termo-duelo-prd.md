# PRD - Documento de Requisitos do Produto
## Termo Duelo (Corrida de Palavras 1v1 PWA)

**Versão:** 1.0  
**Status:** Aprovado para Desenvolvimento  
**Data:** 13 de Outubro de 2026  

---

## 1. Visão Geral e Proposta de Valor

### 1.1 Conceito do Produto
O **Termo Duelo** é um jogo casual de adivinhação de palavras multiplayer em tempo real, desenvolvido como Progressive Web App (PWA). O jogo adota a mecânica consagrada de adivinhação de 5 letras com feedback por cores (verde, amarelo e cinza), adaptada para um formato de **Corrida Pura 1v1**: dois jogadores competem simultaneamente pela mesma palavra secreta. Aquele que decifrar a palavra primeiro vence a partida.

### 1.2 Proposta de Valor
* **Atrito Zero:** Acesso instantâneo via navegador no celular ou desktop, instalável como app nativo com 1 clique (PWA).
* **Adrenalina Competitiva:** A tensão de ver o oponente preenchendo as linhas do mini-tabuleiro em tempo real cria urgência e competitividade.
* **Variedade Temática:** Partidas personalizadas por categorias (Filmes, Séries, Futebol, Cultura Pop, etc.), atraindo públicos diversos.

---

## 2. Personas e Cenários de Uso

* **Jogador Casual / Amigos:** Cria uma sala privada em segundos, copia o link para o WhatsApp e desafia um amigo durante uma pausa rápida no trabalho ou estudo.
* **Jogador Competitivo:** Entra na fila de matchmaking rápido para disputar partidas dinâmicas contra jogadores aleatórios.
* **Comunidades e Fãs Temáticos:** Jogadores que escolhem temas de nicho (ex: apenas nomes de filmes ou termos de games) para testar seus conhecimentos.

---

## 3. Arquitetura e Stack Tecnológica

Para garantir máxima simplicidade de implementação, zero dependência de contas de terceiros e baixíssima latência:

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Frontend** | HTML5, Vanilla CSS3, JavaScript (ES6+) | Máxima performance, controle estético total, zero sobrecarga de bundlers pesados. |
| **PWA** | Web App Manifest + Service Worker | Permite instalação na tela inicial (Android/iOS/PC) e carregamento instantâneo. |
| **Backend & Tempo Real** | Node.js + Express + Socket.io | A solução mais simples, confiável e rápida para salas e eventos bidirecionais síncronos. |
| **Hospedagem Recomendada** | Render, Railway ou Fly.io (Backend) / Vercel ou Netlify (Frontend) | Suporte nativo a WebSockets em tiers gratuitos ou de baixo custo. |

---

## 4. Dinâmica do Jogo: Regras da "Corrida Pura"

### 4.1 O Tabuleiro e as Tentativas
* Cada jogador possui seu próprio tabuleiro principal de **6 tentativas** com palavras de **5 letras**.
* O feedback segue a convenção clássica:
  * 🟩 **Verde:** Letra correta na posição exata.
  * 🟨 **Amarelo:** Letra existe na palavra, mas em outra posição.
  * ⬛ **Cinza:** Letra não faz parte da palavra.

### 4.2 A Corrida 1v1 em Tempo Real
1. **Palavra Idêntica:** Ambos os jogadores recebem exatamente a mesma palavra secreta ao início da rodada.
2. **Sincronização de Progresso (Mini-Grid do Oponente):**
   * Na lateral ou topo da tela, cada jogador visualiza o tabuleiro em miniatura do oponente.
   * **Privacidade Anti-Spoiler:** O mini-grid mostra apenas os blocos coloridos (verde, amarelo, cinza) ou blocos cinzas indicando que o oponente digitou, **sem revelar quais letras foram digitadas**.
3. **Condições de Vitória e Fim de Partida:**
   * **Vitória Imediata:** O primeiro jogador a acertar a palavra completa (5 verdes) vence na hora. O jogo encerra e exibe a tela de vitória/derrota com a palavra revelada.
   * **Derrota Mútua / Empate:** Se um jogador esgotar as 6 tentativas sem acertar, o outro continua jogando até acertar ou também esgotar as suas. Se ambos esgotarem, a partida empata.
   * **Desconexão / W.O.:** Se o oponente sair ou desconectar por mais de 15 segundos, a vitória é concedida ao jogador restante.

---

## 5. Funcionalidades Detalhadas (Escopo MVP)

### 5.1 Lobby e Matchmaking
1. **Criar Sala Privada:**
   * O anfitrião escolhe o **Tema da Partida**.
   * O sistema gera um código de 6 caracteres e um **Link Direto Compartilhável** (ex: `app.com/?sala=XYZ123`).
   * Botão de 1 toque: *"Copiar Link do Duelo"*.
2. **Entrar com Código:** Campo para digitar o código e ingressar em uma sala existente.
3. **Partida Rápida (Matchmaking Aleatório):** Fila automática que conecta dois jogadores procurando partida no mesmo tema (ou tema geral).

### 5.2 Módulo de Temas e Vocabulário
O jogo contará com bancos de palavras categorizados em arquivos JSON estruturados:
* 🎬 **Cinema & Séries:** Filmes, diretores, personagens famosos.
* ⚽ **Futebol & Esportes:** Times, craques, estádios, posições.
* 🎮 **Cultura Pop & Games:** Jogos, animes, franquias geek.
* 🧠 **Geral (Clássico):** Vocabulário amplo em português para quem prefere o estilo tradicional.
* *Validador de Entrada:* Aceita apenas palavras com 5 letras válidas na língua portuguesa / universo do tema.

### 5.3 Interface do Usuário (UI/UX)
* **Tema Visual:** Dark mode moderno, estética *Glassmorphism*, paleta refinada (contrastes suaves para verde e amarelo, preservando legibilidade).
* **Teclado Virtual Interativo:**
  * Teclas atualizam de cor conforme o jogador tenta as palavras.
  * Suporte total a toque na tela em dispositivos móveis e digitação física em teclados de computador.
  * Botões dedicados de `ENTER` e `DEL / BACKSPACE`.
* **Micro-Animações:**
  * Flip 3D das letras ao enviar a tentativa.
  * Efeito de tremor (*shake*) se a palavra for inválida ou incompleta.
  * Chuva de confetes na tela do vencedor e efeito de transição dramático ao término.

### 5.4 Progressive Web App (PWA)
* Arquivo `manifest.json` com ícones, tema de cores, orientação otimizada (retrato no celular).
* `sw.js` (Service Worker) para cache dos recursos estáticos (CSS, fontes, áudios, lógica do cliente).
* Prompt discreto para o usuário adicionar o jogo à tela inicial.

---

## 6. Arquitetura de Eventos do Socket (Tempo Real)

```
Cliente A                          Servidor                         Cliente B
    |                                 |                                 |
    |---- create-room(tema) --------->|                                 |
    |<--- room-created(code) ---------|                                 |
    |                                 |<--- join-room(code) ------------|
    |<=== match-start(word, tema) ====|<=== match-start(word, tema) ====|
    |                                 |                                 |
    |---- submit-guess(row, colors) ->|                                 |
    |                                 |-- opponent-guess(row, colors) ->|
    |                                 |                                 |
    |---- win-game ------------------>|                                 |
    |<=== game-over(winner: A) =======|<=== game-over(winner: A) =======|
```

* Os clientes enviam para o servidor apenas o resultado das cores da linha para atualizar o mini-tabuleiro do oponente, mantendo a latência mínima e o servidor leve.

---

## 7. Requisitos Não-Funcionais
* **Tempo de Resposta dos Eventos:** Menor que 100ms para atualização do mini-grid do oponente.
* **Compatibilidade:** Navegadores modernos (Chrome, Safari, Firefox, Edge) em Android, iOS, Windows e macOS.
* **Acessibilidade:** Suporte a contraste aprimorado para daltônicos (ícones ou texturas opcionais para verde/amarelo).

---

## 8. Próximos Passos & Fases de Entrega
1. **Fase 1 (Fundação & Core Gameplay):** Criação da estrutura de pastas, design system (CSS), lógica local do tabuleiro de 5 letras, teclado virtual e animações.
2. **Fase 2 (Servidor & Multiplayer Socket.io):** Backend Node.js, gerenciamento de salas, sincronização da corrida e mini-tabuleiro do oponente.
3. **Fase 3 (Categorias & Banco de Palavras):** Integração dos bancos temáticos de palavras e seletor no lobby.
4. **Fase 4 (PWA & Polimento):** Service worker, sons sutis, confetes de vitória e testes de partida simultânea.
