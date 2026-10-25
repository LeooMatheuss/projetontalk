const config = require('../config');

exports.notFound = (req, res) => {
  res.status(404);
  res.render('not-found');
};

exports.serverError = (error, req, res, next) => {
  const status = error.status || error.statusCode || 500;
  if (status >= 500) {
    console.error(`[erro] ${req.method} ${req.originalUrl}:`, error);
  }
  if (res.headersSent) {
    return next(error);
  }
  const mensagem = status < 500 || !config.isProduction
    ? error.message
    : 'Erro interno no servidor.';
  res.status(status);
  return res.render('server-error', { mensagem });
};
