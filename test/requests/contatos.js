const { novoAgente, csrfDe, entrar, cadastrarContato } = require('../helpers');

describe('No controller contatos', () => {
  describe('usuario nao logado', () => {
    const request = novoAgente();

    it('GET "/contatos" redireciona para GET "/"', async () => {
      (await request.get('/contatos')).headers.location.should.eql('/');
    });
    it('GET "/contato/1" redireciona para GET "/"', async () => {
      (await request.get('/contato/1')).headers.location.should.eql('/');
    });
    it('GET "/contato/1/editar" redireciona para GET "/"', async () => {
      (await request.get('/contato/1/editar')).headers.location.should.eql('/');
    });
    it('POST "/contato" redireciona para GET "/"', async () => {
      (await request.post('/contato')).headers.location.should.eql('/');
    });
    it('DELETE "/contato/1" redireciona para GET "/"', async () => {
      (await request.delete('/contato/1')).headers.location.should.eql('/');
    });
    it('PUT "/contato/1" redireciona para GET "/"', async () => {
      (await request.put('/contato/1')).headers.location.should.eql('/');
    });
  });

  describe('usuario logado', () => {
    const usuario = { nome: 'Teste', email: 'teste@teste' };
    let agente;

    beforeEach(async () => {
      agente = await entrar(usuario);
    });

    it('GET "/contatos" retorna status 200', async () => {
      const res = await agente.get('/contatos');
      res.status.should.eql(200);
      res.text.should.match(/LiveTalk - Agenda de contatos/);
    });

    it('POST "/contato" redireciona para GET "/contatos"', async () => {
      const _csrf = await csrfDe(agente, '/contatos');
      const res = await agente.post('/contato').type('form').send({ _csrf, contato: usuario });
      res.headers.location.should.eql('/contatos');
    });

    it('POST "/contato" sem token CSRF retorna 403', async () => {
      const res = await agente.post('/contato').type('form').send({ contato: usuario });
      res.status.should.eql(403);
    });

    it('POST "/contato" inválido não cadastra e exibe erro', async () => {
      const _csrf = await csrfDe(agente, '/contatos');
      const res = await agente.post('/contato').type('form')
        .send({ _csrf, contato: { nome: 'Sem email', email: 'invalido' } });
      res.headers.location.should.eql('/contatos');
      const html = (await agente.get('/contatos')).text;
      html.should.match(/Informe um e-mail válido\./);
      html.should.not.match(/Sem email/);
    });

    it('escapa HTML dos dados do contato (XSS)', async () => {
      const id = await cadastrarContato(agente, { nome: '<script>alert(1)</script>', email: 'xss@teste' });
      const lista = (await agente.get('/contatos')).text;
      lista.should.not.match(/<script>alert\(1\)<\/script>/);
      lista.should.match(/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
      (await agente.get(`/contato/${id}`)).text.should.not.match(/<script>alert/);
    });

    it('GET "/contato/:id" exibe, edita preservando o id e exclui', async () => {
      const id = await cadastrarContato(agente, { nome: 'Maria', email: 'maria@teste' });
      (await agente.get(`/contato/${id}`)).text.should.match(/maria@teste/);
      (await agente.get(`/contato/${id}/editar`)).status.should.eql(200);

      let _csrf = await csrfDe(agente, `/contato/${id}/editar`);
      const upd = await agente.post(`/contato/${id}?_method=PUT`).type('form')
        .send({ _csrf, contato: { nome: 'Maria Silva', email: 'maria.silva@teste' } });
      upd.headers.location.should.eql('/contatos');
      const detalhe = await agente.get(`/contato/${id}`);
      detalhe.status.should.eql(200);
      detalhe.text.should.match(/Maria Silva/);

      _csrf = await csrfDe(agente, `/contato/${id}`);
      const del = await agente.post(`/contato/${id}?_method=DELETE`).type('form').send({ _csrf });
      del.headers.location.should.eql('/contatos');
      (await agente.get(`/contato/${id}`)).status.should.eql(404);
    });

    it('GET "/contato/:id" com id inválido ou inexistente retorna 404', async () => {
      (await agente.get('/contato/1')).status.should.eql(404);
      (await agente.get('/contato/0123456789abcdef01234567')).status.should.eql(404);
      (await agente.get('/contato/0123456789abcdef01234567/editar')).status.should.eql(404);
    });

    it('não permite alterar nem excluir contato de outro usuário (IDOR)', async () => {
      const idDoOutro = await cadastrarContato(
        await entrar({ nome: 'Outro', email: 'outro@teste' }),
        { nome: 'Privado', email: 'privado@teste' }
      );
      const outro = await entrar({ nome: 'Outro', email: 'outro@teste' });

      (await agente.get(`/contato/${idDoOutro}`)).status.should.eql(404);
      let _csrf = await csrfDe(agente, '/contatos');
      (await agente.post(`/contato/${idDoOutro}?_method=PUT`).type('form')
        .send({ _csrf, contato: { nome: 'Hacker', email: 'h@h' } })).status.should.eql(404);
      _csrf = await csrfDe(agente, '/contatos');
      (await agente.post(`/contato/${idDoOutro}?_method=DELETE`).type('form')
        .send({ _csrf })).status.should.eql(404);

      const detalhe = await outro.get(`/contato/${idDoOutro}`);
      detalhe.status.should.eql(200);
      detalhe.text.should.match(/Privado/);
    });
  });
});
