/**
 * TERMO DUELO - CLIENTE PRINCIPAL (ARENA CYBER 1v1 PWA)
 */
import { CyberAudioEngine } from './audioSynth.js';

// INICIALIZAÇÃO DE SERVIÇOS
const audio = new CyberAudioEngine();
const socket = io();

// ESTADO DO CLIENTE
const STATE = {
  nickname: 'Duelista',
  selectedTheme: 'geral',
  currentRoomCode: null,
  isHost: false,
  opponentNickname: 'Oponente',
  currentRow: 0,
  currentCol: 0,
  currentGuess: '',
  isLocked: true, // Bloqueado até o countdown terminar
  isGameOver: false,
  timerInterval: null,
  timerSeconds: 0,
  typingTimeout: null,
  colorblindMode: false
};

const MAX_ROWS = 6;
const WORD_LENGTH = 5;

const KEYBOARD_LAYOUT = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
];

// ELEMENTOS DOM
const DOM = {
  // Telas
  screenLobby: document.getElementById('screenLobby'),
  screenWaiting: document.getElementById('screenWaiting'),
  screenArena: document.getElementById('screenArena'),
  countdownOverlay: document.getElementById('countdownOverlay'),
  countdownNumber: document.getElementById('countdownNumber'),
  gameOverModal: document.getElementById('gameOverModal'),
  toastMsg: document.getElementById('toastMsg'),

  // Lobby
  inputNickname: document.getElementById('inputNickname'),
  themesGrid: document.getElementById('themesGrid'),
  btnCreateRoom: document.getElementById('btnCreateRoom'),
  btnQuickMatch: document.getElementById('btnQuickMatch'),
  inputRoomCode: document.getElementById('inputRoomCode'),
  btnJoinRoom: document.getElementById('btnJoinRoom'),

  // Aguardo / Lobby da Sala
  displayRoomCode: document.getElementById('displayRoomCode'),
  btnCopyInviteLink: document.getElementById('btnCopyInviteLink'),
  btnCancelWaiting: document.getElementById('btnCancelWaiting'),
  lobbyDuelistsGrid: document.getElementById('lobbyDuelistsGrid'),
  cardPlayer1: document.getElementById('cardPlayer1'),
  cardPlayer2: document.getElementById('cardPlayer2'),
  lobbyNick1: document.getElementById('lobbyNick1'),
  lobbyStatus1: document.getElementById('lobbyStatus1'),
  lobbyNick2: document.getElementById('lobbyNick2'),
  lobbyStatus2: document.getElementById('lobbyStatus2'),
  btnToggleReady: document.getElementById('btnToggleReady'),
  readyBtnLabel: document.getElementById('readyBtnLabel'),
  lobbyHelperText: document.getElementById('lobbyHelperText'),
  waitingSubTitle: document.getElementById('waitingSubTitle'),

  // Arena
  arenaCategoryTag: document.getElementById('arenaCategoryTag'),
  arenaRoundClock: document.getElementById('arenaRoundClock'),
  btnLeaveArena: document.getElementById('btnLeaveArena'),
  playerLocalNick: document.getElementById('playerLocalNick'),
  playerLocalState: document.getElementById('playerLocalState'),
  playerOppNick: document.getElementById('playerOppNick'),
  playerOppState: document.getElementById('playerOppState'),
  oppTypingPulse: document.getElementById('oppTypingPulse'),
  oppMiniGridContainer: document.getElementById('oppMiniGridContainer'),
  playerBoardGrid: document.getElementById('playerBoardGrid'),
  cyberKeyboard: document.getElementById('cyberKeyboard'),

  // Modal Game Over
  modalResultIcon: document.getElementById('modalResultIcon'),
  modalResultTitle: document.getElementById('modalResultTitle'),
  modalResultDesc: document.getElementById('modalResultDesc'),
  modalSecretWord: document.getElementById('modalSecretWord'),
  btnRequestRematch: document.getElementById('btnRequestRematch'),
  rematchBtnText: document.getElementById('rematchBtnText'),
  btnBackToLobby: document.getElementById('btnBackToLobby'),

  // Controles
  btnToggleSound: document.getElementById('btnToggleSound'),
  btnToggleColorblind: document.getElementById('btnToggleColorblind'),
  btnInstallPwa: document.getElementById('btnInstallPwa')
};

// ==========================================================================
// INICIALIZAÇÃO
// ==========================================================================
function init() {
  setupPWA();
  setupUIEvents();
  setupSocketListeners();
  checkUrlParamsForInvite();
  renderKeyboard();
  renderBoard();
  renderOpponentGrid();
}

// ==========================================================================
// GESTÃO DE TELAS
// ==========================================================================
function showScreen(screen) {
  DOM.screenLobby.classList.add('hidden');
  DOM.screenWaiting.classList.add('hidden');
  DOM.screenArena.classList.add('hidden');
  screen.classList.remove('hidden');
}

function showToast(message, duration = 2400) {
  DOM.toastMsg.textContent = message;
  DOM.toastMsg.classList.add('show');
  setTimeout(() => DOM.toastMsg.classList.remove('show'), duration);
}

// ==========================================================================
// EVENTOS DE INTERFACE DO LOBBY
// ==========================================================================
function setupUIEvents() {
  // Seleção de Tema
  DOM.themesGrid.addEventListener('click', (e) => {
    const option = e.target.closest('.theme-option');
    if (!option) return;
    document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('active'));
    option.classList.add('active');
    STATE.selectedTheme = option.dataset.theme;
    audio.playKey();
  });

  // Criar Sala
  DOM.btnCreateRoom.addEventListener('click', () => {
    STATE.nickname = DOM.inputNickname.value.trim() || 'Duelista';
    audio.playKey();
    socket.emit('create-room', {
      nickname: STATE.nickname,
      theme: STATE.selectedTheme
    });
  });

  // Partida Rápida
  DOM.btnQuickMatch.addEventListener('click', () => {
    STATE.nickname = DOM.inputNickname.value.trim() || 'Duelista';
    audio.playKey();
    showToast('Buscando oponente na Arena...');
    socket.emit('quick-match', {
      nickname: STATE.nickname,
      theme: STATE.selectedTheme
    });
  });

  // Entrar com Código
  DOM.btnJoinRoom.addEventListener('click', () => {
    const code = DOM.inputRoomCode.value.trim().toUpperCase();
    if (!code || code.length !== 6) {
      showToast('Digite um código válido de 6 caracteres.');
      audio.playError();
      return;
    }
    STATE.nickname = DOM.inputNickname.value.trim() || 'Duelista';
    audio.playKey();
    socket.emit('join-room', { code, nickname: STATE.nickname });
  });

  // Copiar Link de Convite
  DOM.btnCopyInviteLink.addEventListener('click', () => {
    const inviteUrl = `${window.location.origin}/?sala=${STATE.currentRoomCode}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      showToast('📋 Link copiado! Envie no WhatsApp ou Discord!');
      audio.playKey();
    }).catch(() => {
      showToast(`Código: ${STATE.currentRoomCode}`);
    });
  });

  // Botão Estou Pronto no Lobby
  DOM.btnToggleReady.addEventListener('click', () => {
    STATE.isReady = !STATE.isReady;
    audio.playKey();
    if (STATE.isReady) {
      DOM.readyBtnLabel.textContent = 'VOCÊ ESTÁ PRONTO! ⏳';
      DOM.btnToggleReady.style.background = 'var(--cyber-correct)';
      DOM.btnToggleReady.style.color = '#000';
    } else {
      DOM.readyBtnLabel.textContent = 'ESTOU PRONTO! ⚔️';
      DOM.btnToggleReady.style.background = 'var(--accent-gradient)';
      DOM.btnToggleReady.style.color = '#fff';
    }
    socket.emit('player-ready', { isReady: STATE.isReady });
  });

  // Cancelar Aguardo
  DOM.btnCancelWaiting.addEventListener('click', () => {
    showScreen(DOM.screenLobby);
    window.location.reload();
  });

  // Sair da Arena
  DOM.btnLeaveArena.addEventListener('click', () => {
    if (confirm('Deseja realmente abandonar a corrida? Você perderá a partida por W.O.')) {
      window.location.reload();
    }
  });

  // Pedir Revanche
  DOM.btnRequestRematch.addEventListener('click', () => {
    audio.playKey();
    socket.emit('request-rematch');
  });

  // Voltar ao Lobby
  DOM.btnBackToLobby.addEventListener('click', () => {
    DOM.gameOverModal.classList.add('hidden');
    showScreen(DOM.screenLobby);
  });

  // Alternar Som
  DOM.btnToggleSound.addEventListener('click', () => {
    audio.isMuted = !audio.isMuted;
    DOM.btnToggleSound.textContent = audio.isMuted ? '🔇' : '🔊';
    showToast(audio.isMuted ? 'Áudio desativado' : 'Áudio ativado');
  });

  // Alternar Modo Daltônico
  DOM.btnToggleColorblind.addEventListener('click', () => {
    document.body.classList.toggle('colorblind-mode');
    STATE.colorblindMode = document.body.classList.contains('colorblind-mode');
    DOM.btnToggleColorblind.classList.toggle('active', STATE.colorblindMode);
    showToast(STATE.colorblindMode ? 'Modo Daltônico ativado (Símbolos visíveis)' : 'Modo Daltônico desativado');
  });

  // Digitação pelo Teclado Físico
  window.addEventListener('keydown', (e) => {
    if (DOM.screenArena.classList.contains('hidden') || STATE.isLocked || STATE.isGameOver) {
      return;
    }

    if (e.key === 'Enter') {
      handleVirtualKey('ENTER');
    } else if (e.key === 'Backspace') {
      handleVirtualKey('DEL');
    } else {
      const char = e.key.toUpperCase();
      if (/^[A-ZÇ]$/.test(char)) {
        handleVirtualKey(char);
      }
    }
  });
}

// Checar se abriu a página via link direto ?sala=XYZ123
function checkUrlParamsForInvite() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('sala');
  if (code && code.length === 6) {
    DOM.inputRoomCode.value = code.toUpperCase();
    showToast(`Código ${code.toUpperCase()} inserido do link de convite!`);
  }
}

// ==========================================================================
// RENDERIZAÇÃO DE COMPONENTES DA ARENA
// ==========================================================================
function renderBoard() {
  DOM.playerBoardGrid.innerHTML = '';
  for (let r = 0; r < MAX_ROWS; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'board-row';
    rowEl.dataset.row = r;

    for (let c = 0; c < WORD_LENGTH; c++) {
      const tile = document.createElement('div');
      tile.className = 'board-tile';
      tile.id = `tile-${r}-${c}`;

      const symbol = document.createElement('span');
      symbol.className = 'cb-symbol';
      tile.appendChild(symbol);

      rowEl.appendChild(tile);
    }
    DOM.playerBoardGrid.appendChild(rowEl);
  }
}

function renderOpponentGrid() {
  DOM.oppMiniGridContainer.innerHTML = '';
  for (let r = 0; r < MAX_ROWS; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'mini-row';

    for (let c = 0; c < WORD_LENGTH; c++) {
      const cell = document.createElement('div');
      cell.className = 'mini-cell';
      cell.id = `opp-cell-${r}-${c}`;
      rowEl.appendChild(cell);
    }
    DOM.oppMiniGridContainer.appendChild(rowEl);
  }
}

function renderKeyboard() {
  DOM.cyberKeyboard.innerHTML = '';
  KEYBOARD_LAYOUT.forEach(row => {
    const rowEl = document.createElement('div');
    rowEl.className = 'k-row';

    row.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'k-key';
      btn.textContent = key;
      btn.id = `k-btn-${key}`;

      if (key === 'ENTER' || key === 'DEL') {
        btn.classList.add('action-key');
      }

      btn.addEventListener('click', () => handleVirtualKey(key));
      rowEl.appendChild(btn);
    });

    DOM.cyberKeyboard.appendChild(rowEl);
  });
}

// ==========================================================================
// TRATAMENTO DA DIGITAÇÃO DO JOGADOR
// ==========================================================================
function handleVirtualKey(key) {
  if (STATE.isLocked || STATE.isGameOver) return;
  audio.playKey();
  notifyTyping();

  if (key === 'ENTER') {
    submitGuess();
  } else if (key === 'DEL') {
    deleteLetter();
  } else {
    addLetter(key);
  }
}

function addLetter(letter) {
  if (STATE.currentCol < WORD_LENGTH) {
    const tile = document.getElementById(`tile-${STATE.currentRow}-${STATE.currentCol}`);
    tile.textContent = letter;
    tile.classList.add('filled');

    const symbol = document.createElement('span');
    symbol.className = 'cb-symbol';
    tile.appendChild(symbol);

    STATE.currentGuess += letter;
    STATE.currentCol++;
  }
}

function deleteLetter() {
  if (STATE.currentCol > 0) {
    STATE.currentCol--;
    const tile = document.getElementById(`tile-${STATE.currentRow}-${STATE.currentCol}`);
    tile.textContent = '';
    tile.classList.remove('filled');

    const symbol = document.createElement('span');
    symbol.className = 'cb-symbol';
    tile.appendChild(symbol);

    STATE.currentGuess = STATE.currentGuess.slice(0, -1);
  }
}

function submitGuess() {
  if (STATE.currentCol < WORD_LENGTH) {
    showToast('A palavra deve ter 5 letras!');
    audio.playError();
    shakeRow(STATE.currentRow);
    return;
  }

  // Trava temporariamente até o servidor responder o resultado
  STATE.isLocked = true;

  socket.emit('submit-guess', {
    guess: STATE.currentGuess,
    row: STATE.currentRow
  });
}

function shakeRow(rowIdx) {
  const rowEl = document.querySelector(`.board-row[data-row="${rowIdx}"]`);
  if (rowEl) {
    rowEl.style.animation = 'shake 0.35s ease';
    setTimeout(() => rowEl.style.animation = '', 350);
  }
}

// Emitir evento de digitação para animar pulso no oponente
function notifyTyping() {
  socket.emit('player-typing', { isTyping: true });
  clearTimeout(STATE.typingTimeout);
  STATE.typingTimeout = setTimeout(() => {
    socket.emit('player-typing', { isTyping: false });
  }, 1200);
}

// ==========================================================================
// EVENTOS DO SOCKET.IO (TEMPO REAL)
// ==========================================================================
function setupSocketListeners() {
  // Sala criada
  socket.on('room-created', (data) => {
    STATE.currentRoomCode = data.code;
    STATE.isHost = true;
    STATE.isReady = false;
    DOM.displayRoomCode.textContent = data.code;
    showScreen(DOM.screenWaiting);
    updateLobbyDuelists(data.players);
    showToast(`Sala ${data.code} criada!`);
  });

  // Entrou em sala existente
  socket.on('room-joined', (data) => {
    STATE.currentRoomCode = data.code;
    STATE.isHost = false;
    STATE.isReady = false;
    DOM.displayRoomCode.textContent = data.code;
    showScreen(DOM.screenWaiting);
    updateLobbyDuelists(data.players);
    showToast(`Conectado à sala ${data.code}!`);
  });

  // Aguardando oponente em partida rápida
  socket.on('waiting-opponent', (data) => {
    STATE.currentRoomCode = data.code;
    STATE.isReady = false;
    DOM.displayRoomCode.textContent = data.code;
    showScreen(DOM.screenWaiting);
    updateLobbyDuelists(data.players);
  });

  // Jogador entrou
  socket.on('player-joined', (data) => {
    updateLobbyDuelists(data.players);
    const opp = data.players.find(p => p.id !== socket.id);
    if (opp) {
      STATE.opponentNickname = opp.nickname;
      showToast(`${opp.nickname} entrou na arena!`);
    }
  });

  // Atualização de status de prontidão dos jogadores
  socket.on('room-players-updated', (data) => {
    updateLobbyDuelists(data.players);
  });

  // Erro ao entrar
  socket.on('join-error', (data) => {
    showToast(data.message);
    audio.playError();
  });

  // Erro no chute
  socket.on('guess-error', (data) => {
    showToast(data.message);
    audio.playError();
    STATE.isLocked = false;
  });

  // Contagem regressiva sincronizada (3, 2, 1)
  socket.on('countdown-tick', (data) => {
    console.log('[Client] Countdown tick:', data.count);
    DOM.gameOverModal.classList.add('hidden');
    DOM.countdownOverlay.classList.remove('hidden');
    DOM.countdownNumber.textContent = data.count;
    audio.playKey();
  });

  // Início da corrida
  socket.on('match-start', (data) => {
    console.log('[Client] Match start recebido:', data);
    DOM.countdownOverlay.classList.add('hidden');
    showScreen(DOM.screenArena);

    // Configurar dados da partida
    DOM.arenaCategoryTag.textContent = `${data.themeIcon} ${data.themeName}`;
    DOM.playerLocalNick.textContent = STATE.nickname;
    DOM.playerLocalState.textContent = 'Linha 1/6';

    const opp = data.players.find(p => p.id !== socket.id);
    if (opp) {
      DOM.playerOppNick.textContent = opp.nickname;
      DOM.playerOppState.textContent = 'Linha 1/6';
    }

    resetArenaState();
    startTimer();
    showToast('🏁 LARGADA DADA! DIGITE RÁPIDO!');
  });

  // Resultado do palpite local
  socket.on('guess-result', (data) => {
    applyGuessResult(data);
  });

  // Progresso do oponente (MÁSCARA SEM SPOILER)
  socket.on('opponent-progress', (data) => {
    applyOpponentProgress(data);
  });

  // Pulso de digitação do oponente
  socket.on('opponent-typing-status', (data) => {
    DOM.oppTypingPulse.classList.toggle('active', data.isTyping);
  });

  // Fim de jogo (Vitória / Derrota / Empate)
  socket.on('game-over', (data) => {
    DOM.countdownOverlay.classList.add('hidden');
    handleGameOver(data);
  });

  // Jogador saiu da sala
  socket.on('player-left', (data) => {
    showToast(data.message || 'Um jogador saiu da sala.');
    DOM.countdownOverlay.classList.add('hidden');
    STATE.isReady = false;
    DOM.readyBtnLabel.textContent = 'ESTOU PRONTO! ⚔️';
    DOM.btnToggleReady.style.background = 'var(--accent-gradient)';
    DOM.btnToggleReady.style.color = '#fff';
  });

  // Desconexão do Socket
  socket.on('disconnect', (reason) => {
    console.warn('[Client] Socket desconectado:', reason);
  });

  // Revanche solicitada
  socket.on('opponent-wants-rematch', () => {
    DOM.rematchBtnText.textContent = 'Aceitar Revanche!';
    showToast('🔥 Oponente quer revanche! Clique para aceitar!');
    audio.playKey();
  });

  socket.on('rematch-requested', () => {
    DOM.rematchBtnText.textContent = 'Aguardando oponente aceitar...';
    DOM.btnRequestRematch.disabled = true;
  });

  socket.on('rematch-accepted', () => {
    DOM.rematchBtnText.textContent = 'Pedir Revanche';
    DOM.btnRequestRematch.disabled = false;
    DOM.gameOverModal.classList.add('hidden');
  });

  socket.on('player-left', (data) => {
    showToast(data.message);
  });
}

// ==========================================================================
// PROCESSAMENTO DO FLUXO DO JOGO
// ==========================================================================
function applyGuessResult(data) {
  const { row, guess, result, isMatch, currentRow } = data;
  const guessLetters = guess.split('');

  // Animação de virada 3D em cascata
  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.getElementById(`tile-${row}-${i}`);
    const status = result[i];
    const letter = guessLetters[i];

    setTimeout(() => {
      tile.classList.add('flip', status);
      audio.playFlip(status);

      // Símbolo do modo daltônico
      const symbolEl = tile.querySelector('.cb-symbol');
      if (symbolEl) {
        if (status === 'correct') symbolEl.textContent = '●';
        else if (status === 'present') symbolEl.textContent = '▲';
        else symbolEl.textContent = '✕';
      }

      // Atualizar tecla do teclado
      updateKeyboardKey(letter, status);
    }, i * 160);
  }

  setTimeout(() => {
    DOM.playerLocalState.textContent = `Linha ${currentRow}/6`;

    if (!isMatch && currentRow < MAX_ROWS && !STATE.isGameOver) {
      STATE.currentRow++;
      STATE.currentCol = 0;
      STATE.currentGuess = '';
      STATE.isLocked = false;
    }
  }, WORD_LENGTH * 160 + 100);
}

function applyOpponentProgress(data) {
  const { row, mask, currentRow } = data;
  for (let i = 0; i < WORD_LENGTH; i++) {
    const cell = document.getElementById(`opp-cell-${row}-${i}`);
    if (cell) {
      cell.className = `mini-cell ${mask[i]}`;
    }
  }
  DOM.playerOppState.textContent = `Linha ${currentRow}/6`;
}

function updateKeyboardKey(letter, status) {
  const btn = document.getElementById(`k-btn-${letter}`);
  if (!btn) return;

  if (status === 'correct') {
    btn.className = 'k-key correct';
  } else if (status === 'present' && !btn.classList.contains('correct')) {
    btn.className = 'k-key present';
  } else if (status === 'absent' && !btn.classList.contains('correct') && !btn.classList.contains('present')) {
    btn.className = 'k-key absent';
  }
}

function handleGameOver(data) {
  STATE.isGameOver = true;
  STATE.isLocked = true;
  stopTimer();

  const isYouWinner = data.winnerId === socket.id;

  if (isYouWinner) {
    audio.playVictory();
    DOM.modalResultIcon.textContent = '🏆';
    DOM.modalResultTitle.textContent = 'VOCÊ VENCEU O DUELO!';
    DOM.modalResultTitle.className = 'result-title win';
    DOM.modalResultDesc.textContent = data.reason === 'forfeit' 
      ? 'O oponente desconectou. Vitória por W.O.!' 
      : 'Incrível velocidade! Você decifrou a palavra primeiro!';
  } else if (data.winnerId === null) {
    audio.playDefeat();
    DOM.modalResultIcon.textContent = '🤝';
    DOM.modalResultTitle.textContent = 'EMPATE!';
    DOM.modalResultTitle.className = 'result-title';
    DOM.modalResultDesc.textContent = 'Ambos os duelistas esgotaram as 6 tentativas.';
  } else {
    audio.playDefeat();
    DOM.modalResultIcon.textContent = '💀';
    DOM.modalResultTitle.textContent = 'DERROTA NA ARENA';
    DOM.modalResultTitle.className = 'result-title lose';
    DOM.modalResultDesc.textContent = 'O oponente acertou a palavra secreta antes de você!';
  }

  DOM.modalSecretWord.textContent = data.secretWord || '-----';
  DOM.rematchBtnText.textContent = 'Pedir Revanche';
  DOM.btnRequestRematch.disabled = false;
  DOM.gameOverModal.classList.remove('hidden');
}

function resetArenaState() {
  STATE.currentRow = 0;
  STATE.currentCol = 0;
  STATE.currentGuess = '';
  STATE.isLocked = false;
  STATE.isGameOver = false;
  renderBoard();
  renderOpponentGrid();
  renderKeyboard();
}

function startTimer() {
  stopTimer();
  STATE.timerSeconds = 0;
  DOM.arenaRoundClock.textContent = '⏱️ 00:00';

  STATE.timerInterval = setInterval(() => {
    STATE.timerSeconds++;
    const m = Math.floor(STATE.timerSeconds / 60).toString().padStart(2, '0');
    const s = (STATE.timerSeconds % 60).toString().padStart(2, '0');
    DOM.arenaRoundClock.textContent = `⏱️ ${m}:${s}`;
  }, 1000);
}

function updateLobbyDuelists(players) {
  if (!players || players.length === 0) return;

  const p1 = players[0];
  const p2 = players[1];

  DOM.lobbyNick1.textContent = p1 ? p1.nickname : 'Jogador 1';
  if (p1 && p1.ready) {
    DOM.lobbyStatus1.textContent = 'PRONTO ✅';
    DOM.lobbyStatus1.style.background = 'rgba(0, 229, 153, 0.2)';
    DOM.lobbyStatus1.style.color = 'var(--cyber-correct)';
    DOM.cardPlayer1.style.borderColor = 'var(--cyber-correct)';
  } else {
    DOM.lobbyStatus1.textContent = 'Aguardando confirmação';
    DOM.lobbyStatus1.style.background = 'rgba(255, 255, 255, 0.08)';
    DOM.lobbyStatus1.style.color = 'var(--text-dim)';
    DOM.cardPlayer1.style.borderColor = 'var(--cyber-border)';
  }

  if (p2) {
    DOM.lobbyNick2.textContent = p2.nickname;
    if (p2.ready) {
      DOM.lobbyStatus2.textContent = 'PRONTO ✅';
      DOM.lobbyStatus2.style.background = 'rgba(0, 229, 153, 0.2)';
      DOM.lobbyStatus2.style.color = 'var(--cyber-correct)';
      DOM.cardPlayer2.style.borderColor = 'var(--cyber-correct)';
    } else {
      DOM.lobbyStatus2.textContent = 'Aguardando confirmação';
      DOM.lobbyStatus2.style.background = 'rgba(255, 255, 255, 0.08)';
      DOM.lobbyStatus2.style.color = 'var(--text-dim)';
      DOM.cardPlayer2.style.borderColor = 'var(--cyber-border)';
    }

    DOM.btnToggleReady.style.display = 'flex';
    DOM.btnCopyInviteLink.style.display = 'none';
    DOM.lobbyHelperText.textContent = 'Ambos na sala! Clique em ESTOU PRONTO para iniciar o duelo!';
  } else {
    DOM.lobbyNick2.textContent = 'Esperando oponente...';
    DOM.lobbyStatus2.textContent = 'Aguardando entrar';
    DOM.lobbyStatus2.style.background = 'rgba(255, 255, 255, 0.08)';
    DOM.lobbyStatus2.style.color = 'var(--text-dim)';
    DOM.cardPlayer2.style.borderColor = 'var(--cyber-border)';
    DOM.btnToggleReady.style.display = 'none';
    DOM.btnCopyInviteLink.style.display = 'flex';
    DOM.lobbyHelperText.textContent = 'Aguardando oponente entrar na arena...';
  }
}

// ==========================================================================
// REGISTRO DE SERVICE WORKER (PWA)
// ==========================================================================
function setupPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(() => {
      console.log('[PWA] Service Worker registrado com sucesso!');
    }).catch(err => {
      console.warn('[PWA] Erro ao registrar SW:', err);
    });
  }

  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    DOM.btnInstallPwa.style.display = 'flex';

    DOM.btnInstallPwa.addEventListener('click', () => {
      DOM.btnInstallPwa.style.display = 'none';
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        deferredPrompt = null;
      });
    });
  });
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', init);
