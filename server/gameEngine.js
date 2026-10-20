const fs = require('fs');
const path = require('path');

class GameEngine {
  constructor() {
    this.dictionaries = {};
    this.allValidWords = new Set();
    this.loadDictionaries();
  }

  loadDictionaries() {
    const wordsDir = path.join(__dirname, 'words');
    const files = fs.readdirSync(wordsDir);

    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(wordsDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        this.dictionaries[data.category] = data;
        
        data.words.forEach(w => {
          const clean = this.sanitize(w);
          if (clean.length === 5) {
            this.allValidWords.add(clean);
          }
        });
      }
    });

    // Adiciona palavras padrão para flexibilidade de chutes
    const extraWords = [
      "AMIGO", "BARRA", "CANTO", "DADO1", "DADOS", "FALAR", "GOSTO", "HORAS", "JOGAR",
      "LUGAR", "MARTE", "NAVIO", "ONTEM", "PARAR", "QUERO", "RESTO", "SABER", "TUDO1",
      "VALOR", "XADRZ", "ZEBRA", "AREIA", "BICHO", "CARRO", "DENTE", "ENVIO", "FORCA"
    ];
    extraWords.forEach(w => this.allValidWords.add(this.sanitize(w)));
  }

  sanitize(word) {
    if (!word) return '';
    return word
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  }

  getRandomWord(category = 'geral') {
    const dict = this.dictionaries[category] || this.dictionaries['geral'];
    if (!dict || !dict.words || dict.words.length === 0) {
      return 'TERMO';
    }
    const idx = Math.floor(Math.random() * dict.words.length);
    return this.sanitize(dict.words[idx]);
  }

  getCategories() {
    return Object.keys(this.dictionaries).map(k => ({
      id: k,
      name: this.dictionaries[k].name,
      icon: this.dictionaries[k].icon
    }));
  }

  /**
   * Avalia o palpite contra a palavra secreta utilizando o algoritmo clássico
   * de Mastermind/Wordle (com tratamento correto para letras repetidas).
   */
  evaluateGuess(secretWord, guess) {
    const cleanSecret = this.sanitize(secretWord);
    const cleanGuess = this.sanitize(guess);
    const length = 5;

    if (cleanGuess.length !== length) {
      throw new Error('O palpite deve ter exatamente 5 letras.');
    }

    const secretArr = cleanSecret.split('');
    const guessArr = cleanGuess.split('');
    const result = new Array(length).fill('absent');
    const secretLetterCounts = {};

    // 1º Passo: Contar ocorrências na palavra secreta e marcar acertos exatos (Verde)
    for (let i = 0; i < length; i++) {
      const char = secretArr[i];
      secretLetterCounts[char] = (secretLetterCounts[char] || 0) + 1;
    }

    for (let i = 0; i < length; i++) {
      if (guessArr[i] === secretArr[i]) {
        result[i] = 'correct';
        secretLetterCounts[guessArr[i]]--;
      }
    }

    // 2º Passo: Marcar letras existentes em outra posição (Amarelo)
    for (let i = 0; i < length; i++) {
      if (result[i] !== 'correct') {
        const char = guessArr[i];
        if (secretLetterCounts[char] && secretLetterCounts[char] > 0) {
          result[i] = 'present';
          secretLetterCounts[char]--;
        }
      }
    }

    const isMatch = result.every(r => r === 'correct');

    return {
      isMatch,
      result,
      mask: result // Máscara segura anti-cheat enviada ao oponente
    };
  }
}

module.exports = new GameEngine();
