document.addEventListener('DOMContentLoaded', async () => {
  const header = document.getElementById('main-header');
  try {
    const res = await fetch('header.html');
    const html = await res.text();
    header.innerHTML = html;

    construirNavbar();
    activarBotones();

    // ✅ Menú hamburguesa: mostrar/ocultar en móvil
    const toggle = document.getElementById('navbar-toggle');
    const links = document.getElementById('navbar-links');
    toggle.addEventListener('click', () => {
      links.classList.toggle('show');
    });
  } catch (err) {
    console.error("Error al cargar el header:", err);
  }
});

function construirNavbar() {
  const navbarLinks = document.getElementById('navbar-links');
  const usuarioId = localStorage.getItem('usuarioId');

  if (!navbarLinks) return;

  if (usuarioId) {
    navbarLinks.innerHTML = `
      <a href="entradas.html">Inicio</a>
      <a href="publicar.html">Publicar</a>
      <a href="mis-entradas.html">Mis entradas</a>
      <a href="mensajes.html">Mensajes</a>
      <a href="#" onclick="logout()">Salir</a>
    `;
  } else {
    navbarLinks.innerHTML = `
      <a href="entradas.html">Inicio</a>
      <a href="login.html">Iniciar sesión / Registrarse</a>
    `;
  }
}

function activarBotones() {
  const toggleBtn = document.getElementById('toggle-modo');
  const btnPerfil = document.getElementById('btn-perfil');

  if (localStorage.getItem('modoOscuro') === 'true') {
    document.body.classList.add('modo-oscuro');
    if (toggleBtn) toggleBtn.innerText = '☀️';
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('modo-oscuro');
      const esOscuro = document.body.classList.contains('modo-oscuro');
      localStorage.setItem('modoOscuro', esOscuro);
      toggleBtn.innerText = esOscuro ? '☀️' : '🌙';
    });
  }

  if (btnPerfil) {
    btnPerfil.addEventListener('click', () => {
      const usuarioId = localStorage.getItem('usuarioId');
      if (!usuarioId) {
        alert("Debes iniciar sesión para acceder al perfil.");
      } else {
        window.location.href = 'perfil.html';
      }
    });
  }
}

function logout() {
  localStorage.removeItem('usuarioId');
  window.location.href = 'login.html';
}
