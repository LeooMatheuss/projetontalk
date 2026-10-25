const config = require('../config.js');
const validacao = require('../libs/validacao');

const ONLINES = 'livetalk:onlines';
const chaveSala = (sala) => `livetalk:sala:${sala}`;

const lerMensagem = (bruta) => {
  try {
    return JSON.parse(bruta);
  } catch {
    return { tipo: 'sistema', nome: '', msg: String(bruta).replace(/<[^>]*>/g, '') };
  }
};

module.exports = (app, io) => {
  const redis = app.get('redis');
  const { maxHistorico, maxMensagem } = config.chat;

  const registrar = async (sala, mensagem) => {
    const chave = chaveSala(sala);
    await redis.multi()
      .lPush(chave, JSON.stringify(mensagem))
      .lTrim(chave, 0, maxHistorico - 1)
      .exec();
    io.to(sala).emit('send-client', mensagem);
  };

  const falhar = (client, err) => {
    console.error('[socket] erro:', err.message);
    client.emit('chat-error', 'Não foi possível processar sua mensagem.');
  };

  io.use((client, next) => {
    const usuario = client.request.session?.usuario;
    if (!usuario) {
      return next(new Error('não autenticado'));
    }
    client.data.usuario = usuario;
    return next();
  });

  const desconexoes = new Set();
  app.set('aguardarDesconexoes', () => Promise.allSettled([...desconexoes]));

  const marcarOnline = async (client, email) => {
    await redis.hIncrBy(ONLINES, email, 1);
    const emails = await redis.hKeys(ONLINES);
    emails.forEach((online) => client.emit('notify-onlines', online));
    client.broadcast.emit('notify-onlines', email);
  };

  io.on('connection', (client) => {
    const { usuario } = client.data;
    const online = marcarOnline(client, usuario.email)
      .catch((err) => console.error('[socket] erro ao registrar usuário online:', err.message));

    client.on('create-room', async (sala) => {
      if (!validacao.sala(sala) || client.data.sala) return;
      try {
        client.data.sala = sala;
        client.join(sala);
        const historico = await redis.lRange(chaveSala(sala), 0, -1);
        client.emit('history', historico.reverse().map(lerMensagem));
        await registrar(sala, { tipo: 'sistema', nome: usuario.nome, msg: 'entrou.', ts: Date.now() });
      } catch (err) {
        falhar(client, err);
      }
    });

    client.on('send-server', async (msg) => {
      const { sala } = client.data;
      const texto = typeof msg === 'string' ? msg.trim().slice(0, maxMensagem) : '';
      if (!sala || !texto) return;
      try {
        await registrar(sala, { tipo: 'mensagem', nome: usuario.nome, msg: texto, ts: Date.now() });
        client.broadcast.emit('new-message', { email: usuario.email, sala });
      } catch (err) {
        falhar(client, err);
      }
    });

    client.on('disconnect', () => {
      const tarefa = (async () => {
        await online;
        try {
          const { sala } = client.data;
          if (sala) {
            await registrar(sala, { tipo: 'sistema', nome: usuario.nome, msg: 'saiu.', ts: Date.now() });
          }
          const restantes = await redis.hIncrBy(ONLINES, usuario.email, -1);
          if (restantes <= 0) {
            await redis.hDel(ONLINES, usuario.email);
            io.emit('notify-offlines', usuario.email);
          }
        } catch (err) {
          console.error('[socket] erro ao desconectar:', err.message);
        }
      })();
      desconexoes.add(tarefa);
      tarefa.finally(() => desconexoes.delete(tarefa));
    });
  });
};
