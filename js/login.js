import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { mostrarError } from './sweetalert-utils.js';

const firebaseConfig = {
  apiKey: "AIzaSyDV-1Q4ETGOnRYjUHKlD3CmYLC5p0vLoY8",
  authDomain: "control-alumnos-76bc2.firebaseapp.com",
  databaseURL: 'https://control-alumnos-76bc2-default-rtdb.firebaseio.com/',
  projectId: "control-alumnos-76bc2",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Función para iniciar sesión con el correo electrónico
function signIn() {
  console.log('Iniciando sesión...');
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Inicio de sesión exitoso
      const user = userCredential.user;
      console.log('Inicio de sesión exitoso:', user);
      window.open('menu.html', '_self');
    })
    .catch((error) => {
      // Manejar errores aquí
      mostrarError('Error de inicio de sesión. Por favor, verifica tus credenciales.');
      console.error('Error de inicio de sesión:', error.message);
    });
}

const login = document.getElementById('login');
login.addEventListener('click', signIn);
