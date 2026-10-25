const crypto = require('node:crypto');

exports.token = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
};

exports.verificar = (req, res, next) => {
  const esperado = Buffer.from(req.session.csrfToken || '');
  const recebido = Buffer.from(String(req.body?._csrf || req.get('x-csrf-token') || ''));
  if (esperado.length > 0 && esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido)) {
    return next();
  }
  const err = new Error('Sua sessão expirou ou o formulário é inválido. Tente novamente.');
  err.status = 403;
  return next(err);
};
