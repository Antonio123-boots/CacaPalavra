const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONTENT_PATH = path.join(__dirname, 'words', 'solo.json');
const DATA_PATH = process.env.GAME_DATA_FILE || path.join(__dirname, 'data', 'solo-state.json');
const TIME_ZONE = process.env.GAME_TIME_ZONE || 'America/Sao_Paulo';
const START_DATE = '2026-10-27';
const MAX_ATTEMPTS = 6;
const SESSION_COOKIE = 'palavra_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const normalize = value => String(value)
  .normalize('NFD')
  .replace(/\p{M}/gu, '')
  .toUpperCase()
  .trim();

function isWord(value, length) {
  const word = normalize(value);
  return /^[A-Z]+$/.test(word) && word.length === length;
}

function evaluateGuess(secret, guess) {
  const answer = normalize(secret);
  const attempt = normalize(guess);

  if (!isWord(answer, answer.length) || !isWord(attempt, answer.length)) {
    throw new Error('Palavra inválida para avaliação.');
  }

  const result = Array(answer.length).fill('absent');
  const remaining = new Map();

  for (let index = 0; index < answer.length; index += 1) {
    if (attempt[index] === answer[index]) {
      result[index] = 'correct';
    } else {
      remaining.set(answer[index], (remaining.get(answer[index]) || 0) + 1);
    }
  }

  for (let index = 0; index < answer.length; index += 1) {
    if (result[index] === 'correct') continue;
    const count = remaining.get(attempt[index]) || 0;
    if (count > 0) {
      result[index] = 'present';
      remaining.set(attempt[index], count - 1);
    }
  }

  return { result, isMatch: result.every(state => state === 'correct') };
}

function loadContent() {
  const content = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
  const categories = new Map();
  const allWords = new Set();
  const invalid = [];

  for (const category of content.categories) {
    const answers = {};
    for (const length of [4, 5, 6, 7]) {
      answers[length] = [];
      for (const rawWord of category.answers[String(length)] || []) {
        const word = normalize(rawWord);
        if (!isWord(word, length)) {
          invalid.push(`${category.id}:${rawWord}`);
          continue;
        }
        if (!answers[length].includes(word)) answers[length].push(word);
        allWords.add(word);
      }
    }
    categories.set(category.id, {
      id: category.id,
      name: category.name,
      icon: category.icon,
      answers
    });
  }

  if (invalid.length) {
    console.warn(`[SoloGame] Ignorando ${invalid.length} palavra(s) inválida(s) em solo.json.`);
  }

  try {
    const legacy = JSON.parse(fs.readFileSync(path.join(__dirname, 'words', 'geral.json'), 'utf8'));
    for (const rawWord of legacy.words || []) {
      const word = normalize(rawWord);
      if (word.length >= 4 && word.length <= 7 && /^[A-Z]+$/.test(word)) allWords.add(word);
    }
  } catch (error) {
    console.warn(`[SoloGame] Dicionário legado não carregado: ${error.message}`);
  }

  return { categories, allWords };
}

const CONTENT = loadContent();

function dateInTimeZone(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateOrdinal(date) {
  const [year, month, day] = date.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

function getDailyChallenge(date = dateInTimeZone()) {
  const dayIndex = dateOrdinal(date) - dateOrdinal(START_DATE);
  const schedule = [5, 4, 6, 5, 7, 5, 4];
  const wordLength = schedule[((dayIndex % schedule.length) + schedule.length) % schedule.length];
  const words = CONTENT.categories.get('geral').answers[wordLength];
  if (!words || !words.length) {
    throw new Error(`Nenhuma resposta disponível com ${wordLength} letras.`);
  }
  const digest = crypto.createHash('sha256').update(date).digest();
  const answer = words[digest.readUInt32BE(0) % words.length];
  const challengeNumber = dayIndex + 1;
  return {
    id: date,
    date,
    timezone: TIME_ZONE,
    challengeNumber,
    wordLength,
    maxAttempts: MAX_ATTEMPTS,
    answer
  };
}

function initialState() {
  return { version: 1, profiles: [], sessions: [], dailyGames: [], practiceGames: [] };
}

let state;
let queue = Promise.resolve();

async function initialize() {
  if (state) return;
  await fs.promises.mkdir(path.dirname(DATA_PATH), { recursive: true });
  try {
    const saved = JSON.parse(await fs.promises.readFile(DATA_PATH, 'utf8'));
    if (saved.version !== 1 || !Array.isArray(saved.profiles) || !Array.isArray(saved.sessions)
      || !Array.isArray(saved.dailyGames) || !Array.isArray(saved.practiceGames)) {
      throw new Error('Formato de persistência do jogo solo desconhecido.');
    }
    state = saved;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = initialState();
    await persist(state);
  }
}

async function persist(nextState) {
  const temporary = `${DATA_PATH}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await fs.promises.writeFile(temporary, JSON.stringify(nextState), { mode: 0o600 });
  try {
    await fs.promises.rename(temporary, DATA_PATH);
  } catch (error) {
    await fs.promises.rm(temporary, { force: true });
    throw error;
  }
}

function mutate(change) {
  const operation = queue.then(async () => {
    await initialize();
    const draft = structuredClone(state);
    const result = await change(draft);
    await persist(draft);
    state = draft;
    return result;
  });
  queue = operation.catch(() => {});
  return operation;
}

async function readState() {
  await queue;
  await initialize();
  return state;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getCookie(req, name) {
  const cookies = (req.headers.cookie || '').split(';');
  const item = cookies.find(cookie => cookie.trim().startsWith(`${name}=`));
  if (!item) return null;
  try {
    return decodeURIComponent(item.trim().slice(name.length + 1));
  } catch {
    return null;
  }
}

function findSessionProfile(saved, token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = saved.sessions.find(item => item.tokenHash === tokenHash
    && item.expiresAt > Date.now() && !item.revokedAt);
  if (!session) return null;
  const profile = saved.profiles.find(item => item.id === session.profileId);
  return profile && !profile.deletedAt ? profile : null;
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`);
}

function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

async function ensureProfile(req, res) {
  const rawToken = getCookie(req, SESSION_COOKIE);
  const saved = await readState();
  const existingProfile = findSessionProfile(saved, rawToken);
  if (existingProfile) return existingProfile;

  const token = crypto.randomBytes(32).toString('base64url');
  const profile = { id: crypto.randomUUID(), nickname: null, createdAt: new Date().toISOString() };
  await mutate(draft => {
    draft.profiles.push(profile);
    draft.sessions.push({
      id: crypto.randomUUID(),
      profileId: profile.id,
      tokenHash: hashToken(token),
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
      revokedAt: null
    });
  });
  setSessionCookie(res, token);
  return profile;
}

function ensureSameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (origin) {
    try {
      if (new URL(origin).host !== req.get('host')) {
        return res.status(403).json({ error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Origem não permitida.' } });
      }
    } catch {
      return res.status(403).json({ error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Origem não permitida.' } });
    }
  }
  if (['POST', 'PATCH', 'PUT'].includes(req.method)
    && !String(req.get('content-type') || '').toLowerCase().startsWith('application/json')) {
    return res.status(415).json({ error: { code: 'JSON_REQUIRED', message: 'Envie os dados no formato JSON.' } });
  }
  return next();
}

function createRateLimiter({ limit, windowMs, key }) {
  const events = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const identifier = key(req);
    const recent = (events.get(identifier) || []).filter(timestamp => timestamp > now - windowMs);
    if (recent.length >= limit) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde um pouco e tente novamente.' } });
    }
    recent.push(now);
    events.set(identifier, recent);
    if (events.size > 5000) {
      for (const [entry, timestamps] of events) {
        if (!timestamps.some(timestamp => timestamp > now - windowMs)) events.delete(entry);
      }
    }
    return next();
  };
}

const guessRateLimit = createRateLimiter({
  limit: 30,
  windowMs: 60 * 1000,
  key: req => req.ip
});

const profileBootstrapRateLimit = createRateLimiter({
  limit: 10,
  windowMs: 60 * 1000,
  key: req => req.ip
});

async function limitProfileBootstrap(req, res, next) {
  try {
    const saved = await readState();
    if (findSessionProfile(saved, getCookie(req, SESSION_COOKIE))) return next();
    return profileBootstrapRateLimit(req, res, next);
  } catch (error) {
    return next(error);
  }
}

function apiError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

function gameView(game, challenge) {
  const finished = game && (game.status === 'won' || game.status === 'lost');
  return {
    id: challenge.id,
    date: challenge.date,
    timezone: challenge.timezone,
    challengeNumber: challenge.challengeNumber,
    wordLength: challenge.wordLength,
    maxAttempts: MAX_ATTEMPTS,
    status: game ? game.status : 'not_started',
    guesses: game ? game.guesses : [],
    attemptsRemaining: MAX_ATTEMPTS - (game ? game.guesses.length : 0),
    ...(finished ? { answer: challenge.answer } : {})
  };
}

function guessResponse(game, answer, idempotencyKey) {
  const guess = game.guesses.find(item => item.requestId === idempotencyKey);
  const finished = game.status === 'won' || game.status === 'lost';
  return {
    guess,
    status: game.status,
    attemptsRemaining: MAX_ATTEMPTS - game.guesses.length,
    ...(finished ? { answer } : {})
  };
}

function validIdempotencyKey(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function getStats(saved, profileId, today) {
  const completed = saved.dailyGames.filter(game => game.profileId === profileId
    && (game.status === 'won' || game.status === 'lost'));
  const wins = completed.filter(game => game.status === 'won');
  const distribution = Array(MAX_ATTEMPTS).fill(0);
  for (const game of wins) distribution[game.guesses.length - 1] += 1;

  const winsByDate = new Set(wins.map(game => game.challengeDate));
  const dates = [...winsByDate].sort();
  let bestStreak = 0;
  let run = 0;
  let previous = null;
  for (const date of dates) {
    const ordinal = dateOrdinal(date);
    run = previous !== null && ordinal === previous + 1 ? run + 1 : 1;
    previous = ordinal;
    bestStreak = Math.max(bestStreak, run);
  }

  let currentStreak = 0;
  const playedToday = completed.some(game => game.challengeDate === today);
  if (!playedToday || winsByDate.has(today)) {
    let cursor = winsByDate.has(today) ? today : addDays(today, -1);
    while (winsByDate.has(cursor)) {
      currentStreak += 1;
      cursor = addDays(cursor, -1);
    }
  }

  return {
    played: completed.length,
    wins: wins.length,
    winRate: completed.length ? Math.round((wins.length / completed.length) * 100) : 0,
    distribution,
    currentStreak,
    bestStreak
  };
}

function addDays(date, amount) {
  const ordinal = dateOrdinal(date) + amount;
  return new Date(ordinal * 86400000).toISOString().slice(0, 10);
}

function getRanking(saved, date, limit, offset) {
  const profiles = new Map(saved.profiles.map(profile => [profile.id, profile]));
  const winners = saved.dailyGames
    .filter(game => game.challengeDate === date && game.status === 'won')
    .map(game => ({ game, profile: profiles.get(game.profileId) }))
    .filter(item => item.profile && item.profile.nickname && !item.profile.deletedAt)
    .sort((a, b) => a.game.guesses.length - b.game.guesses.length
      || a.profile.nickname.localeCompare(b.profile.nickname));
  let previousAttempts = null;
  let rank = 0;
  const rankedWinners = winners.map((item, index) => {
    if (item.game.guesses.length !== previousAttempts) rank = index + 1;
    previousAttempts = item.game.guesses.length;
    return {
      rank,
      nickname: item.profile.nickname,
      attempts: item.game.guesses.length
    };
  });
  const entries = rankedWinners.slice(offset, offset + limit);
  const hasMore = offset + limit < winners.length;
  return {
    date,
    entries,
    nextCursor: hasMore ? Buffer.from(String(offset + limit)).toString('base64url') : null
  };
}

function decodeCursor(cursor) {
  if (!cursor) return 0;
  try {
    const offset = Number(Buffer.from(cursor, 'base64url').toString('utf8'));
    return Number.isInteger(offset) && offset >= 0 ? offset : null;
  } catch {
    return null;
  }
}

function validNickname(value) {
  return typeof value === 'string'
    && value.trim().length >= 2
    && value.trim().length <= 20
    && /^[\p{L}\p{M}\p{N} _-]+$/u.test(value.trim())
    && !/^\s*$/.test(value);
}

async function registerSoloGameRoutes(app) {
  await initialize();
  app.use('/api/v1', require('express').json({ limit: '2kb', strict: true }), ensureSameOrigin, limitProfileBootstrap);

  app.get('/api/v1/profile', async (req, res, next) => {
    try {
      const profile = await ensureProfile(req, res);
      res.setHeader('Cache-Control', 'no-store');
      res.json({ profile: { nickname: profile.nickname } });
    } catch (error) {
      next(error);
    }
  });

  app.patch('/api/v1/profile', async (req, res, next) => {
    try {
      const profile = await ensureProfile(req, res);
      const nickname = req.body && req.body.nickname;
      if (nickname !== null && nickname !== '' && !validNickname(nickname)) {
        return apiError(res, 400, 'INVALID_NICKNAME', 'Use um apelido de 2 a 20 caracteres, com letras, números, espaços, hífen ou sublinhado.');
      }
      const normalizedNickname = nickname === null || nickname === '' ? null : nickname.trim();
      const updated = await mutate(draft => {
        const target = draft.profiles.find(item => item.id === profile.id);
        if (!target || target.deletedAt) return null;
        target.nickname = normalizedNickname;
        target.updatedAt = new Date().toISOString();
        return target;
      });
      if (!updated) return apiError(res, 404, 'PROFILE_NOT_FOUND', 'Perfil não encontrado.');
      return res.json({ profile: { nickname: updated.nickname } });
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/v1/profile', async (req, res, next) => {
    try {
      const profile = await ensureProfile(req, res);
      await mutate(draft => {
        draft.profiles = draft.profiles.filter(item => item.id !== profile.id);
        draft.sessions = draft.sessions.filter(item => item.profileId !== profile.id);
        draft.dailyGames = draft.dailyGames.filter(item => item.profileId !== profile.id);
        draft.practiceGames = draft.practiceGames.filter(item => item.profileId !== profile.id);
      });
      clearSessionCookie(res);
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/v1/challenge/today', async (req, res, next) => {
    try {
      const profile = await ensureProfile(req, res);
      const challenge = getDailyChallenge();
      const saved = await readState();
      const game = saved.dailyGames.find(item => item.profileId === profile.id && item.challengeDate === challenge.date);
      res.setHeader('Cache-Control', 'no-store');
      return res.json(gameView(game, challenge));
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/v1/challenge/:challengeId/guesses', guessRateLimit, async (req, res, next) => {
    try {
      const profile = await ensureProfile(req, res);
      const challenge = getDailyChallenge();
      if (req.params.challengeId !== challenge.id) {
        return apiError(res, 404, 'CHALLENGE_NOT_FOUND', 'Esse desafio diário não está disponível.');
      }
      const guess = req.body && req.body.guess;
      const requestId = req.body && req.body.requestId;
      if (typeof guess !== 'string' || guess.length > 32 || !validIdempotencyKey(requestId)) {
        return apiError(res, 400, 'INVALID_REQUEST', 'Palpite ou identificador da tentativa inválido.');
      }
      const normalizedGuess = normalize(guess);
      if (!isWord(normalizedGuess, challenge.wordLength)) {
        return apiError(res, 400, 'INVALID_GUESS_LENGTH', `Digite uma palavra com exatamente ${challenge.wordLength} letras.`);
      }
      if (!CONTENT.allWords.has(normalizedGuess)) {
        return apiError(res, 422, 'UNKNOWN_WORD', 'Essa palavra não está no vocabulário aceito.');
      }

      const response = await mutate(draft => {
        let game = draft.dailyGames.find(item => item.profileId === profile.id && item.challengeDate === challenge.date);
        if (game && game.guesses.some(item => item.requestId === requestId)) {
          return guessResponse(game, challenge.answer, requestId);
        }
        if (game && (game.status === 'won' || game.status === 'lost')) {
          return { error: 'GAME_FINISHED' };
        }
        if (!game) {
          game = {
            id: crypto.randomUUID(),
            profileId: profile.id,
            challengeDate: challenge.date,
            status: 'in_progress',
            guesses: [],
            startedAt: new Date().toISOString(),
            completedAt: null
          };
          draft.dailyGames.push(game);
        }
        const evaluation = evaluateGuess(challenge.answer, normalizedGuess);
        game.guesses.push({
          guess: normalizedGuess,
          result: evaluation.result,
          requestId,
          createdAt: new Date().toISOString()
        });
        if (evaluation.isMatch) game.status = 'won';
        else if (game.guesses.length >= MAX_ATTEMPTS) game.status = 'lost';
        if (game.status === 'won' || game.status === 'lost') game.completedAt = new Date().toISOString();
        return guessResponse(game, challenge.answer, requestId);
      });
      if (response.error) return apiError(res, 409, 'GAME_FINISHED', 'Você já concluiu o desafio de hoje.');
      res.setHeader('Cache-Control', 'no-store');
      return res.json(response);
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/v1/challenge/:challengeId/result', async (req, res, next) => {
    try {
      const profile = await ensureProfile(req, res);
      const challenge = getDailyChallenge();
      if (req.params.challengeId !== challenge.id) {
        return apiError(res, 404, 'CHALLENGE_NOT_FOUND', 'Esse desafio diário não está disponível.');
      }
      const saved = await readState();
      const game = saved.dailyGames.find(item => item.profileId === profile.id && item.challengeDate === challenge.date);
      if (!game || !['won', 'lost'].includes(game.status)) {
        return apiError(res, 409, 'RESULT_NOT_READY', 'O resultado aparece quando o desafio termina.');
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.json(gameView(game, challenge));
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/v1/categories', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json([...CONTENT.categories.values()].map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      lengths: Object.keys(category.answers).map(Number).filter(length => category.answers[length].length > 0)
    })));
  });

  app.post('/api/v1/practice', async (req, res, next) => {
    try {
      const profile = await ensureProfile(req, res);
      const { categoryId, wordLength } = req.body || {};
      const category = CONTENT.categories.get(categoryId);
      if (!category || ![4, 5, 6, 7].includes(Number(wordLength))) {
        return apiError(res, 400, 'INVALID_PRACTICE_OPTIONS', 'Escolha um tema e um tamanho de palavra disponíveis.');
      }
      const answers = category.answers[Number(wordLength)];
      if (!answers || !answers.length) {
        return apiError(res, 422, 'NO_WORDS_AVAILABLE', 'Ainda não há palavras para essa combinação. Escolha outro tema ou tamanho.');
      }
      const answer = answers[crypto.randomInt(answers.length)];
      const practice = {
        id: crypto.randomUUID(),
        profileId: profile.id,
        categoryId,
        wordLength: Number(wordLength),
        answer,
        status: 'in_progress',
        guesses: [],
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000
      };
      await mutate(draft => {
        draft.practiceGames = draft.practiceGames.filter(game => game.expiresAt > Date.now());
        draft.practiceGames.push(practice);
      });
      return res.status(201).json({
        id: practice.id,
        categoryId,
        wordLength: practice.wordLength,
        maxAttempts: MAX_ATTEMPTS,
        status: practice.status,
        guesses: []
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/v1/practice/:sessionId', async (req, res, next) => {
    try {
      const profile = await ensureProfile(req, res);
      const saved = await readState();
      const practice = saved.practiceGames.find(item => item.id === req.params.sessionId
        && item.profileId === profile.id && item.expiresAt > Date.now());
      if (!practice) return apiError(res, 404, 'PRACTICE_NOT_FOUND', 'A sessão de prática não está mais disponível.');
      return res.json({
        id: practice.id,
        categoryId: practice.categoryId,
        wordLength: practice.wordLength,
        maxAttempts: MAX_ATTEMPTS,
        status: practice.status,
        guesses: practice.guesses,
        attemptsRemaining: MAX_ATTEMPTS - practice.guesses.length,
        ...(['won', 'lost'].includes(practice.status) ? { answer: practice.answer } : {})
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/v1/practice/:sessionId/guesses', guessRateLimit, async (req, res, next) => {
    try {
      const profile = await ensureProfile(req, res);
      const { guess, requestId } = req.body || {};
      const saved = await readState();
      const practice = saved.practiceGames.find(item => item.id === req.params.sessionId
        && item.profileId === profile.id && item.expiresAt > Date.now());
      if (!practice) return apiError(res, 404, 'PRACTICE_NOT_FOUND', 'A sessão de prática não está mais disponível.');
      if (typeof guess !== 'string' || guess.length > 32 || !validIdempotencyKey(requestId)) {
        return apiError(res, 400, 'INVALID_REQUEST', 'Palpite ou identificador da tentativa inválido.');
      }
      const normalizedGuess = normalize(guess);
      if (!isWord(normalizedGuess, practice.wordLength)) {
        return apiError(res, 400, 'INVALID_GUESS_LENGTH', `Digite uma palavra com exatamente ${practice.wordLength} letras.`);
      }
      if (!CONTENT.allWords.has(normalizedGuess)) {
        return apiError(res, 422, 'UNKNOWN_WORD', 'Essa palavra não está no vocabulário aceito.');
      }
      const response = await mutate(draft => {
        const game = draft.practiceGames.find(item => item.id === practice.id
          && item.profileId === profile.id && item.expiresAt > Date.now());
        if (!game) return { error: 'PRACTICE_NOT_FOUND' };
        const repeated = game.guesses.find(item => item.requestId === requestId);
        if (repeated) {
          return {
            guess: repeated,
            status: game.status,
            attemptsRemaining: MAX_ATTEMPTS - game.guesses.length,
            ...(game.status === 'won' || game.status === 'lost' ? { answer: game.answer } : {})
          };
        }
        if (game.status !== 'in_progress') return { error: 'GAME_FINISHED' };
        const evaluation = evaluateGuess(game.answer, normalizedGuess);
        game.guesses.push({ guess: normalizedGuess, result: evaluation.result, requestId, createdAt: new Date().toISOString() });
        if (evaluation.isMatch) game.status = 'won';
        else if (game.guesses.length >= MAX_ATTEMPTS) game.status = 'lost';
        return {
          guess: game.guesses[game.guesses.length - 1],
          status: game.status,
          attemptsRemaining: MAX_ATTEMPTS - game.guesses.length,
          ...(game.status === 'won' || game.status === 'lost' ? { answer: game.answer } : {})
        };
      });
      if (response.error === 'PRACTICE_NOT_FOUND') return apiError(res, 404, 'PRACTICE_NOT_FOUND', 'A sessão de prática não está mais disponível.');
      if (response.error) return apiError(res, 409, 'GAME_FINISHED', 'Essa partida de prática já terminou.');
      return res.json(response);
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/v1/practice/:sessionId', async (req, res, next) => {
    try {
      const profile = await ensureProfile(req, res);
      await mutate(draft => {
        draft.practiceGames = draft.practiceGames.filter(game => !(game.id === req.params.sessionId
          && game.profileId === profile.id));
      });
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/v1/stats/me', async (req, res, next) => {
    try {
      const profile = await ensureProfile(req, res);
      const saved = await readState();
      res.setHeader('Cache-Control', 'no-store');
      return res.json(getStats(saved, profile.id, dateInTimeZone()));
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/v1/leaderboard', async (req, res, next) => {
    try {
      const date = req.query.date || dateInTimeZone();
      const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : null;
      if (!parsedDate || Number.isNaN(parsedDate.getTime())
        || parsedDate.toISOString().slice(0, 10) !== date || date > dateInTimeZone()) {
        return apiError(res, 400, 'INVALID_DATE', 'Informe uma data válida de desafio.');
      }
      const rawLimit = Number(req.query.limit || 20);
      if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) {
        return apiError(res, 400, 'INVALID_LIMIT', 'O limite deve ser um número entre 1 e 100.');
      }
      const offset = decodeCursor(req.query.cursor);
      if (offset === null) return apiError(res, 400, 'INVALID_CURSOR', 'O cursor de paginação é inválido.');
      const saved = await readState();
      res.setHeader('Cache-Control', 'no-store');
      return res.json(getRanking(saved, date, rawLimit, offset));
    } catch (error) {
      return next(error);
    }
  });
}

module.exports = {
  registerSoloGameRoutes,
  normalize,
  evaluateGuess,
  getDailyChallenge,
  getStats,
  getRanking,
  isWord
};
