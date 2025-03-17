import app from './firebaseConfig.js';
import { getDatabase, ref, push, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { mostrarExito, mostrarError, mostrarAdvertencia } from './sweetalert-utils.js';

const database = getDatabase(app);
const alumnos = ref(database, 'alumnos');

// Verificar el estado de autenticación
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // El usuario no está autenticado, redirigir al formulario de inicio de sesión
    window.location.href = "index.html";
  }
});

const enviarForm = document.getElementById('enviarForm');

enviarForm.addEventListener('click', () => {
  // Disable the submit button to prevent multiple submissions
  enviarForm.disabled = true;
  enviarForm.classList.add('disabled');

  // Only execute if not in edit mode
  const urlParams = new URLSearchParams(window.location.search);
  const editarAlumnoID = urlParams.get('editar');

  if (!editarAlumnoID) {
    const numeroCertificado = document.getElementById('numeroCertificado').value;
    const radioNino = document.getElementById('radioNino').checked;
    const radioAdulto = document.getElementById('radioAdulto').checked;
    const gradoActual = document.getElementById('gradoActual').value;
    const gradoParaSubir = document.getElementById('gradoParaSubir').value;
    const nombre = document.getElementById('nombres').value;
    const apellidoPaterno = document.getElementById('apellidoPaterno').value;
    const apellidoMaterno = document.getElementById('apellidoMaterno').value;
    const fechaNacimiento = document.getElementById('fechaNacimiento').value;
    const edad = document.getElementById('edad').value;
    const direccion = document.getElementById('direccion').value;
    const telefono = document.getElementById('telefono').value;
    const ocupacion = document.getElementById('ocupacion').value;
    const fechaIngreso = document.getElementById('fechaIngreso').value;
    const tiempoPracticando = document.getElementById('tiempoPracticando').value;
    const dojang = document.getElementById('dojang').value;
    const nombreProfesor = document.getElementById('nombreProfesor').value;
    const fechaExamenAnterior = document.getElementById('fechaExamenAnterior').value;
    const fechaExamen = document.getElementById('fechaExamen').value;
    const estadoCivil = document.getElementById('estadoCivil').value;

    console.log('Datos del alumno:', {
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
      fechaExamen,
      estadoCivil
    });

    // Prevent empty submissions
    if (!nombre || !apellidoPaterno || !apellidoMaterno || !dojang) {
      mostrarAdvertencia('Por favor, rellene los campos obligatorios: Nombre, Apellido Paterno, Apellido Materno, Doyang y Fecha de ingreso.');
      enviarForm.disabled = false;
      enviarForm.classList.remove('disabled');
      return;
    }

    // Validate required fields
    if (!dojang) {
      mostrarAdvertencia('Por favor, seleccione un Doyang.');
      enviarForm.disabled = false;
      enviarForm.classList.remove('disabled');
      return;
    }

    // Validate date fields
    if (!fechaIngreso) {
      mostrarAdvertencia('Por favor, ingrese la fecha de ingreso.');
      enviarForm.disabled = false;
      enviarForm.classList.remove('disabled');
      return;
    }

    // Check for existing student with same name and birthdate
    const alumnosRef = ref(database, 'alumnos');
    get(alumnosRef).then((snapshot) => {
      const existingAlumnos = snapshot.val() || {};
      const duplicateAlumno = Object.values(existingAlumnos).find(alumno =>
        alumno.nombre === nombre &&
        alumno.apellidoPaterno === apellidoPaterno &&
        alumno.apellidoMaterno === apellidoMaterno &&
        alumno.fechaNacimiento === fechaNacimiento
      );

      if (duplicateAlumno) {
        mostrarAdvertencia('Este alumno ya existe en la base de datos. No se pueden crear registros duplicados.');
        enviarForm.disabled = false;
        enviarForm.classList.remove('disabled');
        return;
      }

      // If no duplicate found, proceed with creating the record
      push(alumnosRef, {
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
        fechaExamen,
        estadoCivil,
        escuela: dojang,
        estado: 'activo',
        familia_id: null,
        fechaCreacion: new Date().toISOString() // Add timestamp for tracking
      }).then(() => {
        mostrarExito(`${nombre} ${apellidoPaterno} ${apellidoMaterno} ha sido registrado exitosamente.`);
        // Optional: Reset form or redirect
        window.location.reload();
      }).catch((error) => {
        console.error('Error al registrar el alumno:', error);
        mostrarError('Hubo un error al registrar el alumno. Intente nuevamente.');
      }).finally(() => {
        enviarForm.disabled = false;
        enviarForm.classList.remove('disabled');
      });
    }).catch((error) => {
      console.error('Error al verificar alumnos existentes:', error);
      enviarForm.disabled = false;
      enviarForm.classList.remove('disabled');
    });
  }
});
