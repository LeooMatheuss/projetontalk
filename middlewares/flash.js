module.exports = (req, res, next) => {
  req.flash = (tipo, mensagem) => {
    req.session.flash = { tipo, mensagem };
  };
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.usuario = req.session.usuario || null;
  next();
};
