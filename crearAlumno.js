import app from './firebaseConfig.js'
import { getDatabase, ref, push } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const database = getDatabase(app);
const alumnos = ref(database, 'alumnos');

// Verificar el estado de autenticación
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // El usuario no está autenticado, redirigir al formulario de inicio de sesión
    window.location.href = "index.html";
  } else {
    // El usuario está autenticado, puedes acceder a su información
    // console.log('Usuario autenticado:', user);
    // Aquí puedes realizar las operaciones relacionadas con buscar alumno
  }
});

const enviarForm = document.getElementById('enviarForm');

enviarForm.addEventListener('click', () => {  
  const numeroCertificado = document.getElementById('numeroCertificado').value;
  const radioNino = document.getElementById('radioNino').checked;
  const radioAdulto = document.getElementById('radioAdulto').checked;
  const gradoActual = document.getElementById('gradoActual').value;
  const gradoParaSubir = document.getElementById('gradoParaSubir').value
  const nombre = document.getElementById('nombres').value
  const apellidoPaterno = document.getElementById('apellidoPaterno').value
  const apellidoMaterno = document.getElementById('apellidoMaterno').value
  const fechaNacimiento = document.getElementById('fechaNacimiento').value;
  const edad = document.getElementById('edad').value
  const direccion = document.getElementById('direccion').value
  const telefono = document.getElementById('telefono').value;
  const ocupacion = document.getElementById('ocupacion').value;
  const fechaIngreso = document.getElementById('fechaIngreso').value;
  const tiempoPracticando = document.getElementById('tiempoPracticando').value
  const dojang = document.getElementById('dojang').value
  const nombreProfesor = document.getElementById('nombreProfesor').value
  const fechaExamenAnterior = document.getElementById('fechaExamenAnterior').value;
  const fechaExamen = document.getElementById('fechaExamen').value;

  if (nombre) {
    push(alumnos, {
      numeroCertificado,
      radioNino,
      radioAdulto,
      gradoActual,
      gradoParaSubir,
      nombre,
      apellidoPaterno,
      apellidoMaterno,
      fechaNacimiento,
      edad,
      direccion,
      telefono,
      ocupacion,
      fechaIngreso,
      tiempoPracticando,
      dojang,
      nombreProfesor,
      fechaExamenAnterior,
      fechaExamen
    })
    alert(`${nombre} ${apellidoPaterno} ${apellidoMaterno} ha sido registrado exitosamente.`);
  } else {
    alert('Por favor, rellene todos los campos.');
  }
})