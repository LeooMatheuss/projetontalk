const autenticar = require('../middlewares/autenticador');
const { verificar: csrf } = require('../middlewares/csrf');

module.exports = (app) => {
  const { contatos } = app.controllers;

  app.get('/contatos', autenticar, contatos.index);
  app.get('/contato/:id', autenticar, contatos.show);
  app.post('/contato', autenticar, csrf, contatos.create);
  app.get('/contato/:id/editar', autenticar, contatos.edit);
  app.put('/contato/:id', autenticar, csrf, contatos.update);
  app.delete('/contato/:id', autenticar, csrf, contatos.destroy);
};
