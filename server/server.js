const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const roomManager = require('./roomManager');
const gameEngine = require('./gameEngine');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

// Servir arquivos estáticos do diretório public
app.use(express.static(path.join(__dirname, '../public')));

// Rota de API para obter as categorias disponíveis
app.get('/api/categories', (req, res) => {
  res.json(gameEngine.getCategories());
});

// Fallback para SPA / PWA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// GESTÃO DE EVENTOS EM TEMPO REAL (SOCKET.IO)
io.on('connection', (socket) => {
  console.log(`[Socket] Conectado: ${socket.id}`);

  // 1. Criar sala privada
  socket.on('create-room', ({ nickname, theme }) => {
    const room = roomManager.createRoom(socket.id, nickname, theme);
    socket.join(room.code);
    console.log(`[Room] Sala criada: ${room.code} por ${nickname}`);
    socket.emit('room-created', {
      code: room.code,
      theme: room.theme,
      themeName: room.themeName,
      themeIcon: room.themeIcon,
      players: room.players
    });
  });

  // 2. Entrar em sala por código
  socket.on('join-room', ({ code, nickname }) => {
    const result = roomManager.joinRoom(socket.id, code, nickname);
    if (result.error) {
      socket.emit('join-error', { message: result.error });
      return;
    }

    const room = result.room;
    socket.join(room.code);
    console.log(`[Room] Jogador ${nickname} entrou na sala ${room.code}`);

    // Confirma entrada para o jogador que acabou de entrar
    socket.emit('room-joined', {
      code: room.code,
      theme: room.theme,
      themeName: room.themeName,
      themeIcon: room.themeIcon,
      players: room.players
    });

    // Notifica todos na sala com a lista atualizada de jogadores
    io.to(room.code).emit('player-joined', {
      players: room.players
    });
  });

  // 2.1 Jogador confirma que está pronto
  socket.on('player-ready', ({ isReady }) => {
    const result = roomManager.setPlayerReady(socket.id, isReady);
    if (!result) return;

    const { room, allReady } = result;
    io.to(room.code).emit('room-players-updated', {
      players: room.players
    });

    // Quando AMBOS os jogadores estiverem prontos, inicia a contagem!
    if (allReady) {
      console.log(`[Room] Ambos jogadores prontos na sala ${room.code}. Iniciando contagem!`);
      startMatchWithCountdown(room);
    }
  });

  // 3. Fila de Partida Rápida
  socket.on('quick-match', ({ nickname, theme }) => {
    const result = roomManager.joinQuickMatch(socket.id, nickname, theme);
    if (result.error) {
      socket.emit('join-error', { message: result.error });
      return;
    }

    const room = result.room;
    socket.join(room.code);

    if (result.isWaiting) {
      socket.emit('waiting-opponent', { code: room.code, players: room.players });
    } else {
      socket.emit('room-joined', {
        code: room.code,
        theme: room.theme,
        themeName: room.themeName,
        themeIcon: room.themeIcon,
        players: room.players
      });
      io.to(room.code).emit('player-joined', { players: room.players });
    }
  });

  // 4. Indicador de digitação (pulso no avatar do oponente)
  socket.on('player-typing', ({ isTyping }) => {
    const room = roomManager.getRoomByPlayerId(socket.id);
    if (!room) return;
    socket.to(room.code).emit('opponent-typing-status', { isTyping });
  });

  // 5. Envio de palpite durante a corrida (submit-guess)
  socket.on('submit-guess', ({ guess, row }) => {
    const result = roomManager.handleGuess(socket.id, guess, row);
    if (result.error) {
      socket.emit('guess-error', { message: result.error });
      return;
    }

    const { room, player, opponent, evaluation, gameOver, winnerId, secretWord } = result;

    // Resposta para quem enviou o palpite (com resultado completo das cores)
    socket.emit('guess-result', {
      row,
      guess,
      result: evaluation.result,
      isMatch: evaluation.isMatch,
      currentRow: player.currentRow
    });

    // Notificação para o oponente: APENAS A MÁSCARA DE CORES (ANTI-CHEAT)
    if (opponent) {
      socket.to(room.code).emit('opponent-progress', {
        row,
        mask: evaluation.mask, // Apenas 'correct', 'present', 'absent'
        currentRow: player.currentRow
      });
    }

    // Se houve vitória ou término da corrida
    if (gameOver) {
      console.log(`[Game] Partida ${room.code} encerrada! Vencedor: ${winnerId}`);
      io.to(room.code).emit('game-over', {
        winnerId,
        secretWord,
        reason: winnerId ? 'solved' : 'tie',
        players: room.players
      });
    }
  });

  // 6. Solicitação de revanche
  socket.on('request-rematch', () => {
    const result = roomManager.requestRematch(socket.id);
    if (!result) return;

    if (result.restarted) {
      io.to(result.room.code).emit('rematch-accepted');
      startMatchWithCountdown(result.room);
    } else {
      socket.to(result.room.code).emit('opponent-wants-rematch');
      socket.emit('rematch-requested');
    }
  });

  // 7. Desconexão
  socket.on('disconnect', () => {
    console.log(`[Socket] Desconectado: ${socket.id}`);
    const result = roomManager.handleDisconnect(socket.id);
    if (!result) return;

    if (result.forfeitWinner) {
      io.to(result.room.code).emit('game-over', {
        winnerId: result.forfeitWinner,
        secretWord: result.secretWord,
        reason: 'forfeit',
        message: 'O oponente desconectou. Vitória por W.O.!'
      });
    } else if (result.room) {
      io.to(result.room.code).emit('player-left', {
        message: 'Um jogador saiu da sala.'
      });
    }
  });
});

// Função auxiliar para iniciar a contagem regressiva e partida
function startMatchWithCountdown(room) {
  if (room.status === 'COUNTDOWN' || room.status === 'IN_RACE') {
    return;
  }
  room.status = 'COUNTDOWN';
  let count = 3;

  console.log(`[Countdown] Sala ${room.code}: ${count}`);
  io.to(room.code).emit('countdown-tick', { count });

  if (room.countdownInterval) {
    clearInterval(room.countdownInterval);
  }

  room.countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      console.log(`[Countdown] Sala ${room.code}: ${count}`);
      io.to(room.code).emit('countdown-tick', { count });
    } else {
      clearInterval(room.countdownInterval);
      room.countdownInterval = null;
      room.status = 'IN_RACE';
      console.log(`[Game] Corrida iniciada na sala ${room.code}!`);
      io.to(room.code).emit('match-start', {
        theme: room.theme,
        themeName: room.themeName,
        themeIcon: room.themeIcon,
        wordLength: 5,
        players: room.players
      });
    }
  }, 1000);
}

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`⚔️  TERMO DUELO (Arena Cyber 1v1 PWA) no ar!`);
  console.log(`📡 Servidor ativo na porta: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
