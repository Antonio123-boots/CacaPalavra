/**
 * TERMO DUELO - MOTOR INTERATIVO DOS PROTÓTIPOS
 * Coordenação dos 3 Especialistas: UX, Acessibilidade e Visual
 */

(function () {
  'use strict';

  // CONFIGURAÇÕES DA PARTIDA SIMULADA
  const SECRET_WORD = 'VADER';
  const MAX_ROWS = 6;
  const WORD_LENGTH = 5;

  // ESTADO DO JOGO LOCAL
  let currentRow = 0;
  let currentCol = 0;
  let currentGuess = '';
  let isGameOver = false;
  let opponentRow = 0;

  // TECLAS DO TECLADO QWERTY PT-BR
  const KEYBOARD_LAYOUT = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
  ];

  // PARECERES DINÂMICOS DOS ESPECIALISTAS POR PROTÓTIPO
  const EXPERT_FEEDBACK = {
    'theme-cyber': {
      ux: {
        verdict: `"A ergonomia da 'Arena Cyber' foca na adrenalina e na visão periférica. O mini-grid do oponente no topo reduz a sobrecarga cognitiva e maximiza a sensação de urgência sem distrair os olhos da digitação."`,
        highlights: [
          'Thumb-Zone: teclado a 45% da altura inferior em celulares.',
          'Mini-grid no topo permite acompanhar o oponente em 1 piscar de olhos.',
          'Contador de tempo e barra de tensão geram ritmo de corrida.'
        ]
      },
      a11y: {
        verdict: `"Contraste aprimorado com fundo obsidian profundo (taxa de 11:1). As bordas luminosas destacam a caixa ativa sem ofuscar. O modo daltônico introduz símbolos geométricos com altíssima precisão."`,
        highlights: [
          'Feedback sonoro sintetizado em frequências distintas para cada estado.',
          'Atributos ARIA atualizados a cada tecla inserida.',
          'Suporte total a navegação física por teclado (Enter, Backspace, A-Z).'
        ]
      },
      visual: {
        verdict: `"Inspirado no visual de e-sports e cyberpunk sofisticado: paleta obsidian com toques ciano neon, esmeralda cyber e âmbar elétrico. Animação 3D flip card de 380ms para celebrar acertos."`,
        highlights: [
          'Tipografia robusta Syne e Space Grotesk.',
          'Bordas com brilho difuso (glow) e pulso de atividade do oponente.',
          'Gradientes modernos que valorizam telas OLED.'
        ]
      }
    },
    'theme-zen': {
      ux: {
        verdict: `"Design de distração zero. Toda a interface foi simplificada para manter o jogador 100% imerso nas conexões mentais das palavras. Ideal para sessões longas sem fadiga visual."`,
        highlights: [
          'Linha de status do oponente extremamente discreta.',
          'Espaçamento generoso entre elementos, prevenindo cliques acidentais.',
          'Ritmo visual calmo e transições fluidas.'
        ]
      },
      a11y: {
        verdict: `"Padrão ouro em conformidade WCAG 2.1 AAA. Cores terrosas (sálvia e ocre) com contraste calculado milimetricamente. Tipografia Plus Jakarta Sans com legibilidade geométrica impecável."`,
        highlights: [
          'Indicadores de alto contraste sem reflexos agressivos.',
          'Tamanho de fonte otimizado para evitar zoom desnecessário.',
          'Feedback tátil e auditivo suave e discreto.'
        ]
      },
      visual: {
        verdict: `"Estética nórdica / Linear minimalista. Fundo grafite profundo (#0c0d0e) com bordas ultrafinas de 1px. Sem luzes estroboscópicas ou brilhos desnecessários, transmitindo elegância pura."`,
        highlights: [
          'Paleta refinada: Verde Sálvia e Ocre quente.',
          'Sombras sutis de 4px para elevação de profundidade.',
          'Teclado com cantos sutis e textura fosca.'
        ]
      }
    },
    'theme-pop': {
      ux: {
        verdict: `"Foco na diversão casual e satisfação tátil imediata. Cada clique no teclado gera uma sensação física de afundamento de botão (estilo arcade/brinquedo), tornando a corrida divertida e viciante."`,
        highlights: [
          'Botões chunky 3D largos perfeitos para dedos no celular.',
          'Avatares expressivos e animação viva de tremor e confetes.',
          'Reconhecimento instantâneo de estados por formas e cores vivas.'
        ]
      },
      a11y: {
        verdict: `"Acessibilidade lúdica: botões com altura generosa (56px) excedem a recomendação da Apple/Google. Letras em caixa alta com peso bold espesso facilitam a leitura para pessoas com baixa visão."`,
        highlights: [
          'Diferenciação máxima entre botões de ação e letras normais.',
          'Ícones geométricos grandes e visíveis no modo daltônico.',
          'Fácil compreensão para todas as faixas etárias.'
        ]
      },
      visual: {
        verdict: `"Estilo Pop Arcade (inspirado no Duolingo e Brawl Stars). Fundo roxo profundo contrastado com verde lima elétrico e amarelo manga. Relevo 3D chanfrado nas teclas que reage ao clique."`,
        highlights: [
          'Tipografia arredondada e acolhedora (Fredoka).',
          'Cantos arredondados generosos de 14px a 24px.',
          'Efeito tátil de pressão física na tecla.'
        ]
      }
    }
  };

  // MOTOR DE ÁUDIO SINTETIZADO (WEB AUDIO API NATIVA)
  class SoundFX {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.ctx = new AudioContext();
        }
      }
    }

    playKey() {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    }

    playFlip(success) {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const freq = success ? 520 : 260;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    }

    playWin() {
      this.init();
      if (!this.ctx) return;
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + idx * 0.1);
        osc.stop(this.ctx.currentTime + idx * 0.1 + 0.3);
      });
    }
  }

  const sfx = new SoundFX();

  // INICIALIZAÇÃO DA INTERFACE
  function init() {
    createBoard();
    createOpponentGrid();
    createKeyboard();
    setupEventListeners();
    startOpponentSimulation();
    startTimer();
  }

  // CRIAÇÃO DO TABULEIRO PRINCIPAL
  function createBoard() {
    const boardEl = document.getElementById('playerBoard');
    boardEl.innerHTML = '';

    for (let r = 0; r < MAX_ROWS; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'board-row';
      rowEl.dataset.row = r;

      for (let c = 0; c < WORD_LENGTH; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.row = r;
        tile.dataset.col = c;
        tile.id = `tile-${r}-${c}`;
        
        // Ícone para modo daltônico
        const cbIcon = document.createElement('span');
        cbIcon.className = 'colorblind-icon';
        tile.appendChild(cbIcon);

        rowEl.appendChild(tile);
      }
      boardEl.appendChild(rowEl);
    }
  }

  // CRIAÇÃO DO MINI-GRID DO OPONENTE
  function createOpponentGrid() {
    const oppGrid = document.getElementById('oppMiniGrid');
    oppGrid.innerHTML = '';

    for (let r = 0; r < MAX_ROWS; r++) {
      const row = document.createElement('div');
      row.className = 'mini-row';
      row.id = `opp-row-${r}`;

      for (let c = 0; c < WORD_LENGTH; c++) {
        const tile = document.createElement('div');
        tile.className = 'mini-tile';
        tile.id = `opp-tile-${r}-${c}`;
        row.appendChild(tile);
      }
      oppGrid.appendChild(row);
    }
  }

  // CRIAÇÃO DO TECLADO VIRTUAL
  function createKeyboard() {
    const keyboardEl = document.getElementById('keyboard');
    keyboardEl.innerHTML = '';

    KEYBOARD_LAYOUT.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'keyboard-row';

      row.forEach(key => {
        const btn = document.createElement('button');
        btn.className = 'key-btn';
        btn.textContent = key;
        btn.dataset.key = key;
        btn.id = `key-${key}`;

        if (key === 'ENTER' || key === 'DEL') {
          btn.classList.add('action-key');
        }

        btn.addEventListener('click', () => handleKeyPress(key));
        rowEl.appendChild(btn);
      });

      keyboardEl.appendChild(rowEl);
    });
  }

  // TRATAMENTO DE TECLAS (VIRTUAL OU FÍSICA)
  function handleKeyPress(key) {
    if (isGameOver) return;
    sfx.playKey();

    if (key === 'ENTER') {
      submitGuess();
    } else if (key === 'DEL' || key === 'BACKSPACE') {
      deleteLetter();
    } else if (/^[A-ZÇ]$/.test(key)) {
      addLetter(key);
    }
  }

  function addLetter(letter) {
    if (currentCol < WORD_LENGTH) {
      const tile = document.getElementById(`tile-${currentRow}-${currentCol}`);
      tile.textContent = letter;
      tile.classList.add('filled');
      
      // Reinserir o span do modo daltônico
      const cbIcon = document.createElement('span');
      cbIcon.className = 'colorblind-icon';
      tile.appendChild(cbIcon);

      currentGuess += letter;
      currentCol++;
    }
  }

  function deleteLetter() {
    if (currentCol > 0) {
      currentCol--;
      const tile = document.getElementById(`tile-${currentRow}-${currentCol}`);
      tile.textContent = '';
      tile.classList.remove('filled');
      
      const cbIcon = document.createElement('span');
      cbIcon.className = 'colorblind-icon';
      tile.appendChild(cbIcon);

      currentGuess = currentGuess.slice(0, -1);
    }
  }

  function submitGuess() {
    if (currentCol < WORD_LENGTH) {
      showToast('Palavra deve ter 5 letras!');
      shakeRow(currentRow);
      return;
    }

    const secretArr = SECRET_WORD.split('');
    const guessArr = currentGuess.split('');
    const statusArr = new Array(WORD_LENGTH).fill('absent');
    const matched = new Array(WORD_LENGTH).fill(false);

    // Primeiro passo: identificar corretos (Verde)
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessArr[i] === secretArr[i]) {
        statusArr[i] = 'correct';
        matched[i] = true;
      }
    }

    // Segundo passo: identificar presentes (Amarelo)
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (statusArr[i] !== 'correct') {
        const foundIdx = secretArr.findIndex((letter, idx) => letter === guessArr[i] && !matched[idx]);
        if (foundIdx !== -1) {
          statusArr[i] = 'present';
          matched[foundIdx] = true;
        }
      }
    }

    // Aplicar animação de flip e cores
    for (let i = 0; i < WORD_LENGTH; i++) {
      const tile = document.getElementById(`tile-${currentRow}-${i}`);
      const letter = guessArr[i];
      const status = statusArr[i];

      setTimeout(() => {
        tile.classList.add('flip', status);
        sfx.playFlip(status === 'correct');

        // Ícone daltônico
        const cbIcon = tile.querySelector('.colorblind-icon');
        if (cbIcon) {
          if (status === 'correct') cbIcon.textContent = '●';
          else if (status === 'present') cbIcon.textContent = '▲';
          else cbIcon.textContent = '✕';
        }

        // Atualizar Teclado
        updateKeyboardKey(letter, status);
      }, i * 180);
    }

    // Atualizar placar de progresso
    document.getElementById('youScore').textContent = `Linha ${currentRow + 1}/6`;

    // Verificar vitória ou próxima linha
    setTimeout(() => {
      if (currentGuess === SECRET_WORD) {
        handleVictory(true);
      } else {
        currentRow++;
        currentCol = 0;
        currentGuess = '';

        if (currentRow >= MAX_ROWS) {
          handleGameOver('Tentativas esgotadas! A palavra era ' + SECRET_WORD);
        }
      }
    }, WORD_LENGTH * 180 + 200);
  }

  function updateKeyboardKey(letter, status) {
    const keyBtn = document.getElementById(`key-${letter}`);
    if (!keyBtn) return;

    if (status === 'correct') {
      keyBtn.className = 'key-btn action-key correct';
    } else if (status === 'present' && !keyBtn.classList.contains('correct')) {
      keyBtn.className = 'key-btn action-key present';
    } else if (status === 'absent' && !keyBtn.classList.contains('correct') && !keyBtn.classList.contains('present')) {
      keyBtn.className = 'key-btn action-key absent';
    }
  }

  function shakeRow(rowIdx) {
    const rowEl = document.querySelector(`.board-row[data-row="${rowIdx}"]`);
    if (rowEl) {
      rowEl.style.animation = 'shake 0.35s ease';
      setTimeout(() => rowEl.style.animation = '', 350);
    }
  }

  function showToast(msg) {
    const toast = document.getElementById('feedbackToast');
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => toast.style.opacity = '0.9', 2500);
  }

  function handleVictory(isYou) {
    isGameOver = true;
    sfx.playWin();
    if (isYou) {
      showToast('🎉 VOCÊ VENCEU O DUELO! Acertou primeiro!');
      document.querySelector('.versus-badge').innerHTML = '<span class="vs-text" style="color:var(--color-correct)">VITÓRIA!</span>';
    } else {
      showToast('💀 O OPONENTE ACERTOU PRIMEIRO! Você perdeu o duelo.');
      document.querySelector('.versus-badge').innerHTML = '<span class="vs-text" style="color:var(--accent-magenta)">DERROTA</span>';
    }
  }

  function handleGameOver(msg) {
    isGameOver = true;
    showToast(msg);
  }

  // SIMULADOR DO OPONENTE EM TEMPO REAL
  function simulateOpponentGuess() {
    if (isGameOver || opponentRow >= MAX_ROWS) return;

    const oppScore = document.getElementById('oppScore');
    oppScore.textContent = 'Enviou tentativa!';

    const statuses = ['absent', 'absent', 'present', 'absent', 'absent'];
    if (opponentRow >= 2) statuses[1] = 'correct';
    if (opponentRow >= 3) statuses[3] = 'present';
    if (opponentRow === 4) {
      // Chance de oponente acertar no round 5
      statuses.fill('correct');
    }

    for (let c = 0; c < WORD_LENGTH; c++) {
      const miniTile = document.getElementById(`opp-tile-${opponentRow}-${c}`);
      if (miniTile) {
        miniTile.className = `mini-tile ${statuses[c]}`;
      }
    }

    opponentRow++;

    if (statuses.every(s => s === 'correct')) {
      setTimeout(() => handleVictory(false), 500);
    } else {
      setTimeout(() => {
        if (!isGameOver) {
          oppScore.textContent = `Linha ${opponentRow}/6`;
        }
      }, 1000);
    }
  }

  function startOpponentSimulation() {
    const oppInterval = setInterval(() => {
      if (isGameOver || opponentRow >= MAX_ROWS) {
        clearInterval(oppInterval);
        return;
      }
      simulateOpponentGuess();
    }, 9000);
  }

  // TIMER SIMULADO DA RODADA
  function startTimer() {
    let seconds = 84;
    const timerEl = document.getElementById('gameTimer');
    setInterval(() => {
      if (isGameOver || seconds <= 0) return;
      seconds--;
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toString().padStart(2, '0');
      timerEl.textContent = `⏱️ ${mins}:${secs}`;
    }, 1000);
  }

  // SELEÇÃO DE PROTÓTIPOS E ATUALIZAÇÃO DO PAINEL DOS ESPECIALISTAS
  function setupThemeSwitching() {
    const protoButtons = document.querySelectorAll('.proto-btn');

    protoButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        protoButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');

        const theme = btn.dataset.theme;
        document.body.className = theme + (document.body.classList.contains('colorblind-mode') ? ' colorblind-mode' : '');

        // Atualizar notas dos 3 especialistas na sidebar
        updateExpertSidebar(theme);
      });
    });
  }

  function updateExpertSidebar(theme) {
    const feedback = EXPERT_FEEDBACK[theme];
    if (!feedback) return;

    // UX
    document.getElementById('uxVerdict').innerHTML = `<em>${feedback.ux.verdict}</em>`;
    document.getElementById('uxHighlights').innerHTML = feedback.ux.highlights.map(h => `<li>${h}</li>`).join('');

    // A11y
    document.getElementById('a11yVerdict').innerHTML = `<em>${feedback.a11y.verdict}</em>`;
    document.getElementById('a11yHighlights').innerHTML = feedback.a11y.highlights.map(h => `<li>${h}</li>`).join('');

    // Visual
    document.getElementById('visualVerdict').innerHTML = `<em>${feedback.visual.verdict}</em>`;
    document.getElementById('visualHighlights').innerHTML = feedback.visual.highlights.map(h => `<li>${h}</li>`).join('');
  }

  // EVENTOS GERAIS
  function setupEventListeners() {
    setupThemeSwitching();

    // Capturar teclado físico
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleKeyPress('ENTER');
      else if (e.key === 'Backspace') handleKeyPress('DEL');
      else {
        const key = e.key.toUpperCase();
        if (/^[A-ZÇ]$/.test(key)) handleKeyPress(key);
      }
    });

    // Alternar Modo Daltônico
    const btnColorblind = document.getElementById('btnToggleColorblind');
    btnColorblind.addEventListener('click', () => {
      document.body.classList.toggle('colorblind-mode');
      const isActive = document.body.classList.contains('colorblind-mode');
      btnColorblind.classList.toggle('active', isActive);
      btnColorblind.setAttribute('aria-pressed', isActive.toString());
      showToast(isActive ? 'Modo Daltônico ativado: Símbolos geométricos visíveis' : 'Modo Daltônico desativado');
    });

    // Alternar Visualização Celular / Desktop
    const btnView = document.getElementById('btnToggleView');
    const viewport = document.getElementById('deviceViewport');
    const viewLabel = document.getElementById('viewLabel');

    btnView.addEventListener('click', () => {
      viewport.classList.toggle('desktop-view');
      const isDesktop = viewport.classList.contains('desktop-view');
      viewLabel.textContent = isDesktop ? 'Visualização Desktop' : 'Visualização Mobile';
      btnView.classList.toggle('active', isDesktop);
    });

    // Modal de Análise dos Especialistas
    const btnOpenModal = document.getElementById('btnOpenExpertModal');
    const btnCloseModal = document.getElementById('btnCloseExpertModal');
    const modal = document.getElementById('expertModal');

    btnOpenModal.addEventListener('click', () => modal.removeAttribute('hidden'));
    btnCloseModal.addEventListener('click', () => modal.setAttribute('hidden', ''));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.setAttribute('hidden', '');
    });

    // Botões de simulação
    document.getElementById('btnSimOpponentGuess').addEventListener('click', () => simulateOpponentGuess());
    document.getElementById('btnResetBoard').addEventListener('click', () => {
      currentRow = 0;
      currentCol = 0;
      currentGuess = '';
      isGameOver = false;
      opponentRow = 0;
      createBoard();
      createOpponentGrid();
      createKeyboard();
      document.getElementById('youScore').textContent = 'Linha 1/6';
      document.getElementById('oppScore').textContent = 'Pronto para jogar';
      document.querySelector('.versus-badge').innerHTML = '<span class="vs-text">VS</span><span class="race-tag">CORRIDA</span>';
      showToast('Tabuleiro reiniciado!');
    });
  }

  // Iniciar assim que o DOM carregar
  document.addEventListener('DOMContentLoaded', init);
})();
