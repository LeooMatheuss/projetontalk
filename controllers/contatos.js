const validacao = require('../libs/validacao');

module.exports = (app) => {
  const Usuario = app.models.usuario;

  const naoEncontrado = (res) => res.status(404).render('not-found');

  const buscarContato = async (req) => {
    const contatoId = req.params.id;
    if (!validacao.objectId(contatoId)) return null;
    const usuario = await Usuario.findOne(
      { _id: req.session.usuario._id },
      { contatos: { $elemMatch: { _id: contatoId } } }
    ).lean();
    return usuario?.contatos?.[0] || null;
  };

  const ContatosController = {
    async index(req, res, next) {
      try {
        const usuario = await Usuario.findById(req.session.usuario._id).select('contatos').lean();
        if (!usuario) {
          return req.session.destroy(() => res.redirect('/'));
        }
        return res.render('contatos/index', { contatos: usuario.contatos });
      } catch (err) {
        return next(err);
      }
    },
    async create(req, res, next) {
      const { valores, erros } = validacao.pessoa(req.body?.contato);
      if (erros.length) {
        req.flash('erro', erros.join(' '));
        return res.redirect('/contatos');
      }
      try {
        await Usuario.updateOne(
          { _id: req.session.usuario._id },
          { $push: { contatos: valores } },
          { runValidators: true }
        );
        req.flash('sucesso', `Contato "${valores.nome}" cadastrado.`);
        return res.redirect('/contatos');
      } catch (err) {
        return next(err);
      }
    },
    async show(req, res, next) {
      try {
        const contato = await buscarContato(req);
        return contato ? res.render('contatos/show', { contato }) : naoEncontrado(res);
      } catch (err) {
        return next(err);
      }
    },
    async edit(req, res, next) {
      try {
        const contato = await buscarContato(req);
        return contato ? res.render('contatos/edit', { contato }) : naoEncontrado(res);
      } catch (err) {
        return next(err);
      }
    },
    async update(req, res, next) {
      const contatoId = req.params.id;
      if (!validacao.objectId(contatoId)) return naoEncontrado(res);
      const { valores, erros } = validacao.pessoa(req.body?.contato);
      if (erros.length) {
        req.flash('erro', erros.join(' '));
        return res.redirect(`/contato/${contatoId}/editar`);
      }
      try {
        const resultado = await Usuario.updateOne(
          { _id: req.session.usuario._id, 'contatos._id': contatoId },
          { $set: { 'contatos.$.nome': valores.nome, 'contatos.$.email': valores.email } },
          { runValidators: true }
        );
        if (!resultado.matchedCount) return naoEncontrado(res);
        req.flash('sucesso', 'Contato atualizado.');
        return res.redirect('/contatos');
      } catch (err) {
        return next(err);
      }
    },
    async destroy(req, res, next) {
      const contatoId = req.params.id;
      if (!validacao.objectId(contatoId)) return naoEncontrado(res);
      try {
        const resultado = await Usuario.updateOne(
          { _id: req.session.usuario._id, 'contatos._id': contatoId },
          { $pull: { contatos: { _id: contatoId } } }
        );
        if (!resultado.modifiedCount) return naoEncontrado(res);
        req.flash('sucesso', 'Contato excluído.');
        return res.redirect('/contatos');
      } catch (err) {
        return next(err);
      }
    }
  };
  return ContatosController;
};
