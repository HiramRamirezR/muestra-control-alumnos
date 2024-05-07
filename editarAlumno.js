import app from './firebaseConfig.js'
import { getDatabase, ref, onValue, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

const database = getDatabase(app);
const alumnos = ref(database, 'alumnos');

// Función para obtener el parámetro 'editar' de la URL
function obtenerParametroEditar() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('editar');
}
  
// Verifica si hay un parámetro 'editar'
const editarAlumnoID = obtenerParametroEditar();
if (editarAlumnoID) {
    // Si hay un parámetro 'editar', cargar información del alumno
    cargarInformacionEdicion(editarAlumnoID);
}
  
function cargarInformacionEdicion(id) {
    let ubicacion = ref(database, `alumnos/${id}`);
    // console.log(id);
    onValue(ubicacion, (snapshot) => {
      const alumno = snapshot.val();
      document.getElementById('numeroCertificado').value = alumno["numeroCertificado"];
      document.getElementById('gradoActual').value = alumno["gradoActual"];
      document.getElementById('gradoParaSubir').value = alumno["gradoParaSubir"];
      document.getElementById('radioNino').checked = alumno["radioNino"];
      document.getElementById('radioAdulto').checked = alumno["radioAdulto"];
      document.getElementById('nombres').value = alumno.nombre
      document.getElementById('apellidoPaterno').value = alumno["apellidoPaterno"];
      document.getElementById('apellidoMaterno').value = alumno["apellidoMaterno"];
      document.getElementById('fechaNacimiento').value = alumno["fechaNacimiento"];
      document.getElementById('edad').value = alumno["edad"];
      document.getElementById('direccion').value = alumno["direccion"];
      document.getElementById('telefono').value = alumno["telefono"];
      document.getElementById('ocupacion').value = alumno["ocupacion"];
      document.getElementById('fechaIngreso').value = alumno["fechaIngreso"];
      document.getElementById('tiempoPracticando').value = alumno["tiempoPracticando"];
      document.getElementById('dojang').value = alumno["dojang"];
      document.getElementById('nombreProfesor').value = alumno["nombreProfesor"];
      document.getElementById('fechaExamenAnterior').value = alumno["fechaExamenAnterior"];
      document.getElementById('fechaExamen').value = alumno["fechaExamen"];
    });
  }

  const enviarForm = document.getElementById('enviarForm');
  enviarForm.addEventListener('click', () => {
    let ubicacion = ref(database, `alumnos/${editarAlumnoID}`);
    console.log(editarAlumnoID);
    set(ubicacion, {
    });
  });