document.addEventListener('submit', function (evento) {
  var mensagem = evento.target.getAttribute('data-confirm');
  if (mensagem && !window.confirm(mensagem)) {
    evento.preventDefault();
  }
});
