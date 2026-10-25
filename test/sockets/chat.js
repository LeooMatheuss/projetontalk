const supertest = require('supertest');
const { io: ioClient } = require('socket.io-client');
const { app, server } = require('../../app');
const { extrairCsrf } = require('../helpers');

const cookieDe = (res) => res.headers['set-cookie'][0].split(';')[0];

const cookieLogado = async (usuario) => {
  const home = await supertest(app).get('/');
  const res = await supertest(app).post('/entrar')
    .set('Cookie', cookieDe(home)).type('form')
    .send({ _csrf: extrairCsrf(home.text), usuario });
  res.headers.location.should.eql('/contatos');
  return cookieDe(res);
};

const esperar = (socket, evento, filtro = () => true) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error(`timeout aguardando "${evento}"`)), 3000);
  const ouvir = (dados) => {
    if (!filtro(dados)) return;
    clearTimeout(timer);
    socket.off(evento, ouvir);
    resolve(dados);
  };
  socket.on(evento, ouvir);
});

describe('Socket do chat', () => {
  let url;
  const sockets = [];

  const conectar = (cookie) => {
    const socket = ioClient(url, {
      transports: ['websocket'],
      extraHeaders: cookie ? { Cookie: cookie } : {},
      reconnection: false,
      forceNew: true
    });
    sockets.push(socket);
    return socket;
  };

  before((done) => {
    server.listen(0, () => {
      url = `http://localhost:${server.address().port}`;
      done();
    });
  });

  afterEach(() => sockets.splice(0).forEach((s) => s.close()));

  it('recusa conexão sem sessão autenticada', async () => {
    const err = await esperar(conectar(), 'connect_error');
    err.message.should.eql('não autenticado');
  });

  it('troca mensagens entre usuários da mesma sala, com histórico e notificações', async () => {
    const sala = 'b'.repeat(32);
    const ana = conectar(await cookieLogado({ nome: 'Ana', email: 'ana@teste' }));
    await esperar(ana, 'connect');
    ana.emit('create-room', sala);
    await esperar(ana, 'send-client', (m) => m.nome === 'Ana' && m.msg === 'entrou.');

    const bruno = conectar(await cookieLogado({ nome: 'Bruno', email: 'bruno@teste' }));
    const anaVeBrunoOnline = esperar(ana, 'notify-onlines', (email) => email === 'bruno@teste');
    await esperar(bruno, 'connect');
    await anaVeBrunoOnline;

    const historico = esperar(bruno, 'history');
    bruno.emit('create-room', sala);
    (await historico).map((m) => m.msg).should.containEql('entrou.');

    const novaMensagem = esperar(bruno, 'new-message');
    const recebida = esperar(bruno, 'send-client', (m) => m.tipo === 'mensagem');
    ana.emit('send-server', '<img src=x onerror=alert(1)>');
    const msg = await recebida;
    msg.should.match({ tipo: 'mensagem', nome: 'Ana', msg: '<img src=x onerror=alert(1)>' });
    (await novaMensagem).should.eql({ email: 'ana@teste', sala });

    const brunoOffline = esperar(ana, 'notify-offlines', (email) => email === 'bruno@teste');
    const brunoSaiu = esperar(ana, 'send-client', (m) => m.nome === 'Bruno' && m.msg === 'saiu.');
    bruno.close();
    await Promise.all([brunoOffline, brunoSaiu]);
  });

  it('ignora mensagens fora de uma sala e salas inválidas', async () => {
    const socket = conectar(await cookieLogado({ nome: 'Carla', email: 'carla@teste' }));
    await esperar(socket, 'connect');
    let recebeu = false;
    socket.on('send-client', () => { recebeu = true; });
    socket.on('history', () => { recebeu = true; });
    socket.emit('send-server', 'sem sala');
    socket.emit('create-room', '../../etc');
    await new Promise((r) => setTimeout(r, 300));
    recebeu.should.be.false();
  });
});
