import app from './firebaseConfig.js';
import { getDatabase, ref, push, get, set, update, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { mostrarExito, mostrarError, mostrarAdvertencia } from './sweetalert-utils.js';
import { determinarPrecioPorMiembros, determinarPlanPorMiembros } from './utils-precios.js';

const database = getDatabase(app);
const alumnosRef = ref(database, 'alumnos');
const familiasRef = ref(database, 'familias');

// Verificar autenticación
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    }
});

// Referencias a elementos del DOM
const dojangFiltro = document.getElementById('dojangFiltro');
const busquedaAlumno = document.getElementById('busquedaAlumno');
const busquedaFamilia = document.getElementById('busquedaFamilia');
const listaAlumnosSinFamilia = document.getElementById('listaAlumnosSinFamilia');
const contenedorAlumnosSinFamilia = document.querySelector('.card[data-section="alumnos-sin-familia"]');
const miembrosSeleccionados = document.getElementById('miembrosSeleccionados');
const formularioFamilia = document.getElementById('formularioFamilia');
const contenedorFamilias = document.getElementById('contenedorFamilias');

// Variables globales
let alumnosData = {};
let familiasData = {};
let alumnosSeleccionados = new Set();

// Cargar datos iniciales
function cargarDatos() {
    // Cargar alumnos
    onValue(alumnosRef, (snapshot) => {
        alumnosData = snapshot.val() || {};
        actualizarListaAlumnosSinFamilia();
        actualizarListaFamilias();
    });

    // Cargar familias
    onValue(familiasRef, (snapshot) => {
        familiasData = snapshot.val() || {};
        actualizarListaFamilias();
    });
}

// Filtrar alumnos
function filtrarAlumnos() {
    const dojang = dojangFiltro.value;
    const busqueda = busquedaAlumno.value.toLowerCase();

    const alumnosFiltrados = Object.entries(alumnosData).filter(([id, alumno]) => {
        const coincideDojang = !dojang || alumno.dojang.toLowerCase().includes(dojang);
        const nombreCompleto = `${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}`.toLowerCase();
        const coincideBusqueda = !busqueda || nombreCompleto.includes(busqueda);
        return coincideDojang && coincideBusqueda && !alumno.familia_id;
    });

    return alumnosFiltrados;
}

// Actualizar lista de alumnos sin familia
function actualizarListaAlumnosSinFamilia() {
    const alumnosFiltrados = filtrarAlumnos();
    listaAlumnosSinFamilia.innerHTML = alumnosFiltrados.map(([id, alumno]) => `
        <div class="list-group-item">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <strong>${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}</strong>
                    <br>
                    <small>Grado: ${alumno.gradoActual} | Dojang: ${alumno.dojang.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}</small>
                </div>
                <button class="btn btn-sm btn-primary" onclick="seleccionarAlumno('${id}')">
                    Seleccionar
                </button>
            </div>
        </div>
    `).join('');
}

// Seleccionar alumno para familia
window.seleccionarAlumno = function (alumnoId) {
    if (!alumnosSeleccionados.has(alumnoId)) {
        alumnosSeleccionados.add(alumnoId);
        actualizarMiembrosSeleccionados();
        actualizarPlanPagoAutomatico();
    }
};

// Actualizar miembros seleccionados
function actualizarMiembrosSeleccionados() {
    miembrosSeleccionados.innerHTML = Array.from(alumnosSeleccionados).map(id => {
        const alumno = alumnosData[id];
        return `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}</strong>
                        <br>
                        <small>Grado: ${alumno.gradoActual} | Dojang: ${alumno.dojang.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}</small>
                    </div>
                    <button class="btn btn-sm btn-danger" onclick="removerAlumno('${id}')">
                        Remover
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Remover alumno de la selección
window.removerAlumno = function (alumnoId) {
    alumnosSeleccionados.delete(alumnoId);
    actualizarMiembrosSeleccionados();
    actualizarPlanPagoAutomatico();
};

// Actualizar plan de pago automáticamente
function actualizarPlanPagoAutomatico() {
    const numMiembros = alumnosSeleccionados.size;
    const plan1 = document.getElementById('plan1');
    const plan2 = document.getElementById('plan2');
    const plan3 = document.getElementById('plan3');

    if (numMiembros === 1) {
        plan1.checked = true;
    } else if (numMiembros === 2) {
        plan2.checked = true;
    } else if (numMiembros >= 3) {
        plan3.checked = true;
    }
}

// Crear nueva familia
formularioFamilia.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (alumnosSeleccionados.size === 0) {
        mostrarAdvertencia('Debe seleccionar al menos un alumno para crear una familia');
        return;
    }

    const nombreFamilia = document.getElementById('nombreFamilia').value.toUpperCase().trim();

    // Validar nombre de familia
    if (!nombreFamilia) {
        mostrarAdvertencia('Debe ingresar un nombre de familia');
        return;
    }

    // Convertir a array para asegurar consistencia
    const miembrosArray = Array.from(alumnosSeleccionados);

    const numMiembros = miembrosArray.length;
    const montoMensual = determinarPrecioPorMiembros(miembrosArray);
    const planPago = determinarPlanPorMiembros(miembrosArray);

    // Generar un ID único para la familia
    const familiaId = `familia_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Crear referencia directa con ID generado
    const familiaRef = ref(database, `familias/${familiaId}`);

    const familiaData = {
        nombre_familia: nombreFamilia,
        miembros: miembrosArray,
        plan_pago: planPago,
        monto_mensual: montoMensual,
        total_ahorros: 0,  // Inicializar total de ahorros
        fecha_creacion: new Date().toISOString()
    };

    try {
        // Guardar datos de la familia
        await set(familiaRef, familiaData);

        // Actualizar alumnos con el ID de familia
        const updates = {};
        miembrosArray.forEach(alumnoId => {
            updates[`/alumnos/${alumnoId}/familia_id`] = familiaId;
        });
        await update(ref(database), updates);

        // Limpiar formulario
        formularioFamilia.reset();
        alumnosSeleccionados.clear();
        actualizarMiembrosSeleccionados();
        mostrarExito('Familia creada exitosamente');
    } catch (error) {
        console.error('Error al crear familia:', error);
        mostrarError('Hubo un problema al crear la familia. Intente nuevamente.');
    }
});

// Función para obtener el doyang de una familia
function obtenerDoyangFamilia(familiaId) {
    const familia = familiasData[familiaId];
    if (!familia) return '';

    const doyangs = familia.miembros.map(alumnoId => {
        const alumno = alumnosData[alumnoId];
        return alumno ?
            alumno.dojang.charAt(0).toUpperCase() + alumno.dojang.slice(1).toLowerCase() :
            '';
    });

    return doyangs.join(', ');
}

// Actualizar lista de familias con filtros
function actualizarListaFamilias() {
    const contenedorFamilias = document.getElementById('contenedorFamilias');
    contenedorFamilias.innerHTML = ''; // Limpiar lista existente

    const dojang = dojangFiltro.value.toLowerCase();
    const busqueda = busquedaAlumno.value.toLowerCase();

    const familiasFiltradas = Object.entries(familiasData || {})
        .filter(([familiaId, familia]) => {
            // Filtro por dojang
            const doyangFamilia = obtenerDoyangFamilia(familiaId).toLowerCase();
            const coincideDojang = !dojang || doyangFamilia.includes(dojang);

            // Filtro por búsqueda
            const nombreFamilia = familia.nombre_familia.toLowerCase();
            const coincideBusqueda = !busqueda ||
                nombreFamilia.includes(busqueda) ||
                familia.miembros.some(alumnoId => {
                    const alumno = alumnosData[alumnoId];
                    return alumno &&
                        (`${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}`)
                            .toLowerCase().includes(busqueda);
                });

            return coincideDojang && coincideBusqueda;
        })
        .map(([familiaId, familia]) => {
            // Calcular precio y plan dinámicamente
            const montoMensual = determinarPrecioPorMiembros(familia.miembros);
            const planPago = determinarPlanPorMiembros(familia.miembros);

            // Obtener nombres de miembros
            const miembros = Array.isArray(familia.miembros) ? familia.miembros : Object.keys(familia.miembros || {});
            const nombresMiembros = miembros.map(alumnoId => {
                const alumno = alumnosData[alumnoId];
                return alumno ? `${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}` : 'Alumno eliminado';
            });

            // Crear elemento para la familia
            const tarjeta = document.createElement('div');
            tarjeta.className = 'col-md-4 mb-3';
            tarjeta.innerHTML = `
                <div class="card">
                    <div class="card-header bg-dark text-white">
                        <h5 class="card-title mb-0">${familia.nombre_familia}</h5>
                    </div>
                    <div class="card-body">
                        <p class="card-text">
                            <strong>Plan:</strong> ${planPago === '1_persona' ? '1 persona' :
                    planPago === '2_personas' ? '2 personas' : '3 o más'}<br>
                            <strong>Monto Mensual:</strong> $${montoMensual.toFixed(2)}<br>
                            <strong>Dojang:</strong> ${obtenerDoyangFamilia(familiaId)}<br>
                            <strong>Miembros:</strong>
                            <ul class="pl-3">
                                ${nombresMiembros.map(nombre => `<li>${nombre}</li>`).join('')}
                            </ul>
                        </p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-sm btn-outline-primary mr-2" onclick="editarFamilia('${familiaId}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="eliminarFamilia('${familiaId}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;

            return tarjeta;
        });

    // Agregar tarjetas filtradas al contenedor
    familiasFiltradas.forEach(tarjeta => {
        contenedorFamilias.appendChild(tarjeta);
    });

    // Mostrar mensaje si no hay familias
    if (contenedorFamilias.children.length === 0) {
        const mensajeNoResultados = document.createElement('div');
        mensajeNoResultados.className = 'alert alert-info text-center';
        mensajeNoResultados.textContent = 'No se encontraron familias que coincidan con los filtros.';
        contenedorFamilias.appendChild(mensajeNoResultados);
    }
}

// Eliminar familia
window.eliminarFamilia = async function (familiaId) {
    if (!confirm('¿Está seguro de eliminar esta familia? Los alumnos volverán a estar sin familia asignada.')) {
        return;
    }

    const familia = familiasData[familiaId];

    // Actualizar alumnos para remover el ID de familia
    const updates = {};
    familia.miembros.forEach(alumnoId => {
        updates[`/alumnos/${alumnoId}/familia_id`] = null;
    });

    // Eliminar familia y actualizar alumnos
    updates[`/familias/${familiaId}`] = null;
    await update(ref(database), updates);

    mostrarExito('Familia eliminada exitosamente');
};

// Función para abrir el modal de edición de familia
window.editarFamilia = async function (familiaId) {
    const familia = familiasData[familiaId];
    if (!familia) {
        mostrarError('Familia no encontrada');
        return;
    }

    // Guardar el ID de la familia que se está editando
    document.getElementById('editarFamiliaId').value = familiaId;

    // Establecer el nombre de la familia
    document.getElementById('editarNombreFamilia').value = familia.nombre_familia;

    // Establecer el monto mensual
    document.getElementById('editarMontoMensual').value = familia.monto_mensual;

    // Mostrar miembros actuales
    actualizarMiembrosActuales(familiaId);

    // Mostrar alumnos disponibles para agregar
    actualizarAlumnosDisponibles(familiaId);

    // Mostrar el modal usando jQuery
    $('#modalEditarFamilia').modal('show');

    // Agregar event listener para la búsqueda
    document.getElementById('buscarAlumnoEditar').addEventListener('input', function () {
        actualizarAlumnosDisponibles(familiaId);
    });
};

// Función para actualizar la lista de miembros actuales
function actualizarMiembrosActuales(familiaId) {
    const familia = familiasData[familiaId];
    const miembrosActuales = document.getElementById('miembrosActuales');
    miembrosActuales.innerHTML = familia.miembros.map(alumnoId => {
        const alumno = alumnosData[alumnoId];
        if (!alumno) return '';
        return `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}</strong>
                        <br>
                        <small>Grado: ${alumno.gradoActual} | Dojang: ${alumno.dojang.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}</small>
                    </div>
                    <button type="button" class="btn btn-sm btn-danger" onclick="removerMiembroFamilia('${familiaId}', '${alumnoId}')">
                        <i class="fas fa-user-minus"></i> Remover
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Función para actualizar la lista de alumnos disponibles
function actualizarAlumnosDisponibles(familiaId) {
    const searchTerm = document.getElementById('buscarAlumnoEditar').value.toLowerCase();
    const alumnosDisponibles = document.getElementById('alumnosDisponiblesEditar');

    alumnosDisponibles.innerHTML = Object.entries(alumnosData)
        .filter(([id, alumno]) => {
            // Filtrar por disponibilidad (sin familia o familia vacía)
            const disponible = !alumno.familia_id || alumno.familia_id === '';

            // Filtrar por término de búsqueda
            const nombreCompleto = `${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}`.toLowerCase();
            const coincideBusqueda = nombreCompleto.includes(searchTerm);

            return disponible && coincideBusqueda;
        })
        .map(([id, alumno]) => `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}</strong>
                        <br>
                        <small>Grado: ${alumno.gradoActual} | Dojang: ${alumno.dojang.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}</small>
                    </div>
                    <button type="button" class="btn btn-sm btn-success" onclick="agregarMiembroFamilia('${familiaId}', '${id}')">
                        <i class="fas fa-user-plus"></i> Agregar
                    </button>
                </div>
            </div>
        `).join('');
}

// Función para guardar los cambios de la familia
window.guardarCambiosFamilia = async function () {
    const familiaId = document.getElementById('editarFamiliaId').value;
    const nombreFamilia = document.getElementById('editarNombreFamilia').value.toUpperCase();
    const montoMensual = parseFloat(document.getElementById('editarMontoMensual').value);

    if (!familiaId || !nombreFamilia || isNaN(montoMensual) || montoMensual <= 0) {
        mostrarError('Por favor complete todos los campos correctamente');
        return;
    }

    try {
        const updates = {
            [`/familias/${familiaId}/nombre_familia`]: nombreFamilia,
            [`/familias/${familiaId}/monto_mensual`]: montoMensual
        };

        await update(ref(database), updates);

        // Cerrar el modal usando jQuery
        $('#modalEditarFamilia').modal('hide');

        mostrarExito('Familia actualizada correctamente');
    } catch (error) {
        console.error('Error al actualizar familia:', error);
        mostrarError('Error al actualizar la familia');
    }
};

// Función para remover un miembro de la familia
window.removerMiembroFamilia = async function (familiaId, alumnoId) {
    if (!confirm('¿Está seguro de que desea remover este miembro de la familia?')) {
        return;
    }

    try {
        const familia = familiasData[familiaId];
        if (!familia) throw new Error('Familia no encontrada');

        // Remover el alumno de la familia
        const nuevosmiembros = familia.miembros.filter(id => id !== alumnoId);

        // No permitir dejar una familia sin miembros
        if (nuevosmiembros.length === 0) {
            mostrarAdvertencia('No se puede dejar una familia sin miembros. Si desea eliminar la familia, use el botón "Eliminar".');
            return;
        }

        // Actualizar la familia y el alumno
        const updates = {
            [`/familias/${familiaId}/miembros`]: nuevosmiembros,
            [`/alumnos/${alumnoId}/familia_id`]: null
        };

        await update(ref(database), updates);

        // Actualizar la vista
        editarFamilia(familiaId);
    } catch (error) {
        console.error('Error al remover miembro:', error);
        mostrarError('Error al remover miembro de la familia');
    }
};

// Función para agregar un nuevo miembro a la familia
window.removerMiembroFamilia = async function (familiaId, alumnoId) {
    if (!confirm('¿Está seguro de que desea remover este miembro de la familia?')) {
        return;
    }

    try {
        const familia = familiasData[familiaId];
        if (!familia) throw new Error('Familia no encontrada');

        // Remover el alumno de la familia
        const nuevosmiembros = familia.miembros.filter(id => id !== alumnoId);

        // No permitir dejar una familia sin miembros
        if (nuevosmiembros.length === 0) {
            mostrarAdvertencia('No se puede dejar una familia sin miembros. Si desea eliminar la familia, use el botón "Eliminar".');
            return;
        }

        // Determinar nuevo plan y monto
        const nuevoNumMiembros = nuevosmiembros.length;
        const nuevoPlanPago = determinarPlanPorMiembros(nuevoNumMiembros);
        const nuevoMontoMensual = determinarPrecioPorMiembros(nuevoNumMiembros);

        // Actualizar la familia y el alumno
        const updates = {
            [`/familias/${familiaId}/miembros`]: nuevosmiembros,
            [`/familias/${familiaId}/plan_pago`]: nuevoPlanPago,
            [`/familias/${familiaId}/monto_mensual`]: nuevoMontoMensual,
            [`/alumnos/${alumnoId}/familia_id`]: null
        };

        await update(ref(database), updates);

        // Actualizar la vista
        editarFamilia(familiaId);
    } catch (error) {
        console.error('Error al remover miembro:', error);
        mostrarError('Error al remover miembro de la familia');
    }
};

// Event listeners para filtros
dojangFiltro.addEventListener('change', () => {
    actualizarListaAlumnosSinFamilia();
    actualizarListaFamilias();
});

busquedaAlumno.addEventListener('input', () => {
    actualizarListaAlumnosSinFamilia();
    actualizarListaFamilias();
});

// Inicializar
cargarDatos();
