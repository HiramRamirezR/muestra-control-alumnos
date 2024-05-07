import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
    apiKey: 'AIzaSyBM_WvDcvjwOBPnwapGWAqMrhJGLAUyXyA',
    authDomain: 'taekwondo-b5819.firebaseapp.com',
    databaseURL: 'https://taekwondo-b5819-default-rtdb.firebaseio.com/',
    projectId: 'taekwondo-b5819',
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth();

// Función para cerrar sesión
function cerrarSesion() {
    signOut(auth)
        .then(() => {
        // La sesión se cerró correctamente
        console.log('Sesión cerrada correctamente');
        // Redirigir al usuario al formulario de inicio de sesión
        window.location.href = "index.html";
        })
        .catch((error) => {
        // Manejar errores aquí
        console.error('Error al cerrar sesión:', error.message);
        });
}

// Agregar el evento click al botón de cerrar sesión
const botonCerrarSesion = document.getElementById('boton-cerrar-sesion');
botonCerrarSesion.addEventListener('click', cerrarSesion);
