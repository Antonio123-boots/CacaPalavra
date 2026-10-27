const MAX_ATTEMPTS = 6;
const PRACTICE_STORAGE_KEY = 'palavra-practice-session';
const PREFERENCES_KEY = 'palavra-preferences';

const state = {
  mode: 'daily',
  profile: null,
  categories: [],
  daily: null,
  practice: null,
  currentGuess: '',
  pendingRequest: null,
  submitting: false,
  installPrompt: null,
  toastTimeout: null
};

const elements = {
  date: document.getElementById('date-label'),
  challengeNumber: document.getElementById('challenge-number'),
  modeLabel: document.getElementById('mode-label'),
  dailyTab: document.getElementById('daily-tab'),
  practiceTab: document.getElementById('practice-tab'),
  practiceNote: document.getElementById('practice-note'),
  practiceForm: document.getElementById('practice-form'),
  categorySelect: document.getElementById('category-select'),
  lengthSelect: document.getElementById('length-select'),
  gameKicker: document.getElementById('game-kicker'),
  gameTitle: document.getElementById('game-title'),
  gameDescription: document.getElementById('game-description'),
  modeBadge: document.getElementById('mode-badge'),
  attemptsLeft: document.getElementById('attempts-left'),
  board: document.getElementById('board'),
  boardCaptionLeft: document.getElementById('board-caption-left'),
  boardCaptionRight: document.getElementById('board-caption-right'),
  keyboard: document.getElementById('keyboard'),
  guessInput: document.getElementById('guess-input'),
  submitGuess: document.getElementById('submit-guess'),
  clearGuess: document.getElementById('clear-guess'),
  gameStatus: document.getElementById('game-status'),
  retryButton: document.getElementById('retry-button'),
  resultPanel: document.getElementById('result-panel'),
  resultTitle: document.getElementById('result-title'),
  resultCopy: document.getElementById('result-copy'),
  resultKicker: document.getElementById('result-kicker'),
  shareButton: document.getElementById('share-result'),
  shareText: document.getElementById('share-text'),
  profileForm: document.getElementById('profile-form'),
  nickname: document.getElementById('nickname'),
  deleteProfile: document.getElementById('delete-profile'),
  played: document.getElementById('stat-played'),
  winRate: document.getElementById('stat-win-rate'),
  streak: document.getElementById('stat-streak'),
  bestStreak: document.getElementById('stat-best-streak'),
  distribution: document.getElementById('distribution'),
  rankingDate: document.getElementById('ranking-date'),
  rankingList: document.getElementById('ranking-list'),
  toast: document.getElementById('toast'),
  contrastToggle: document.getElementById('contrast-toggle'),
  textToggle: document.getElementById('text-toggle'),
  motionToggle: document.getElementById('motion-toggle'),
  installButton: document.getElementById('install-button'),
  installCardButton: document.getElementById('install-card-button')
};

const keyboardLayout = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
];

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Sem conexão com o servidor. Verifique sua internet e tente novamente.');
  }

  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(response.status, 'INVALID_RESPONSE', 'O servidor enviou uma resposta que não pôde ser lida.');
  }
  if (!response.ok) {
    throw new ApiError(response.status, data.error?.code || 'REQUEST_FAILED',
      data.error?.message || 'Não foi possível concluir a operação.');
  }
  return data;
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function normalize(value) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().trim();
}

function activeGame() {
  return state.mode === 'daily' ? state.daily : state.practice;
}

function wordLength() {
  const game = activeGame();
  return game ? game.wordLength : 5;
}

function displayDate(date) {
  const parsed = new Date(`${date}T12:00:00Z`);
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' });
}

function setStatus(message, kind = '') {
  elements.gameStatus.textContent = message;
  elements.gameStatus.classList.toggle('is-error', kind === 'error');
  elements.gameStatus.classList.toggle('is-success', kind === 'success');
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  clearTimeout(state.toastTimeout);
  state.toastTimeout = setTimeout(() => elements.toast.classList.remove('is-visible'), 3000);
}

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    console.warn('[UI] Preferências locais indisponíveis:', error);
    return null;
  }
}

function readPreferences() {
  const storage = safeLocalStorage();
  if (!storage) return {};
  try {
    return JSON.parse(storage.getItem(PREFERENCES_KEY) || '{}');
  } catch (error) {
    console.warn('[UI] Preferências salvas inválidas:', error);
    return {};
  }
}

function savePreferences(preferences) {
  const storage = safeLocalStorage();
  if (!storage) {
    showToast('Não foi possível salvar a preferência neste dispositivo.');
    return;
  }
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.warn('[UI] Não foi possível salvar preferências:', error);
    showToast('Não foi possível salvar a preferência neste dispositivo.');
  }
}

function practiceStorage() {
  try {
    return window.sessionStorage;
  } catch (error) {
    console.warn('[UI] Sessão local de prática indisponível:', error);
    return null;
  }
}

function setPracticeId(id) {
  const storage = practiceStorage();
  if (!storage) return;
  try {
    if (id) storage.setItem(PRACTICE_STORAGE_KEY, id);
    else storage.removeItem(PRACTICE_STORAGE_KEY);
  } catch (error) {
    console.warn('[UI] Não foi possível salvar a sessão de prática:', error);
    showToast('A sessão de prática pode não ser restaurada ao recarregar a página.');
  }
}

function getPracticeId() {
  const storage = practiceStorage();
  if (!storage) return null;
  try {
    return storage.getItem(PRACTICE_STORAGE_KEY);
  } catch (error) {
    console.warn('[UI] Não foi possível recuperar a sessão de prática:', error);
    return null;
  }
}

function applyPreferences() {
  const preferences = readPreferences();
  document.body.classList.toggle('high-contrast', Boolean(preferences.highContrast));
  document.body.classList.toggle('large-text', Boolean(preferences.largeText));
  document.body.classList.toggle('reduced-motion', Boolean(preferences.reducedMotion));
  elements.contrastToggle.setAttribute('aria-pressed', String(Boolean(preferences.highContrast)));
  elements.textToggle.setAttribute('aria-pressed', String(Boolean(preferences.largeText)));
  elements.motionToggle.setAttribute('aria-pressed', String(Boolean(preferences.reducedMotion)));
}

function categoryById(id) {
  return state.categories.find(category => category.id === id);
}

function updateLengthsForCategory(preferredLength) {
  const category = categoryById(elements.categorySelect.value) || state.categories[0];
  if (!category) return;
  const lengths = category.lengths;
  elements.lengthSelect.replaceChildren();
  for (const length of lengths) {
    const option = document.createElement('option');
    option.value = String(length);
    option.textContent = `${length} letras`;
    elements.lengthSelect.append(option);
  }
  if (lengths.includes(Number(preferredLength))) {
    elements.lengthSelect.value = String(preferredLength);
  }
}

function renderCategories() {
  elements.categorySelect.replaceChildren();
  for (const category of state.categories) {
    const option = document.createElement('option');
    option.value = category.id;
    option.textContent = category.name;
    elements.categorySelect.append(option);
  }
  updateLengthsForCategory(5);
}

function statusSymbol(status) {
  return status === 'correct' ? '✓' : status === 'present' ? '↗' : '×';
}

function describeStatus(status) {
  if (status === 'correct') return 'letra certa no lugar';
  if (status === 'present') return 'letra existe em outra posição';
  return 'letra não aparece';
}

function keyboardStates() {
  const rank = { absent: 1, present: 2, correct: 3 };
  const result = {};
  for (const guess of activeGame()?.guesses || []) {
    guess.guess.split('').forEach((letter, index) => {
      const status = guess.result[index];
      if (!result[letter] || rank[status] > rank[result[letter]]) result[letter] = status;
    });
  }
  return result;
}

function renderKeyboard() {
  const game = activeGame();
  const isLocked = !game || ['won', 'lost'].includes(game.status) || state.submitting;
  const states = keyboardStates();
  elements.keyboard.replaceChildren();
  for (const rowKeys of keyboardLayout) {
    const row = document.createElement('div');
    row.className = 'key-row';
    for (const key of rowKeys) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `key${key === 'ENTER' || key === 'DEL' ? ' wide' : ''}`;
      button.textContent = key === 'ENTER' ? 'Enviar' : key === 'DEL' ? '⌫' : key;
      button.disabled = isLocked;
      if (key === 'ENTER') button.setAttribute('aria-label', 'Enviar palpite');
      else if (key === 'DEL') button.setAttribute('aria-label', 'Apagar última letra');
      else if (states[key]) button.classList.add(states[key]);
      button.addEventListener('click', () => {
        if (key === 'ENTER') submitGuess();
        else if (key === 'DEL') editGuess('delete');
        else editGuess(key);
      });
      row.append(button);
    }
    elements.keyboard.append(row);
  }
}

function renderBoard() {
  const game = activeGame();
  const length = wordLength();
  const guesses = game?.guesses || [];
  const terminal = game && ['won', 'lost'].includes(game.status);
  elements.board.replaceChildren();
  elements.board.style.setProperty('--word-length', String(length));
  elements.board.setAttribute('aria-colcount', String(length));

  for (let rowIndex = 0; rowIndex < MAX_ATTEMPTS; rowIndex += 1) {
    const savedGuess = guesses[rowIndex];
    const isCurrent = !savedGuess && !terminal && rowIndex === guesses.length;
    const row = document.createElement('li');
    row.className = 'board-row';
    row.setAttribute('role', 'row');
    row.setAttribute('aria-rowindex', String(rowIndex + 1));
    row.style.setProperty('--word-length', String(length));
    row.setAttribute('aria-label', `Tentativa ${rowIndex + 1}${savedGuess ? '' : isCurrent ? ', atual' : ', vazia'}`);

    for (let column = 0; column < length; column += 1) {
      const tile = document.createElement('span');
      tile.className = 'tile';
      tile.setAttribute('role', 'gridcell');
      const letter = savedGuess?.guess[column] || (isCurrent ? state.currentGuess[column] : '') || '';
      if (letter) {
        tile.textContent = letter;
        tile.classList.add('filled');
      }
      if (savedGuess) {
        const status = savedGuess.result[column];
        tile.classList.add(status);
        tile.setAttribute('aria-label', `${column + 1}: ${letter}, ${describeStatus(status)}`);
        const symbol = document.createElement('span');
        symbol.className = 'tile-symbol';
        symbol.setAttribute('aria-hidden', 'true');
        symbol.textContent = statusSymbol(status);
        tile.append(symbol);
      } else {
        tile.setAttribute('aria-label', letter ? `${column + 1}: ${letter}` : `${column + 1}: vazia`);
      }
      row.append(tile);
    }
    elements.board.append(row);
  }
  elements.board.setAttribute('role', 'grid');
  elements.board.setAttribute('aria-rowcount', String(MAX_ATTEMPTS));

  elements.attemptsLeft.textContent = game ? String(Math.max(0, MAX_ATTEMPTS - guesses.length)) : '6';
  elements.guessInput.maxLength = length;
  elements.guessInput.value = state.currentGuess;
  elements.guessInput.disabled = Boolean(terminal || !game || state.submitting);
  elements.submitGuess.disabled = Boolean(terminal || !game || state.submitting);
  elements.clearGuess.disabled = Boolean(terminal || !game || state.submitting || !state.currentGuess);
  elements.boardCaptionLeft.textContent = terminal
    ? 'partida encerrada'
    : `palpite ${String(guesses.length + 1).padStart(2, '0')} de ${MAX_ATTEMPTS}`;
  elements.boardCaptionRight.textContent = `${String(Math.max(0, MAX_ATTEMPTS - guesses.length)).padStart(2, '0')} restantes`;

  renderKeyboard();
  renderResult();
}

function buildShareText(game) {
  const number = state.daily?.challengeNumber || game.date || '';
  const lines = game.guesses.map(guess => guess.result.map(status => (
    status === 'correct' ? '🟩' : status === 'present' ? '🟨' : '⬜'
  )).join(''));
  const score = game.status === 'won' ? `${game.guesses.length}/6` : 'X/6';
  return `Palavra de Rua ${number} ${score}\n${lines.join('\n')}`;
}

function renderResult() {
  const game = activeGame();
  const finished = game && ['won', 'lost'].includes(game.status);
  elements.resultPanel.hidden = !finished;
  if (!finished) return;

  const won = game.status === 'won';
  elements.resultKicker.textContent = state.mode === 'daily' ? 'resultado do desafio' : 'fim da prática';
  elements.resultTitle.textContent = won ? 'Você encontrou a palavra!' : 'Boa tentativa.';
  elements.resultCopy.textContent = `A palavra era ${game.answer}. ${won ? `Você resolveu em ${game.guesses.length} tentativa${game.guesses.length === 1 ? '' : 's'}.` : 'Amanhã tem outro desafio.'}`;
  if (state.mode === 'daily') {
    elements.shareText.value = buildShareText(game);
    elements.shareButton.disabled = false;
  } else {
    elements.shareText.value = 'A prática não gera resultado compartilhável do desafio diário.';
    elements.shareButton.disabled = true;
  }
}

function updateModeUI() {
  const daily = state.mode === 'daily';
  elements.dailyTab.classList.toggle('is-active', daily);
  elements.practiceTab.classList.toggle('is-active', !daily);
  elements.dailyTab.setAttribute('aria-pressed', String(daily));
  elements.practiceTab.setAttribute('aria-pressed', String(!daily));
  elements.practiceNote.hidden = daily;
  elements.practiceForm.hidden = daily;
  elements.modeLabel.textContent = daily
    ? `desafio de hoje · ${state.daily?.wordLength || '…'} letras`
    : 'modo prática · sem ranking';
  elements.gameKicker.textContent = daily ? 'o desafio de hoje' : 'rodada de prática';
  elements.gameTitle.textContent = daily ? 'Qual é a palavra?' : 'Pratique no seu ritmo.';
  elements.modeBadge.textContent = daily ? 'DESAFIO DIÁRIO' : 'PRÁTICA · NÃO CONTA PARA O RANKING';
}

function applyGameToState(game, mode) {
  if (mode === 'daily') state.daily = game;
  else state.practice = game;
  state.currentGuess = '';
  state.pendingRequest = null;
}

function renderGame() {
  updateModeUI();
  const game = activeGame();
  if (!game) {
    elements.gameDescription.textContent = 'Escolha o tema e o tamanho para começar uma rodada.';
    renderBoard();
    return;
  }
  const gameDate = state.daily ? displayDate(state.daily.date) : null;
  elements.gameDescription.textContent = state.mode === 'daily'
    ? `${game.wordLength} letras · até ${MAX_ATTEMPTS} tentativas · ${gameDate}`
    : `${game.wordLength} letras · até ${MAX_ATTEMPTS} tentativas · prática sem ranking`;
  if (game.status === 'not_started') setStatus('Digite um palpite para começar o desafio.');
  else if (game.status === 'in_progress') setStatus('Cada palpite revela novas pistas. Você consegue.');
  else if (game.status === 'won') setStatus('Desafio concluído. Seu resultado foi salvo.', 'success');
  else if (game.status === 'lost') setStatus('Desafio encerrado. A resposta foi revelada.', 'success');
  renderBoard();
}

function editGuess(value) {
  if (state.submitting || !activeGame() || ['won', 'lost'].includes(activeGame().status)) return;
  state.pendingRequest = null;
  if (value === 'delete') state.currentGuess = [...state.currentGuess].slice(0, -1).join('');
  else if (/^[A-Z]$/.test(value) && state.currentGuess.length < wordLength()) state.currentGuess += value;
  elements.guessInput.value = state.currentGuess;
  renderBoard();
}

function handleInput() {
  state.currentGuess = normalize(elements.guessInput.value)
    .replace(/[^A-Z]/g, '')
    .slice(0, wordLength());
  state.pendingRequest = null;
  elements.guessInput.value = state.currentGuess;
  renderBoard();
}

async function submitGuess() {
  const submittedMode = state.mode;
  const game = activeGame();
  if (!game || state.submitting || ['won', 'lost'].includes(game.status)) return;
  const guess = normalize(state.currentGuess);
  if (guess.length !== wordLength()) {
    setStatus(`Digite uma palavra com exatamente ${wordLength()} letras.`, 'error');
    elements.guessInput.focus();
    return;
  }
  const pending = state.pendingRequest && state.pendingRequest.guess === guess
    ? state.pendingRequest
    : { guess, requestId: uuid() };
  state.pendingRequest = pending;
  state.submitting = true;
  renderBoard();
  setStatus('Conferindo seu palpite…');

  try {
    const endpoint = submittedMode === 'daily'
      ? `/api/v1/challenge/${encodeURIComponent(game.id)}/guesses`
      : `/api/v1/practice/${encodeURIComponent(game.id)}/guesses`;
    const response = await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({ guess, requestId: pending.requestId })
    });
    const current = submittedMode === 'daily' ? state.daily : state.practice;
    if (current === game) {
      if (!game.guesses.some(item => item.requestId === pending.requestId)) game.guesses.push(response.guess);
      game.status = response.status;
      if (response.answer) game.answer = response.answer;
      if (state.mode === submittedMode) {
        state.currentGuess = '';
        state.pendingRequest = null;
        setStatus(response.status === 'won' ? 'Palavra encontrada! Seu resultado foi salvo.'
          : response.status === 'lost' ? 'As tentativas acabaram. A resposta foi revelada.'
            : `Palpite registrado. Restam ${response.attemptsRemaining} tentativas.`,
        response.status === 'in_progress' ? '' : 'success');
        renderBoard();
      }
    }
    if (submittedMode === 'daily') await refreshPanels();
  } catch (error) {
    if (error.status) state.pendingRequest = null;
    setStatus(error.message || 'Não foi possível enviar o palpite.', 'error');
  } finally {
    state.submitting = false;
    renderBoard();
  }
}

async function loadDaily() {
  const game = await api('/api/v1/challenge/today');
  applyGameToState(game, 'daily');
  elements.date.textContent = `· ${displayDate(game.date)}`;
  elements.challengeNumber.textContent = `DESAFIO N.º ${String(game.challengeNumber).padStart(3, '0')}`;
  elements.rankingDate.textContent = displayDate(game.date);
}

async function loadPractice(id) {
  const game = await api(`/api/v1/practice/${encodeURIComponent(id)}`);
  applyGameToState(game, 'practice');
}

async function startPractice(event) {
  event.preventDefault();
  const category = categoryById(elements.categorySelect.value);
  const wordLengthValue = Number(elements.lengthSelect.value);
  if (!category || !category.lengths.includes(wordLengthValue)) {
    setStatus('Escolha uma combinação de tema e tamanho disponível.', 'error');
    return;
  }
  try {
    const game = await api('/api/v1/practice', {
      method: 'POST',
      body: JSON.stringify({ categoryId: category.id, wordLength: wordLengthValue })
    });
    applyGameToState(game, 'practice');
    setPracticeId(game.id);
    state.mode = 'practice';
    setStatus('Nova prática iniciada. Boa sorte!');
    renderGame();
    elements.guessInput.focus();
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

function setMode(mode) {
  state.mode = mode;
  state.currentGuess = '';
  state.pendingRequest = null;
  renderGame();
  if (mode === 'practice' && !state.practice) elements.categorySelect.focus();
  else if (activeGame() && !['won', 'lost'].includes(activeGame().status)) elements.guessInput.focus();
}

function renderStats(stats) {
  elements.played.textContent = String(stats.played);
  elements.winRate.textContent = `${stats.winRate}%`;
  elements.streak.textContent = String(stats.currentStreak);
  elements.bestStreak.textContent = String(stats.bestStreak);
  elements.distribution.replaceChildren();
  const maximum = Math.max(1, ...stats.distribution);
  stats.distribution.forEach((count, index) => {
    const row = document.createElement('div');
    row.className = 'dist-row';
    const label = document.createElement('span');
    label.textContent = String(index + 1);
    const track = document.createElement('div');
    track.className = 'dist-track';
    track.setAttribute('role', 'img');
    track.setAttribute('aria-label', `${index + 1} tentativa${index ? 's' : ''}: ${count} vitórias`);
    const fill = document.createElement('div');
    fill.className = 'dist-fill';
    fill.style.width = `${count ? Math.max(10, (count / maximum) * 100) : 0}%`;
    fill.textContent = String(count);
    track.append(fill);
    const countLabel = document.createElement('span');
    countLabel.textContent = String(count).padStart(2, '0');
    row.append(label, track, countLabel);
    elements.distribution.append(row);
  });
}

function renderRanking(result) {
  elements.rankingList.replaceChildren();
  if (!result.entries.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'Ainda não há resultados públicos para este desafio.';
    elements.rankingList.append(empty);
    return;
  }
  for (const entry of result.entries) {
    const row = document.createElement('li');
    row.className = 'rank-row';
    const rank = document.createElement('span');
    rank.className = 'rank-position';
    rank.textContent = String(entry.rank).padStart(2, '0');
    const nickname = document.createElement('span');
    nickname.className = 'rank-name';
    nickname.textContent = entry.nickname;
    const score = document.createElement('span');
    score.className = 'rank-score';
    score.textContent = `${entry.attempts}/6`;
    row.append(rank, nickname, score);
    elements.rankingList.append(row);
  }
}

async function refreshPanels() {
  const results = await Promise.allSettled([
    api('/api/v1/stats/me'),
    api(`/api/v1/leaderboard?date=${encodeURIComponent(state.daily.date)}&limit=20`)
  ]);
  if (results[0].status === 'fulfilled') renderStats(results[0].value);
  else {
    console.error('[UI] Não foi possível carregar estatísticas:', results[0].reason);
    showToast('Não foi possível atualizar as estatísticas.');
  }
  if (results[1].status === 'fulfilled') renderRanking(results[1].value);
  else {
    console.error('[UI] Não foi possível carregar ranking:', results[1].reason);
    elements.rankingList.replaceChildren();
    const error = document.createElement('li');
    error.className = 'empty-state';
    error.textContent = 'Ranking indisponível no momento.';
    elements.rankingList.append(error);
  }
}

async function saveProfile(event) {
  event.preventDefault();
  const nickname = elements.nickname.value.trim();
  try {
    const result = await api('/api/v1/profile', {
      method: 'PATCH',
      body: JSON.stringify({ nickname: nickname || null })
    });
    state.profile = result.profile;
    elements.nickname.value = result.profile.nickname || '';
    showToast(result.profile.nickname ? 'Apelido salvo. Ele aparece no ranking.' : 'Apelido removido.');
    await refreshPanels();
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteProfile() {
  if (!window.confirm('Apagar o apelido e o histórico deste dispositivo? Essa ação não pode ser desfeita.')) return;
  try {
    await api('/api/v1/profile', { method: 'DELETE' });
    showToast('Perfil e histórico apagados.');
    window.location.reload();
  } catch (error) {
    showToast(error.message);
  }
}

async function shareResult() {
  const text = elements.shareText.value;
  if (!text || !state.daily || !['won', 'lost'].includes(state.daily.status)) return;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Meu resultado — Palavra de Rua', text });
      showToast('Resultado compartilhado.');
      return;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('Resultado copiado sem spoilers.');
      return;
    }
    elements.shareText.focus();
    elements.shareText.select();
    showToast('Texto selecionado. Copie para compartilhar.');
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('[UI] Compartilhamento indisponível:', error);
    elements.shareText.focus();
    elements.shareText.select();
    showToast('Não foi possível compartilhar automaticamente. Copie o texto selecionado.');
  }
}

function editPreferences(key, bodyClass, button) {
  const preferences = readPreferences();
  preferences[key] = !preferences[key];
  document.body.classList.toggle(bodyClass, preferences[key]);
  button.setAttribute('aria-pressed', String(preferences[key]));
  savePreferences(preferences);
}

function registerInstallPrompt() {
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    state.installPrompt = event;
    elements.installButton.hidden = false;
    elements.installCardButton.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    state.installPrompt = null;
    elements.installButton.hidden = true;
    elements.installCardButton.hidden = true;
    showToast('Jogo instalado neste dispositivo.');
  });
}

async function installApp() {
  if (!state.installPrompt) {
    showToast('A instalação não está disponível neste navegador.');
    return;
  }
  state.installPrompt.prompt();
  await state.installPrompt.userChoice;
  state.installPrompt = null;
  elements.installButton.hidden = true;
  elements.installCardButton.hidden = true;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(error => {
    console.error('[PWA] Não foi possível registrar o Service Worker:', error);
  });
}

function attachEvents() {
  elements.dailyTab.addEventListener('click', () => setMode('daily'));
  elements.practiceTab.addEventListener('click', () => setMode('practice'));
  elements.practiceForm.addEventListener('submit', startPractice);
  elements.categorySelect.addEventListener('change', () => updateLengthsForCategory(Number(elements.lengthSelect.value)));
  elements.guessInput.addEventListener('input', handleInput);
  elements.guessInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitGuess();
    } else if (event.key === 'Escape') {
      state.currentGuess = '';
      state.pendingRequest = null;
      elements.guessInput.value = '';
      renderBoard();
    }
  });
  elements.submitGuess.addEventListener('click', submitGuess);
  elements.clearGuess.addEventListener('click', () => {
    state.currentGuess = '';
    state.pendingRequest = null;
    elements.guessInput.value = '';
    elements.guessInput.focus();
    renderBoard();
  });
  elements.shareButton.addEventListener('click', shareResult);
  elements.profileForm.addEventListener('submit', saveProfile);
  elements.deleteProfile.addEventListener('click', deleteProfile);
  elements.contrastToggle.addEventListener('click', () => editPreferences('highContrast', 'high-contrast', elements.contrastToggle));
  elements.textToggle.addEventListener('click', () => editPreferences('largeText', 'large-text', elements.textToggle));
  elements.motionToggle.addEventListener('click', () => editPreferences('reducedMotion', 'reduced-motion', elements.motionToggle));
  elements.installButton.addEventListener('click', installApp);
  elements.installCardButton.addEventListener('click', installApp);
  elements.retryButton.addEventListener('click', () => window.location.reload());
  window.addEventListener('online', () => showToast('Conexão restabelecida. Você pode tentar novamente.'));
  window.addEventListener('offline', () => showToast('Você está offline. O desafio precisa de conexão para ser confirmado.'));
}

async function initialize() {
  applyPreferences();
  attachEvents();
  registerInstallPrompt();
  registerServiceWorker();
  try {
    const profile = await api('/api/v1/profile');
    state.profile = profile.profile;
    elements.nickname.value = state.profile.nickname || '';
    const [categories] = await Promise.all([
      api('/api/v1/categories'),
      loadDaily()
    ]);
    state.categories = categories;
    renderCategories();
    const practiceId = getPracticeId();
    if (practiceId) {
      try {
        await loadPractice(practiceId);
      } catch (error) {
        if (error.status !== 404) throw error;
        setPracticeId(null);
      }
    }
    state.mode = 'daily';
    renderGame();
    await refreshPanels();
    elements.retryButton.hidden = true;
  } catch (error) {
    console.error('[UI] Falha ao iniciar o jogo:', error);
    setStatus(error.message || 'Não foi possível carregar o jogo. Tente novamente.', 'error');
    elements.gameDescription.textContent = 'Não foi possível carregar o desafio diário.';
    elements.retryButton.hidden = false;
    elements.attemptsLeft.textContent = '—';
    elements.submitGuess.disabled = true;
    elements.guessInput.disabled = true;
  }
}

initialize();
