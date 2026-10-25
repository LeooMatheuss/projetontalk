const config = require('../config');
const validacao = require('../libs/validacao');

module.exports = (app) => {
  const Usuario = app.models.usuario;

  const HomeController = {
    index(req, res) {
      if (req.session.usuario) {
        return res.redirect('/contatos');
      }
      return res.render('home/index');
    },
    async login(req, res, next) {
      const { valores, erros } = validacao.pessoa(req.body?.usuario);
      if (erros.length) {
        req.flash('erro', erros.join(' '));
        return res.redirect('/');
      }
      const { email, nome } = valores;
      try {
        const usuario = await Usuario.findOneAndUpdate(
          { email, nome },
          { $setOnInsert: { email, nome, contatos: [] } },
          { upsert: true, runValidators: true, new: true }
        ).select('email nome').lean();
        return req.session.regenerate((err) => {
          if (err) return next(err);
          req.session.usuario = { _id: String(usuario._id), nome: usuario.nome, email: usuario.email };
          return res.redirect('/contatos');
        });
      } catch (err) {
        if (err.code === 11000) {
          req.flash('erro', 'Este e-mail já está cadastrado com outro nome.');
          return res.redirect('/');
        }
        return next(err);
      }
    },
    logout(req, res, next) {
      req.session.destroy((err) => {
        if (err) return next(err);
        res.clearCookie(config.sessionKey);
        return res.redirect('/');
      });
    }
  };
  return HomeController;
};
