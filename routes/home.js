const { verificar: csrf } = require('../middlewares/csrf');

module.exports = (app) => {
  const { home } = app.controllers;
  app.get('/', home.index);
  app.post('/entrar', csrf, home.login);
  app.get('/sair', home.logout);
};
