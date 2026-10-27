const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateGuess, getDailyChallenge, getStats, getRanking, isWord, normalize } = require('./soloGame');

test('normalizes Portuguese accents and validates the requested length', () => {
  assert.equal(normalize('  ação  '), 'ACAO');
  assert.equal(isWord('ação', 4), true);
  assert.equal(isWord('ação!', 4), false);
  assert.equal(isWord('café', 5), false);
});

test('evaluates repeated letters without over-counting them', () => {
  const result = evaluateGuess('LEVEL', 'ELLEE');
  assert.deepEqual(result.result, ['present', 'present', 'present', 'correct', 'absent']);
  assert.equal(result.isMatch, false);
});

test('marks a complete match and supports lengths from four to seven', () => {
  for (const word of ['CASA', 'TERMO', 'ABRIGO', 'ABACATE']) {
    const result = evaluateGuess(word, word);
    assert.equal(result.isMatch, true);
    assert.deepEqual(result.result, Array(word.length).fill('correct'));
  }
});

test('returns a stable shared daily challenge for a date', () => {
  const first = getDailyChallenge('2026-10-27');
  const second = getDailyChallenge('2026-10-27');
  assert.deepEqual(first, second);
  assert.equal(first.challengeNumber, 1);
  assert.equal(first.wordLength, 5);
  assert.equal(isWord(first.answer, first.wordLength), true);
});

test('computes win distribution and resets a streak after a loss today', () => {
  const saved = {
    dailyGames: [
      { profileId: 'p1', challengeDate: '2026-10-25', status: 'won', guesses: [{}, {}] },
      { profileId: 'p1', challengeDate: '2026-10-26', status: 'won', guesses: [{}, {}, {}] },
      { profileId: 'p1', challengeDate: '2026-10-27', status: 'lost', guesses: Array(6).fill({}) }
    ]
  };
  assert.deepEqual(getStats(saved, 'p1', '2026-10-27'), {
    played: 3,
    wins: 2,
    winRate: 67,
    distribution: [0, 1, 1, 0, 0, 0],
    currentStreak: 0,
    bestStreak: 2
  });
});

test('publishes only opted-in winning profiles and gives equal scores equal rank', () => {
  const saved = {
    profiles: [
      { id: 'a', nickname: 'Ana' },
      { id: 'b', nickname: null },
      { id: 'c', nickname: 'Bia' }
    ],
    dailyGames: [
      { profileId: 'a', challengeDate: '2026-10-27', status: 'won', guesses: [{}, {}, {}] },
      { profileId: 'b', challengeDate: '2026-10-27', status: 'won', guesses: [{}] },
      { profileId: 'c', challengeDate: '2026-10-27', status: 'won', guesses: [{}, {}, {}] }
    ]
  };
  assert.deepEqual(getRanking(saved, '2026-10-27', 20, 0).entries, [
    { rank: 1, nickname: 'Ana', attempts: 3 },
    { rank: 1, nickname: 'Bia', attempts: 3 }
  ]);
});
