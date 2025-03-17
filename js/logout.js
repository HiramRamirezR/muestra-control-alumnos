import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyDV-1Q4ETGOnRYjUHKlD3CmYLC5p0vLoY8",
  authDomain: "control-alumnos-76bc2.firebaseapp.com",
  databaseURL: 'https://control-alumnos-76bc2-default-rtdb.firebaseio.com/',
  projectId: "control-alumnos-76bc2",
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
