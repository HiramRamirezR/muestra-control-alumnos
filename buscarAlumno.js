import app from './firebaseConfig.js';
import { getDatabase, ref, onValue, remove } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const database = getDatabase(app);
const alumnosRef = ref(database, 'alumnos');

// Verificar el estado de autenticación
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // El usuario no está autenticado, redirigir al formulario de inicio de sesión
    window.location.href = "index.html";
  } else {
    // El usuario está autenticado, puedes acceder a su información
    console.log('Usuario autenticado:', user);
    // Aquí puedes realizar las operaciones relacionadas con buscar alumno
  }
});

function renderAlumnos(alumnosData) {
  const list = document.getElementById('list');
  list.innerHTML = '';

  const sortedAlumnos = Object.entries(alumnosData).sort(([, a], [, b]) => {
    const nombreA = `${a.nombre} ${a.apellidoPaterno} ${a.apellidoMaterno}`.toUpperCase();
    const nombreB = `${b.nombre} ${b.apellidoPaterno} ${b.apellidoMaterno}`.toUpperCase();
    return nombreA.localeCompare(nombreB);
  });

  sortedAlumnos.forEach(([alumnoId, alumnoData]) => {
    const nombreCompleto = `${alumnoData.nombre} ${alumnoData.apellidoPaterno} ${alumnoData.apellidoMaterno}`;
    appendNombre(nombreCompleto, alumnoId);
  });

  function appendNombre(alumno, alumnoId) {
    const li = document.createElement('li');
    li.textContent = alumno;
    // li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
    list.append(li);

    const div = document.createElement('div');
    div.classList.add('d-flex', 'align-items-center');
    li.append(div);

    const btnEditar = document.createElement('button');
    btnEditar.innerHTML = `<i class="fa-solid fa-pen"></i>`;
    btnEditar.classList.add('btn', 'btn-success', 'btn-sm', 'mr-2', 'ml-3');
    div.append(btnEditar);

    btnEditar.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm(`¿Desea Editar la información de ${alumno}?`)) {
        window.location.href = `formulario.html?editar=${alumnoId}`;
      }
    });

    const btnEliminar = document.createElement('button');
    btnEliminar.innerHTML = `<i class="fa-solid fa-trash-can"></i>`;
    btnEliminar.classList.add('btn', 'btn-danger', 'btn-sm');
    div.append(btnEliminar);

    btnEliminar.addEventListener('click', (e) => {
      e.preventDefault();
      const ubicacion = ref(database, `alumnos/${alumnoId}`);
      if (confirm(`${alumno} se eliminará permanentemente de la base de datos. ¿Desea continuar?`)) {
        remove(ubicacion);
      }
    });
  }
}

onValue(alumnosRef, (snapshot) => {
  const alumnosData = snapshot.val();
  renderAlumnos(alumnosData);
});

// Definir la función de búsqueda
function search() {
  const input = document.getElementById('searchInput').value.toUpperCase();
  const list = document.getElementById('list');
  const li = list.getElementsByTagName('li');

  for (let i = 0; i < li.length; i++) {
    const nombre = li[i].textContent.toUpperCase();

    if (nombre.includes(input)) {
      li[i].style.display = '';
    } else {
      li[i].style.display = 'none';
    }
  }
}

// Adjuntar evento keyup al input de búsqueda
document.getElementById('searchInput').addEventListener('keyup', search);
