const { novoAgente, csrfDe, entrar } = require('../helpers');

describe('No controller home', () => {
  it('GET "/" retorna status 200', async () => {
    const res = await novoAgente().get('/');
    res.status.should.eql(200);
    res.text.should.match(/name="_csrf"/);
  });

  it('GET "/" envia cabeçalhos de segurança', async () => {
    const res = await novoAgente().get('/');
    res.headers.should.have.property('content-security-policy');
    res.headers.should.have.property('x-content-type-options', 'nosniff');
    res.headers.should.not.have.property('x-powered-by');
  });

  it('GET "/sair" redireciona para GET "/"', async () => {
    const res = await novoAgente().get('/sair');
    res.headers.location.should.eql('/');
  });

  it('POST "/entrar" válido redireciona para GET "/contatos"', async () => {
    await entrar({ nome: 'Teste', email: 'teste@teste' });
  });

  it('POST "/entrar" inválido redireciona para GET "/" com mensagem de erro', async () => {
    const agente = novoAgente();
    const _csrf = await csrfDe(agente);
    const res = await agente.post('/entrar').type('form')
      .send({ _csrf, usuario: { nome: '', email: '' } });
    res.headers.location.should.eql('/');
    (await agente.get('/')).text.should.match(/Informe o nome\./);
  });

  it('POST "/entrar" sem token CSRF retorna 403', async () => {
    const res = await novoAgente().post('/entrar').type('form')
      .send({ usuario: { nome: 'Teste', email: 'teste@teste' } });
    res.status.should.eql(403);
  });

  it('POST "/entrar" rejeita operadores do MongoDB (NoSQL injection)', async () => {
    await entrar({ nome: 'Vitima', email: 'vitima@teste' });
    const agente = novoAgente();
    const _csrf = await csrfDe(agente);
    const res = await agente.post('/entrar').type('form')
      .send(`_csrf=${_csrf}&usuario[nome][$ne]=x&usuario[email][$ne]=x`);
    res.headers.location.should.eql('/');
    (await agente.get('/contatos')).headers.location.should.eql('/');
  });

  it('POST "/entrar" com e-mail existente e outro nome informa o conflito', async () => {
    await entrar({ nome: 'Dono', email: 'dono@teste' });
    const agente = novoAgente();
    const _csrf = await csrfDe(agente);
    const res = await agente.post('/entrar').type('form')
      .send({ _csrf, usuario: { nome: 'Outro', email: 'dono@teste' } });
    res.headers.location.should.eql('/');
    (await agente.get('/')).text.should.match(/já está cadastrado com outro nome/);
  });

  it('GET "/sair" encerra a sessão', async () => {
    const agente = await entrar({ nome: 'Teste', email: 'teste@teste' });
    (await agente.get('/contatos')).status.should.eql(200);
    await agente.get('/sair');
    (await agente.get('/contatos')).headers.location.should.eql('/');
  });

  it('GET em rota inexistente retorna 404', async () => {
    const res = await novoAgente().get('/nao-existe');
    res.status.should.eql(404);
  });
});
