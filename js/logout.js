import app from './firebaseConfig.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const auth = getAuth(app);

// Función para cerrar sesión
function cerrarSesion() {
  signOut(auth)
    .then(() => {
      console.log('Sesión cerrada correctamente');
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error('Error al cerrar sesión:', error.message);
    });
}

// Agregar el evento click al botón de cerrar sesión
const botonCerrarSesion = document.getElementById('boton-cerrar-sesion');
botonCerrarSesion.addEventListener('click', cerrarSesion);
