const { novoAgente, entrar } = require('../helpers');

describe('No controller chat', () => {
  it('GET "/chat" sem login redireciona para GET "/"', async () => {
    (await novoAgente().get('/chat')).headers.location.should.eql('/');
  });

  it('GET "/chat" sem sala redireciona para uma sala nova e aleatória', async () => {
    const agente = await entrar({ nome: 'Teste', email: 'teste@teste' });
    const a = (await agente.get('/chat')).headers.location;
    const b = (await agente.get('/chat?sala=<script>')).headers.location;
    a.should.match(/^\/chat\?sala=[a-f0-9]{32}$/);
    b.should.match(/^\/chat\?sala=[a-f0-9]{32}$/);
    a.should.not.eql(b);
  });

  it('GET "/chat?sala=<hash>" exibe a sala', async () => {
    const agente = await entrar({ nome: 'Teste', email: 'teste@teste' });
    const sala = 'a'.repeat(32);
    const res = await agente.get(`/chat?sala=${sala}`);
    res.status.should.eql(200);
    res.text.should.match(new RegExp(`data-sala="${sala}"`));
  });
});
