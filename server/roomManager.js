const gameEngine = require('./gameEngine');

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> roomData
    this.playerToRoom = new Map(); // socketId -> roomCode
    this.quickMatchQueue = []; // lista de socketIds aguardando
  }

  generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(hostSocketId, nickname = 'Jogador 1', theme = 'geral') {
    const code = this.generateCode();
    const secretWord = gameEngine.getRandomWord(theme);

    const room = {
      code,
      theme,
      themeName: gameEngine.dictionaries[theme]?.name || 'Geral',
      themeIcon: gameEngine.dictionaries[theme]?.icon || '🧠',
      status: 'WAITING', // WAITING, COUNTDOWN, IN_RACE, GAME_OVER
      secretWord,
      players: [
        {
          id: hostSocketId,
          nickname: nickname.trim() || 'Jogador 1',
          currentRow: 0,
          isWinner: false,
          guesses: [],
          connected: true,
          ready: false
        }
      ],
      rematchRequests: new Set(),
      createdAt: Date.now()
    };

    this.rooms.set(code, room);
    this.playerToRoom.set(hostSocketId, code);
    return room;
  }

  joinRoom(socketId, code, nickname = 'Jogador 2') {
    const normalizedCode = code.toUpperCase().trim();
    const room = this.rooms.get(normalizedCode);

    if (!room) {
      return { error: 'Sala não encontrada. Verifique o código.' };
    }

    if (room.status !== 'WAITING') {
      return { error: 'Esta partida já foi iniciada ou encerrada.' };
    }

    if (room.players.length >= 2) {
      return { error: 'Esta sala já está cheia (máximo de 2 jogadores).' };
    }

    const player = {
      id: socketId,
      nickname: nickname.trim() || 'Jogador 2',
      currentRow: 0,
      isWinner: false,
      guesses: [],
      connected: true,
      ready: false
    };

    room.players.push(player);
    this.playerToRoom.set(socketId, normalizedCode);

    return { room };
  }

  setPlayerReady(socketId, isReady = true) {
    const room = this.getRoomByPlayerId(socketId);
    if (!room) return null;

    const player = room.players.find(p => p.id === socketId);
    if (!player) return null;

    player.ready = isReady;
    const allReady = room.players.length === 2 && room.players.every(p => p.ready);

    return { room, player, allReady };
  }

  joinQuickMatch(socketId, nickname = 'Duelista', theme = 'geral') {
    // Procura uma sala já em espera compatível
    for (const [code, room] of this.rooms.entries()) {
      if (room.status === 'WAITING' && room.players.length === 1) {
        return this.joinRoom(socketId, code, nickname);
      }
    }

    // Se não encontrou nenhuma aberta, cria uma nova
    const newRoom = this.createRoom(socketId, nickname, theme);
    return { room: newRoom, isWaiting: true };
  }

  getRoom(code) {
    if (!code) return null;
    return this.rooms.get(code.toUpperCase().trim());
  }

  getRoomByPlayerId(socketId) {
    const code = this.playerToRoom.get(socketId);
    if (!code) return null;
    return this.rooms.get(code);
  }

  handleGuess(socketId, guess, row) {
    const room = this.getRoomByPlayerId(socketId);
    if (!room || room.status !== 'IN_RACE') {
      return { error: 'Partida não está ativa.' };
    }

    const player = room.players.find(p => p.id === socketId);
    const opponent = room.players.find(p => p.id !== socketId);

    if (!player) return { error: 'Jogador não encontrado na sala.' };

    const evaluation = gameEngine.evaluateGuess(room.secretWord, guess);

    player.currentRow = row + 1;
    player.guesses.push({
      guess,
      result: evaluation.result,
      row
    });

    let gameOver = false;
    let winnerId = null;

    if (evaluation.isMatch) {
      player.isWinner = true;
      room.status = 'GAME_OVER';
      gameOver = true;
      winnerId = player.id;
    } else if (player.currentRow >= 6) {
      // Se ambos esgotaram 6 tentativas sem acertar -> Empate
      if (opponent && opponent.currentRow >= 6 && !opponent.isWinner) {
        room.status = 'GAME_OVER';
        gameOver = true;
        winnerId = null; // Empate
      }
    }

    return {
      room,
      player,
      opponent,
      evaluation,
      gameOver,
      winnerId,
      secretWord: gameOver ? room.secretWord : null
    };
  }

  requestRematch(socketId) {
    const room = this.getRoomByPlayerId(socketId);
    if (!room || room.status !== 'GAME_OVER') return null;

    room.rematchRequests.add(socketId);

    if (room.rematchRequests.size >= 2) {
      // Ambos aceitaram a revanche! Reinicia o tabuleiro com nova palavra
      room.secretWord = gameEngine.getRandomWord(room.theme);
      room.status = 'COUNTDOWN';
      room.rematchRequests.clear();
      room.players.forEach(p => {
        p.currentRow = 0;
        p.isWinner = false;
        p.guesses = [];
      });
      return { restarted: true, room };
    }

    return { restarted: false, room };
  }

  handleDisconnect(socketId) {
    const code = this.playerToRoom.get(socketId);
    if (!code) return null;

    this.playerToRoom.delete(socketId);
    const room = this.rooms.get(code);
    if (!room) return null;

    if (room.countdownInterval) {
      clearInterval(room.countdownInterval);
      room.countdownInterval = null;
    }

    const leavingPlayer = room.players.find(p => p.id === socketId);
    const remainingPlayer = room.players.find(p => p.id !== socketId);

    if (room.status === 'IN_RACE' && remainingPlayer) {
      room.status = 'GAME_OVER';
      remainingPlayer.isWinner = true;
      return {
        room,
        forfeitWinner: remainingPlayer.id,
        secretWord: room.secretWord
      };
    }

    // Se estiver no lobby e o anfitrião sair, remove a sala
    if (room.status === 'WAITING' || !remainingPlayer) {
      this.rooms.delete(code);
      return { roomDeleted: true, code };
    }

    return { room };
  }
}

module.exports = new RoomManager();
