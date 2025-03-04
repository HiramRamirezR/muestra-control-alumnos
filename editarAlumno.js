import app from './firebaseConfig.js'
import { getDatabase, ref, onValue, set } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { mostrarExito, mostrarError, mostrarAdvertencia } from './sweetalert-utils.js';

const database = getDatabase(app);

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
    onValue(ubicacion, (snapshot) => {
        const alumno = snapshot.val();
        if (alumno) {
            document.getElementById('numeroCertificado').value = alumno["numeroCertificado"];
            document.getElementById('gradoActual').value = alumno["gradoActual"];
            document.getElementById('gradoParaSubir').value = alumno["gradoParaSubir"];
            document.getElementById('radioNino').checked = alumno["radioNino"];
            document.getElementById('radioAdulto').checked = alumno["radioAdulto"];
            document.getElementById('nombres').value = alumno["nombre"];
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
            document.getElementById('estadoCivil').value = alumno["estadoCivil"];
        }
    });
}

const enviarForm = document.getElementById('enviarForm');
enviarForm.addEventListener('click', () => {
    if (editarAlumnoID) {
        let ubicacion = ref(database, `alumnos/${editarAlumnoID}`);
        set(ubicacion, {
            numeroCertificado: document.getElementById('numeroCertificado').value,
            gradoActual: document.getElementById('gradoActual').value,
            gradoParaSubir: document.getElementById('gradoParaSubir').value,
            radioNino: document.getElementById('radioNino').checked,
            radioAdulto: document.getElementById('radioAdulto').checked,
            nombre: document.getElementById('nombres').value,
            apellidoPaterno: document.getElementById('apellidoPaterno').value,
            apellidoMaterno: document.getElementById('apellidoMaterno').value,
            fechaNacimiento: document.getElementById('fechaNacimiento').value,
            edad: document.getElementById('edad').value,
            direccion: document.getElementById('direccion').value,
            telefono: document.getElementById('telefono').value,
            ocupacion: document.getElementById('ocupacion').value,
            fechaIngreso: document.getElementById('fechaIngreso').value,
            tiempoPracticando: document.getElementById('tiempoPracticando').value,
            dojang: document.getElementById('dojang').value,
            nombreProfesor: document.getElementById('nombreProfesor').value,
            fechaExamenAnterior: document.getElementById('fechaExamenAnterior').value,
            fechaExamen: document.getElementById('fechaExamen').value,
            estadoCivil: document.getElementById('estadoCivil').value,
        }).then(() => {
            mostrarExito('Alumno actualizado correctamente');
        }).catch((error) => {
            mostrarError('Error al actualizar el alumno:', error);
        });
    }
});
