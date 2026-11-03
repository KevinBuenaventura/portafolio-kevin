document.getElementById('anio').textContent = new Date().getFullYear();
document.getElementById('form').addEventListener('submit', function (e) {
  e.preventDefault();
  const nombre = document.getElementById('nombre').value.trim();
  document.getElementById('estado').textContent = '¡Gracias, ' + nombre + '! Tu mensaje fue recibido.';
  this.reset();
});
