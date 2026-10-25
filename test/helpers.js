const supertest = require('supertest');
const { app } = require('../app');

const extrairCsrf = (html) => {
  const encontrado = /name="_csrf" value="([a-f0-9]+)"/.exec(html);
  return encontrado ? encontrado[1] : null;
};

const novoAgente = () => supertest.agent(app);

const csrfDe = async (agente, url = '/') => extrairCsrf((await agente.get(url)).text);

const entrar = async (usuario, agente = novoAgente()) => {
  const _csrf = await csrfDe(agente);
  const res = await agente.post('/entrar').type('form').send({ _csrf, usuario });
  res.headers.location.should.eql('/contatos');
  return agente;
};

const cadastrarContato = async (agente, contato) => {
  const _csrf = await csrfDe(agente, '/contatos');
  await agente.post('/contato').type('form').send({ _csrf, contato });
  const html = (await agente.get('/contatos')).text;
  const ids = [...html.matchAll(/href="\/contato\/([a-f0-9]{24})"/g)].map((m) => m[1]);
  return ids[ids.length - 1];
};

module.exports = { novoAgente, csrfDe, entrar, cadastrarContato, extrairCsrf };
