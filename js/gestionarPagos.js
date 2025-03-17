import app from './firebaseConfig.js';
import { getDatabase, ref, push, get, set, update, onValue, child } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { mostrarExito, mostrarError, mostrarAdvertencia, mostrarInformacion } from './sweetalert-utils.js';
import { determinarPrecioPorMiembros } from './utils-precios.js';

const database = getDatabase(app);
const alumnosRef = ref(database, 'alumnos');
const familiasRef = ref(database, 'familias');
const pagosRef = ref(database, 'pagos');
const adeudosRef = ref(database, 'adeudos');

// Verificar autenticación
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    }
});

// Referencias a elementos del DOM
const dojangFiltro = document.getElementById('dojangFiltro');
const estadoFiltro = document.getElementById('estadoFiltro');
const busquedaFamilia = document.getElementById('busquedaFamilia');
const listaFamilias = document.getElementById('listaFamilias');
const tablaPagos = document.getElementById('tablaPagos');

// Variables globales
let alumnosData = {};
let familiasData = {};
let pagosData = {};
let adeudosData = {};

async function cargarDatos() {
    try {
        // Configurar listeners en tiempo real para datos
        onValue(alumnosRef, (snapshot) => {
            alumnosData = snapshot.val() || {};
            actualizarListaFamilias();
        }, (error) => {
            console.error('Error al cargar alumnos:', error);
        });

        onValue(familiasRef, (snapshot) => {
            familiasData = snapshot.val() || {};
            actualizarListaFamilias();
        }, (error) => {
            console.error('Error al cargar familias:', error);
        });

        onValue(pagosRef, (snapshot) => {
            pagosData = snapshot.val() || {};
            actualizarListaFamilias();
        }, (error) => {
            console.error('Error al cargar pagos:', error);
        });

        onValue(adeudosRef, (snapshot) => {
            adeudosData = snapshot.val() || {};
            actualizarListaFamilias();
        }, (error) => {
            console.error('Error al cargar adeudos:', error);
        });

        // Actualizar la lista de familias inicialmente
        const listaFamilias = document.getElementById('listaFamilias');
        if (listaFamilias) {
            actualizarListaFamilias();
        } else {
            console.error('Elemento listaFamilias no encontrado');
        }
    } catch (error) {
        console.error('Error al configurar listeners de datos:', error);
    }
}

// Calcular estado de pago para una familia
function calcularEstadoPagoFamilia(familiaId) {
    const familia = familiasData[familiaId];
    if (!familia) return 'sin_pago';

    // Obtener pagos de la familia
    const pagosFamilia = Object.values(pagosData || {})
        .filter(pago => pago.familia_id === familiaId);

    // Si no hay pagos, siempre retornar 'sin_pago'
    if (pagosFamilia.length === 0) {
        return 'sin_pago';
    }

    // Fecha de inicio para cálculo de adeudos
    const fechaInicioPago = new Date('2025-01-01');
    const fechaActual = new Date();

    // Calcular meses transcurridos desde enero 2025
    const mesesTotales = calcularMesesTranscurridos(fechaInicioPago, fechaActual);

    // Buscar el último pago para el mes actual
    const ultimoPagoMesActual = pagosFamilia
        .filter(pago => {
            const fechaPago = new Date(pago.fecha || pago.fecha_pago);
            return fechaPago >= fechaInicioPago &&
                fechaPago.getMonth() === fechaActual.getMonth() &&
                fechaPago.getFullYear() === fechaActual.getFullYear();
        })
        .sort((a, b) => new Date(b.fecha || b.fecha_pago) - new Date(a.fecha || a.fecha_pago))
    [0];

    // Calcular total pagado desde enero 2025
    const totalPagado = pagosFamilia.reduce((total, pago) => {
        // Verificar si el pago es de enero 2025 en adelante
        const fechaPago = new Date(pago.fecha || pago.fecha_pago);
        if (fechaPago < fechaInicioPago) return total;

        // Considerar pagos con beca como completos
        if (pago.es_beca) {
            return total + parseFloat(familia.monto_mensual);
        }

        const montoPago = pago.monto !== undefined ? pago.monto :
            (pago.monto_pagado !== undefined ? pago.monto_pagado : 0);
        return total + (parseFloat(montoPago) || 0);
    }, 0);

    // Calcular total esperado
    const montoMensual = determinarPrecioPorMiembros(familia.miembros || []);
    const totalEsperado = montoMensual * mesesTotales;

    // Determinar estado de pago
    // Si hay un pago del mes actual
    if (ultimoPagoMesActual) {
        // Si es un pago con beca, marcar como al corriente
        if (ultimoPagoMesActual.es_beca) {
            return 'al_corriente';
        }

        // Si el pago no cubre el monto completo, marcar como adeudo
        const montoPagoActual = parseFloat(ultimoPagoMesActual.monto || ultimoPagoMesActual.monto_pagado || 0);
        if (montoPagoActual < montoMensual) {
            return 'adeudo';
        }
    }

    // Si el total pagado cubre lo esperado
    if (totalPagado >= totalEsperado) {
        return 'al_corriente';
    }

    // Si hay pagos pero no cubre lo esperado
    if (totalPagado > 0) {
        return 'adeudo';
    }

    // Sin pagos
    return 'sin_pago';
}

// Calcular meses transcurridos entre dos fechas
function calcularMesesTranscurridos(fechaInicio, fechaFin) {
    return Math.floor(
        (fechaFin.getTime() - fechaInicio.getTime()) /
        (1000 * 60 * 60 * 24 * 30.44)  // Promedio de días por mes
    );
}

// Obtener el estado actual de una familia
function obtenerEstadoFamilia(familiaId) {
    const familia = familiasData[familiaId];
    if (!familia) return 'desconocido';

    // Verificar adeudos
    const adeudosPendientes = Object.values(adeudosData || {}).filter(adeudo =>
        adeudo.familia_id === familiaId && adeudo.estado === 'pendiente'
    );
    if (adeudosPendientes.length > 0) return 'adeudo';

    return calcularEstadoPagoFamilia(familiaId);
}

// Filtrar familias
function filtrarFamilias() {
    const dojang = dojangFiltro.value.toLowerCase();
    const estado = estadoFiltro.value;
    const busqueda = busquedaFamilia.value.toLowerCase();

    return Object.entries(familiasData).filter(([id, familia]) => {
        // Filtro por dojang
        const coincideDojang = !dojang || familia.miembros.some(alumnoId => {
            const alumno = alumnosData[alumnoId];
            return alumno && alumno.dojang.toLowerCase().includes(dojang);
        });

        // Filtro por estado
        const estadoFamilia = obtenerEstadoFamilia(id);
        const coincideEstado = !estado || estadoFamilia === estado;

        // Filtro por búsqueda (nombre de familia o nombre de algún miembro)
        const nombreFamilia = familia.nombre_familia.toLowerCase();
        const coincideBusquedaFamilia = nombreFamilia.includes(busqueda);
        const coincideBusquedaMiembro = familia.miembros.some(alumnoId => {
            const alumno = alumnosData[alumnoId];
            if (!alumno) return false;
            const nombreCompleto = `${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}`.toLowerCase();
            return nombreCompleto.includes(busqueda);
        });

        return coincideDojang && coincideEstado && (coincideBusquedaFamilia || coincideBusquedaMiembro);
    });
}

// Función para mostrar la lista de pagos
function mostrarListaPagos(familiaId) {
    const contenedorPagos = document.getElementById('contenedorTablaPagos');
    const modalTitulo = document.querySelector('#modalListaPagos .modal-title');
    const familia = familiasData[familiaId];

    if (!familia) {
        if (contenedorPagos) {
            contenedorPagos.innerHTML = '<p class="text-danger">Error: Familia no encontrada</p>';
        }
        return;
    }

    // Actualizar título del modal
    if (modalTitulo) {
        modalTitulo.textContent = `Pagos de la familia ${familia.nombre_familia}`;
    }

    // Establecer el familiaId como un atributo de datos en la modal
    const modalListaPagos = document.getElementById('modalListaPagos');
    modalListaPagos.dataset.familiaId = familiaId;

    // Filtrar pagos de esta familia
    const pagosFamilia = Object.entries(pagosData || {})
        .filter(([_, pago]) => pago.familia_id === familiaId)
        .sort((a, b) => b[1].mes_correspondiente.localeCompare(a[1].mes_correspondiente));

    // Crear y mostrar la tabla de pagos
    const tabla = document.createElement('div');
    tabla.className = 'table-responsive';

    // Agregar input oculto para el ID de la familia
    const familiaIdInput = document.createElement('input');
    familiaIdInput.type = 'hidden';
    familiaIdInput.name = 'familiaId';
    familiaIdInput.value = familiaId;
    tabla.appendChild(familiaIdInput);

    if (pagosFamilia.length === 0) {
        // No hay pagos registrados
        tabla.innerHTML += `
            <div class="alert alert-info text-center">
                <p>No se han registrado pagos para esta familia.</p>
                <p>Haga clic en "Registrar Pago" para agregar el primer pago.</p>
            </div>
        `;
    } else {
        // Hay pagos registrados
        tabla.innerHTML += `
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Mes correspondiente</th>
                        <th>Monto</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${pagosFamilia.map(([pagoId, pago]) => {
            const fecha = new Date(pago.fecha).toLocaleDateString();

            // Corregir la visualización del mes
            const [anio, mes] = pago.mes_correspondiente.split('-');
            const mesFormateado = new Date(anio, parseInt(mes) - 1).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long'
            });

            const tipoPago = pago.es_beca ? `${pago.tipo_pago} (Beca)` : pago.tipo_pago;
            const estado = pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1);

            return `
                            <tr>
                                <td>${fecha}</td>
                                <td>${mesFormateado}</td>
                                <td>$${pago.monto}</td>
                                <td>${tipoPago}</td>
                                <td>${estado}</td>
                                <td>
                                    <div class="btn-group">
                                        <button class="btn btn-primary btn-sm mr-2" onclick="editarPago('${pagoId}')">
                                            <i class="fas fa-edit"></i> Editar
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="eliminarPago('${pagoId}')">
                                            <i class="fas fa-trash"></i> Eliminar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
        `;
    }

    if (contenedorPagos) {
        contenedorPagos.innerHTML = '';
        contenedorPagos.appendChild(tabla);
    }

    // Mostrar el modal usando jQuery
    const $modal = $('#modalListaPagos');
    if ($modal.length) {
        $modal.modal('show');
    } else {
        console.error('Modal no encontrado');
    }
}

// Función para editar un pago
window.editarPago = function (pagoId) {
    const pago = pagosData[pagoId];
    if (!pago) {
        mostrarError('Error: Pago no encontrado');
        return;
    }

    const familia = familiasData[pago.familia_id];
    if (!familia) {
        mostrarError('Error: Familia no encontrada');
        return;
    }

    // Llenar el formulario con los datos actuales
    const editarPagoIdInput = document.getElementById('editarPagoId');
    const editarFamiliaInfoDiv = document.getElementById('editarFamiliaInfo');
    const editarMesPagoSelect = document.getElementById('editarMesPago');
    const editarAnoPagoSelect = document.getElementById('editarAnoPago');
    const editarMontoPagoInput = document.getElementById('editarMontoPago');
    const editarTipoPagoSelect = document.getElementById('editarTipoPago');
    const editarEsBecaInput = document.getElementById('editarEsBeca');

    // Verificar que todos los elementos existen
    if (!editarPagoIdInput || !editarFamiliaInfoDiv || !editarMesPagoSelect ||
        !editarAnoPagoSelect || !editarMontoPagoInput || !editarTipoPagoSelect || !editarEsBecaInput) {
        console.error('Error: No se encontraron todos los elementos del formulario de edición');
        mostrarError('Error: No se pueden cargar los datos del pago');
        return;
    }

    editarPagoIdInput.value = pagoId;
    editarFamiliaInfoDiv.textContent = familia.nombre_familia;

    // Llenar el select de meses
    llenarSelectMeses(editarMesPagoSelect);
    editarMesPagoSelect.value = pago.mes_correspondiente.split('-')[1];

    // Llenar el select de años
    llenarSelectAnos(editarAnoPagoSelect);
    editarAnoPagoSelect.value = pago.mes_correspondiente.split('-')[0];

    editarMontoPagoInput.value = pago.monto;
    editarTipoPagoSelect.value = pago.tipo_pago;
    editarEsBecaInput.checked = pago.es_beca;

    // Ocultar el modal de lista de pagos y mostrar el modal de edición
    $('#modalListaPagos').modal('hide');
    $('#modalEditarPago').modal('show');
};

// Función para guardar la edición de un pago
window.guardarEdicionPago = async function () {
    const pagoId = document.getElementById('editarPagoId').value;
    const pago = pagosData[pagoId];
    if (!pago) {
        mostrarError('Error: Pago no encontrado');
        return;
    }

    const familia = familiasData[pago.familia_id];
    if (!familia) {
        mostrarError('Error: Familia no encontrada');
        return;
    }

    const mesPago = document.getElementById('editarMesPago').value;
    const anoPago = document.getElementById('editarAnoPago').value;
    const montoPago = parseFloat(document.getElementById('editarMontoPago').value);
    const tipoPago = document.getElementById('editarTipoPago').value;
    const esBeca = document.getElementById('editarEsBeca').checked;

    if (!mesPago || !anoPago || isNaN(montoPago) || !tipoPago) {
        mostrarAdvertencia('Por favor, complete todos los campos correctamente');
        return;
    }

    try {
        // Actualizar el pago
        const pagoActualizado = {
            ...pago,
            mes_correspondiente: `${anoPago}-${mesPago}`, // Formato YYYY-MM
            monto: montoPago,
            tipo_pago: tipoPago,
            es_beca: esBeca,
            estado: esBeca ? 'completo' : (montoPago >= familia.monto_mensual ? 'completo' : 'parcial')
        };

        // Actualizar el pago en la base de datos
        await update(ref(database, `pagos/${pagoId}`), pagoActualizado);

        // Actualizar o crear adeudo según corresponda
        const adeudoExistente = Object.entries(adeudosData || {}).find(([_, adeudo]) =>
            adeudo.pago_id === pagoId);

        if (adeudoExistente) {
            const [adeudoId, _] = adeudoExistente;
            if (esBeca || montoPago >= familia.monto_mensual) {
                // Eliminar adeudo si el pago ahora es completo
                await update(ref(database), {
                    [`/adeudos/${adeudoId}`]: null
                });
            } else {
                // Actualizar adeudo con el nuevo monto
                await update(ref(database, `adeudos/${adeudoId}`), {
                    monto_adeudo: familia.monto_mensual - montoPago,
                    estado: 'pendiente'
                });
            }
        } else if (!esBeca && montoPago < familia.monto_mensual) {
            // Crear nuevo adeudo si el pago es parcial y no es beca
            const nuevoAdeudoRef = push(adeudosRef);
            await set(nuevoAdeudoRef, {
                familia_id: pago.familia_id,
                mes: `${anoPago}-${mesPago}`,
                monto_adeudo: familia.monto_mensual - montoPago,
                fecha_registro: new Date().toISOString(),
                estado: 'pendiente',
                pago_id: pagoId
            });
        }

        // Cerrar modal y actualizar vista
        $('#modalEditarPago').modal('hide');
        mostrarListaPagos(pago.familia_id);
        mostrarExito('Pago actualizado correctamente');
    } catch (error) {
        console.error('Error al actualizar el pago:', error);
        mostrarError('Error al actualizar el pago. No se pudo guardar el pago. Intente nuevamente.');
    }
};

// Función para registrar un pago
async function registrarPago(familiaId) {
    if (!familiaId || !familiasData || !familiasData[familiaId]) {
        console.error('Error: Familia no encontrada', { familiaId, familiasData });
        mostrarError('Error: Familia no encontrada');
        return;
    }

    const familia = familiasData[familiaId];
    const mesInput = document.getElementById('mesPago');
    const anoInput = document.getElementById('anoPago');
    const montoInput = document.getElementById('montoPago');
    const tipoInput = document.getElementById('tipoPago');
    const esBecaInput = document.getElementById('esBeca');

    if (!mesInput || !anoInput || !montoInput || !tipoInput || !esBecaInput) {
        console.error('Error: Elementos del formulario no encontrados');
        mostrarError('Error: Elementos del formulario no encontrados');
        return;
    }

    const mesPago = mesInput.value;
    const anoPago = anoInput.value;
    const montoPago = parseFloat(montoInput.value);
    const tipoPago = tipoInput.value;
    const esBeca = esBecaInput.checked;

    if (!mesPago || !anoPago || isNaN(montoPago) || !tipoPago) {
        mostrarAdvertencia('Por favor, complete todos los campos correctamente');
        return;
    }

    try {
        const nuevoPagoRef = push(pagosRef);
        const fechaPago = new Date().toISOString(); // Usar la fecha actual

        const nuevoPago = {
            familia_id: familiaId,
            mes_correspondiente: `${anoPago}-${mesPago}`, // Formato YYYY-MM
            monto: montoPago,
            tipo_pago: tipoPago,
            es_beca: esBeca,
            fecha: fechaPago,
            estado: esBeca ? 'completo' : (montoPago >= familia.monto_mensual ? 'completo' : 'parcial')
        };

        await set(nuevoPagoRef, nuevoPago);

        // Solo registrar adeudo si no es beca y el pago es menor al monto mensual
        if (!esBeca && montoPago < familia.monto_mensual) {
            const nuevoAdeudoRef = push(adeudosRef);
            await set(nuevoAdeudoRef, {
                familia_id: familiaId,
                mes: `${anoPago}-${mesPago}`,
                monto_adeudo: familia.monto_mensual - montoPago,
                fecha_registro: fechaPago,
                estado: 'pendiente',
                pago_id: nuevoPagoRef.key
            });
        }

        // Actualizar el estado de los miembros de la familia
        const updates = {};
        familia.miembros.forEach(miembroId => {
            if (alumnosData[miembroId] && alumnosData[miembroId].estado !== 'break') {
                updates[`/alumnos/${miembroId}/estado`] = nuevoPago.estado === 'completo' ? 'al_corriente' : 'adeudo';
            }
        });

        if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
        }

        cerrarModalPago();
        mostrarListaPagos(familiaId);
        mostrarExito('Pago registrado correctamente');
    } catch (error) {
        console.error('Error al registrar el pago:', error);
        mostrarError('Error al registrar el pago. No se pudo guardar el pago. Intente nuevamente.');
    }
};

// Función para eliminar un pago
async function eliminarPago(pagoId) {
    if (confirm('¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer.')) {
        try {
            const pagoRef = ref(database, `pagos/${pagoId}`);
            const pagoSnapshot = await get(pagoRef);
            const pago = pagoSnapshot.val();

            await set(pagoRef, null);

            // Actualizar la vista inmediatamente
            if (pago) {
                mostrarListaPagos(pago.familia_id);
            }

            mostrarExito('Pago eliminado correctamente');
        } catch (error) {
            console.error('Error al eliminar el pago:', error);
            mostrarError('Error al eliminar el pago. No se pudo eliminar el pago. Intente nuevamente.');
        }
    }
}

// Función para formatear el último pago
function formatearUltimoPago(familiaId) {
    // Buscar todos los pagos de la familia
    const pagosFamilia = Object.entries(pagosData || {})
        .filter(([_, pago]) => pago.familia_id === familiaId)
        .sort((a, b) => b[1].mes_correspondiente.localeCompare(a[1].mes_correspondiente));

    // Si no hay pagos, devolver un mensaje
    if (pagosFamilia.length === 0) {
        return 'Sin pagos';
    }

    // Tomar el último pago (el más reciente)
    const [_, ultimoPago] = pagosFamilia[0];

    // Formatear la fecha del último pago
    const [anio, mes] = ultimoPago.mes_correspondiente.split('-');
    const mesFormateado = new Date(anio, parseInt(mes) - 1).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long'
    });

    // Formatear el estado y el tipo de pago
    const estado = ultimoPago.estado.charAt(0).toUpperCase() + ultimoPago.estado.slice(1);
    const tipoPago = ultimoPago.es_beca ? `${ultimoPago.tipo_pago} (Beca)` : ultimoPago.tipo_pago;

    return `${mesFormateado} - $${ultimoPago.monto} (${tipoPago}) - ${estado}`;
}

// Actualizar lista de familias
function actualizarListaFamilias() {
    const dojang = dojangFiltro.value.toLowerCase();
    const estado = estadoFiltro.value;
    const busqueda = busquedaFamilia.value.toLowerCase();

    listaFamilias.innerHTML = Object.entries(familiasData || {})
        .filter(([id, familia]) => {
            // Filtro por dojang
            const coincideDojang = !dojang || familia.miembros.some(alumnoId => {
                const alumno = alumnosData[alumnoId];
                return alumno && alumno.dojang.toLowerCase().includes(dojang);
            });

            // Filtro por estado
            const estadoFamilia = obtenerEstadoFamilia(id);
            const coincideEstado = !estado || estadoFamilia === estado;

            // Filtro por búsqueda
            const nombreFamilia = familia.nombre_familia.toLowerCase();
            const coincideBusquedaFamilia = nombreFamilia.includes(busqueda);
            const coincideBusquedaMiembro = familia.miembros && familia.miembros.some(alumnoId => {
                const alumno = alumnosData[alumnoId];
                if (!alumno) return false;
                const nombreCompleto = `${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}`.toLowerCase();
                return nombreCompleto.includes(busqueda);
            });

            return (coincideDojang && coincideEstado &&
                (coincideBusquedaFamilia || coincideBusquedaMiembro));
        })
        .map(([id, familia]) => {
            // Obtener el estado de la familia
            const estadoFamilia = obtenerEstadoFamilia(id);

            // Formatear los miembros
            let miembrosNombres = '';
            if (Array.isArray(familia.miembros)) {
                miembrosNombres = familia.miembros.map(alumnoId => {
                    const alumno = alumnosData[alumnoId];
                    return alumno ? `${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}` : 'Alumno eliminado';
                }).join(', ');
            } else {
                miembrosNombres = Object.values(familia.miembros || {}).map(alumnoId => {
                    const alumno = alumnosData[alumnoId];
                    return alumno ? `${alumno.nombre} ${alumno.apellidoPaterno}` : 'Alumno eliminado';
                }).join(', ');
            }

            // Formatear el último pago
            const ultimoPago = formatearUltimoPago(id);

            // Determinar precio basado en número de miembros
            const montoMensual = determinarPrecioPorMiembros(familia.miembros);

            // Crear la tarjeta de la familia
            let badgeClase = '';
            let estadoFamiliaTexto = '';
            if (estadoFamilia === 'al_corriente') {
                badgeClase = 'badge-success';
                estadoFamiliaTexto = 'Al Corriente';
            } else if (estadoFamilia === 'adeudo') {
                badgeClase = 'badge-danger';
                estadoFamiliaTexto = 'Adeudo';
            } else {
                badgeClase = 'badge-secondary';
                estadoFamiliaTexto = 'Sin Pago';
            }

            // Mapeo de planes de pago
            const planPagoTexto = {
                '1_persona': '1 persona',
                '2_personas': '2 personas',
                '3_o_mas': '3 o más'
            };

            return `
                <div class="col-md-4 mb-4">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="card-title mb-0">${familia.nombre_familia}</h5>
                            <span class="badge ${badgeClase}">${estadoFamiliaTexto}</span>
                        </div>
                        <div class="card-body">
                            <p class="card-text">
                                <strong>Plan:</strong> ${planPagoTexto[familia.plan_pago] || 'Sin plan'}<br>
                                <strong>Monto Mensual:</strong> $${(familia.monto_mensual || 0).toFixed(2)}<br>
                                <strong>Total Ahorros:</strong> $${(familia.total_ahorros || 0).toFixed(2)}<br>
                                <strong>Miembros:</strong>
                                <ul class="pl-3">
                                    ${miembrosNombres.split(',').map(nombre => `<li>${nombre}</li>`).join('')}
                                </ul>
                                <strong>Último Pago:</strong> ${ultimoPago}
                            </p>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-primary btn-block" onclick="mostrarListaPagos('${id}')">
                                <i class="fas fa-list"></i> Ver Pagos
                            </button>
                        </div>
                    </div>
                </div>
            `;
        })
        .join('');
}

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await cargarDatos();

        // Asegurar que los selectores de filtro estén disponibles antes de configurarlos
        const dojangFiltro = document.getElementById('dojangFiltro');
        const estadoFiltro = document.getElementById('estadoFiltro');
        const busquedaFamilia = document.getElementById('busquedaFamilia');
        const listaFamilias = document.getElementById('listaFamilias');

        // Configurar eventos de filtro si los elementos existen
        if (dojangFiltro) {
            dojangFiltro.addEventListener('change', actualizarListaFamilias);
        } else {
            console.warn('Elemento dojangFiltro no encontrado');
        }

        if (estadoFiltro) {
            estadoFiltro.addEventListener('change', actualizarListaFamilias);
        } else {
            console.warn('Elemento estadoFiltro no encontrado');
        }

        if (busquedaFamilia) {
            busquedaFamilia.addEventListener('input', actualizarListaFamilias);
        } else {
            console.warn('Elemento busquedaFamilia no encontrado');
        }

        // Llenar años al cargar la página
        llenarSelectAnos();
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        mostrarError('Hubo un problema al cargar los datos. Por favor, recargue la página.');
    }
});

// Exportar funciones al objeto window
window.abrirModalPago = abrirModalPago;
window.cerrarModalPago = cerrarModalPago;
window.guardarPago = guardarPago;
window.editarPago = editarPago;
window.guardarEdicionPago = guardarEdicionPago;
window.eliminarPago = eliminarPago;
window.mostrarListaPagos = mostrarListaPagos;

// Función para abrir el modal de pago desde la lista de pagos
function abrirModalPagoDesdeListaPagos() {
    // Intentar obtener el ID de la familia de diferentes maneras
    let familiaId = null;

    // Primero, buscar un input oculto con el ID de la familia
    const familiaIdInput = document.querySelector('#modalListaPagos input[name="familiaId"]');
    if (familiaIdInput) {
        familiaId = familiaIdInput.value;
    }

    // Si no se encuentra, intentar obtener de un elemento con ID 'familiaId'
    if (!familiaId) {
        const familiaIdElement = document.getElementById('familiaId');
        if (familiaIdElement) {
            familiaId = familiaIdElement.value;
        }
    }

    // Si aún no se encuentra, intentar obtener de un atributo de datos en la modal
    if (!familiaId) {
        const modalListaPagos = document.getElementById('modalListaPagos');
        if (modalListaPagos) {
            familiaId = modalListaPagos.getAttribute('data-familia-id');
        }
    }

    // Si no se encuentra el ID de la familia, mostrar error
    if (!familiaId) {
        console.error('Error: No se encontró el ID de la familia');
        mostrarError('No se puede registrar el pago. No se encontró la familia.');
        return;
    }

    // Cerrar modal de lista de pagos
    $('#modalListaPagos').modal('hide');

    // Abrir la modal de pago
    abrirModalPago(familiaId);
}

// Exponer la función al ámbito global
window.abrirModalPagoDesdeListaPagos = abrirModalPagoDesdeListaPagos;

// Funciones para el modal de pago
function llenarSelectMeses(select = document.getElementById('mesPago')) {
    select.innerHTML = ''; // Limpiar opciones existentes

    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Agregar opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Seleccione el mes';
    select.appendChild(defaultOption);

    // Agregar meses
    meses.forEach((mes, index) => {
        const option = document.createElement('option');
        // Usar índice + 1 con padding para mantener formato de dos dígitos
        option.value = (index + 1).toString().padStart(2, '0');
        option.textContent = mes;
        select.appendChild(option);
    });
}

function llenarSelectAnos(select = document.getElementById('anoPago')) {
    select.innerHTML = ''; // Limpiar opciones existentes

    const fechaActual = new Date();
    const anioActual = fechaActual.getFullYear();

    // Agregar opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Seleccione el año';
    select.appendChild(defaultOption);

    // Agregar años: año actual, año anterior y año siguiente
    const years = [anioActual - 1, anioActual, anioActual + 1];

    years.forEach(anio => {
        const option = document.createElement('option');
        option.value = anio.toString();
        option.textContent = anio.toString();
        select.appendChild(option);
    });

    // Establecer el año actual como seleccionado por defecto
    select.value = anioActual.toString();
}

function abrirModalPago(familiaId) {
    console.log('Abriendo modal de pago para familia:', familiaId);

    // Validar existencia de la familia
    if (!familiaId || !familiasData || !familiasData[familiaId]) {
        console.error('Error: Familia no encontrada', { familiaId, familiasData });
        mostrarError('No se encontró la información de la familia.');
        return;
    }

    const familia = familiasData[familiaId];
    const familiaInfo = `${familia.nombre_familia}`;

    // Obtener referencias de elementos
    const modalPago = $('#modalPago');
    const formPago = document.getElementById('formPago');
    const familiaIdInput = document.getElementById('familiaId');
    const familiaInfoElement = document.getElementById('familiaInfo');

    // Limpiar y resetear formulario
    if (formPago) {
        formPago.reset();
    }
    if (familiaIdInput) {
        familiaIdInput.value = familiaId;
    }
    if (familiaInfoElement) {
        familiaInfoElement.textContent = familiaInfo;
    }

    // Llenar select de meses y años
    llenarSelectMeses();
    llenarSelectAnos();

    // Configurar modal para prevenir cierre no deseado
    modalPago.modal({
        backdrop: 'static',  // Prevenir cierre al hacer clic fuera
        keyboard: false      // Prevenir cierre con tecla Esc
    });

    // Mostrar modal de pago
    modalPago.modal('show');

    // Intentar cerrar la modal de lista de pagos
    try {
        $('#modalListaPagos').modal('hide');
    } catch (error) {
        console.log('No se pudo cerrar la modal de lista de pagos:', error);
    }
}

function prevenirCierreModal() {
    $('#modalPago').on('hide.bs.modal', function (e) {
        console.log('Intento de cierre de modal detectado');
        e.preventDefault(); // Prevenir cierre automático
        return false;
    });
}

function cerrarModalPago() {
    console.log('Cerrando modal de pago manualmente');

    // Limpiar formulario
    const formPago = document.getElementById('formPago');
    if (formPago) {
        formPago.reset();
    }

    // Limpiar checkbox de beca
    const esBecaInput = document.getElementById('esBeca');
    if (esBecaInput) {
        esBecaInput.checked = false;
    }

    // Forzar cierre del modal
    const modalPago = $('#modalPago');
    modalPago.off('hide.bs.modal'); // Remover manejadores de eventos
    modalPago.modal('hide');
}

function guardarPago() {
    console.log('Iniciando guardarPago()');

    // Obtener referencias de elementos
    const familiaIdElement = document.getElementById('familiaId');
    const mesPagoElement = document.getElementById('mesPago');
    const anoPagoElement = document.getElementById('anoPago');
    const montoPagoElement = document.getElementById('montoPago');
    const tipoPagoElement = document.getElementById('tipoPago');
    const esBecaElement = document.getElementById('esBeca');

    // Validaciones
    if (!montoPagoElement || !mesPagoElement || !anoPagoElement || !tipoPagoElement || !esBecaElement) {
        console.error('Elementos del formulario no encontrados', [montoPagoElement, mesPagoElement, anoPagoElement, tipoPagoElement, esBecaElement]);
        mostrarError('No se pudieron encontrar todos los elementos necesarios.');
        return;
    }

    // Obtener valores con validación adicional
    const familiaId = familiaIdElement.value.trim();
    const mesPago = mesPagoElement.value.trim();
    const anoPago = anoPagoElement.value.trim();
    const montoPago = parseFloat(montoPagoElement.value);
    const tipoPago = tipoPagoElement.value.trim();
    const esBeca = esBecaElement.checked;

    console.log('Valores obtenidos:', {
        familiaId, mesPago, anoPago, montoPago, tipoPago, esBeca
    });

    // Validaciones
    if (!familiaId || !mesPago || !anoPago || isNaN(montoPago) || !tipoPago) {
        mostrarAdvertencia('Por favor, complete todos los campos correctamente');
        return;
    }

    // Verificar existencia de familia
    const familia = familiasData[familiaId];
    if (!familia) {
        console.error('Familia no encontrada', { familiaId, familiasData });
        mostrarError('Familia no encontrada');
        return;
    }

    // Determinar precio basado en número de miembros
    const montoMensual = determinarPrecioPorMiembros(familia.miembros);

    // Verificar si el pago es completo
    const estadoPago = esBeca || montoPago >= montoMensual ? 'completo' : 'parcial';

    const nuevoPago = {
        familia_id: familiaId,
        mes_correspondiente: `${anoPago}-${mesPago}`, // Formato YYYY-MM
        monto: montoPago,
        tipo_pago: tipoPago,
        es_beca: esBeca,
        fecha: new Date().toISOString(),
        estado: estadoPago
    };

    console.log('Nuevo pago a registrar:', nuevoPago);

    // Registrar pago en Firebase
    const nuevoPagoRef = push(pagosRef, nuevoPago);

    nuevoPagoRef
        .then(() => {
            console.log('Pago registrado exitosamente');

            // Limpiar formulario
            document.getElementById('formPago').reset();

            // Mostrar mensaje de éxito
            mostrarExito('Pago registrado correctamente');
        })
        .catch((error) => {
            console.error('Error al registrar pago:', error);
            mostrarError('Error al registrar el pago. No se pudo guardar el pago. Intente nuevamente.');
        });
}

// Añadir event listener al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    // Configuración global para prevenir cierre de modales
    $('.modal').on('hide.bs.modal', function (e) {
        console.log('Intento de cierre de modal detectado:', this.id);
        // Si necesitas permitir el cierre en algunos casos específicos, agrega lógica aquí
    });
});

// Función para renderizar tarjetas de familia con estado de pago actualizado
function renderizarTarjetasFamilias() {
    const contenedorFamilias = document.getElementById('contenedorFamilias');
    contenedorFamilias.innerHTML = '';

    Object.entries(familiasData || {}).forEach(([id, familia]) => {
        // Calcular estado de pago
        const estadoPago = calcularEstadoPagoFamilia(id);

        // Determinar clase de estado
        const clasesEstado = {
            'al_corriente': 'success',
            'adeudo': 'danger',
            'sin_pago': 'warning'
        };

        // Texto descriptivo del estado
        const textoEstado = {
            'al_corriente': 'Al Corriente',
            'adeudo': 'Adeudo',
            'sin_pago': 'Sin Pago'
        };

        // Mapeo de planes de pago
        const planPagoTexto = {
            '1_persona': '1 persona',
            '2_personas': '2 personas',
            '3_o_mas': '3 o más'
        };

        // Crear tarjeta de familia
        const tarjetaFamilia = `
            <div class="col-md-4 mb-4">
                <div class="card">
                    <div class="card-header bg-${clasesEstado[estadoPago]} text-white">
                        ${familia.nombre_familia}
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">
                            <span class="badge badge-${clasesEstado[estadoPago]}">
                                ${textoEstado[estadoPago]}
                            </span>
                        </h5>
                        <p class="card-text">
                            <strong>Miembros:</strong> ${familia.miembros?.length || 0}<br>
                            <strong>Plan:</strong> ${planPagoTexto[familia.plan_pago] || familia.plan_pago || 'Sin plan'}<br>
                            <strong>Monto Mensual:</strong> $${(familia.monto_mensual || 0).toFixed(2)}<br>
                            <strong>Total Ahorros:</strong> $${(familia.total_ahorros || 0).toFixed(2)}<br>
                            <strong>Miembros:</strong>
                            <ul class="pl-3">
                                ${familia.miembros.map(alumnoId => {
            const alumno = alumnosData[alumnoId];
            return alumno ? `<li>${alumno.nombre} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}</li>` : 'Alumno eliminado';
        }).join('')}
                            </ul>
                            <strong>Último Pago:</strong> ${formatearUltimoPago(id) || 'Sin pagos'}
                        </p>
                        <div class="btn-group" role="group">
                            <button class="btn btn-primary" onclick="abrirModalEditarFamilia('${id}')">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-info" onclick="verDetallesPago('${id}')">
                                <i class="fas fa-file-invoice-dollar"></i> Detalles
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        contenedorFamilias.insertAdjacentHTML('beforeend', tarjetaFamilia);
    });
}

// Función para abrir modal de ahorro desde el modal de lista de pagos
async function abrirModalAhorro() {
    // Obtener el ID de la familia del modal de lista de pagos
    const familiaId = document.getElementById('modalListaPagos').dataset.familiaId;

    // Cerrar modal de lista de pagos
    $('#modalListaPagos').modal('hide');

    // Preparar modal de ahorro
    const modalAhorro = document.getElementById('modalRegistroAhorro');
    const inputMontoAhorro = document.getElementById('montoAhorro');
    const totalAhorradoDisplay = document.getElementById('totalAhorradoDisplay');

    // Resetear valores
    inputMontoAhorro.value = '';

    // Obtener total de ahorros actual
    const familiaRef = ref(database, `familias/${familiaId}`);
    const familiaSnapshot = await get(familiaRef);
    const familiaData = familiaSnapshot.val();
    const totalAhorros = familiaData.total_ahorros || 0;

    // Actualizar display de total ahorrado
    totalAhorradoDisplay.textContent = `$${totalAhorros.toFixed(2)}`;

    // Almacenar familiaId para usar en guardar
    modalAhorro.dataset.familiaId = familiaId;

    // Mostrar modal de ahorro
    $(modalAhorro).modal('show');
}

// Función para guardar ahorro
async function guardarAhorro() {
    const modalAhorro = document.getElementById('modalRegistroAhorro');
    const familiaId = modalAhorro.dataset.familiaId;
    const montoAhorro = parseFloat(document.getElementById('montoAhorro').value);
    const totalAhorradoDisplay = document.getElementById('totalAhorradoDisplay');

    // Validaciones
    if (!montoAhorro || montoAhorro <= 0) {
        mostrarAdvertencia('Por favor, ingrese un monto de ahorro válido');
        return;
    }

    try {
        // Referencia a la familia
        const familiaRef = ref(database, `familias/${familiaId}`);

        // Obtener datos actuales de la familia
        const familiaSnapshot = await get(familiaRef);
        const familiaData = familiaSnapshot.val();

        // Calcular total de ahorros
        const totalAhorrosActual = familiaData.total_ahorros || 0;
        const nuevoTotalAhorros = totalAhorrosActual + montoAhorro;

        // Actualizar total de ahorros en la familia
        await update(familiaRef, {
            total_ahorros: nuevoTotalAhorros
        });

        // Registrar entrada de ahorro
        const ahorrosRef = ref(database, 'ahorros');
        const nuevoAhorroRef = push(child(ahorrosRef, familiaId));

        await set(nuevoAhorroRef, {
            familia_id: familiaId,
            monto: montoAhorro,
            fecha_registro: new Date().toISOString()
        });

        // Actualizar display
        totalAhorradoDisplay.textContent = `$${nuevoTotalAhorros.toFixed(2)}`;

        mostrarExito(`Ahorro de $${montoAhorro.toFixed(2)} registrado exitosamente`);

        // Actualizar la lista de familias y reportes
        await Promise.all([
            actualizarListaFamilias(),
            actualizarReportesDespuesDeAhorros()
        ]);
    } catch (error) {
        console.error('Error al guardar ahorro:', error);
        mostrarError('No se pudo registrar el ahorro');
    }
}

// Función para retirar ahorros
async function retirarAhorros() {
    const modalAhorro = document.getElementById('modalRegistroAhorro');
    const familiaId = modalAhorro.dataset.familiaId;
    const totalAhorradoDisplay = document.getElementById('totalAhorradoDisplay');

    // Obtener el monto total de ahorros
    const familiaRef = ref(database, `familias/${familiaId}`);
    const familiaSnapshot = await get(familiaRef);
    const familiaData = familiaSnapshot.val();
    const totalAhorrosActual = familiaData.total_ahorros || 0;

    // Mostrar confirmación con SweetAlert
    Swal.fire({
        title: '¿Estás seguro?',
        html: `Estás a punto de retirar <strong>$${totalAhorrosActual.toFixed(2)}</strong> en ahorros.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, retirar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                // Registrar retiro de ahorros
                const ahorrosRef = ref(database, 'ahorros');
                const nuevoRetiroRef = push(child(ahorrosRef, familiaId));

                await set(nuevoRetiroRef, {
                    familia_id: familiaId,
                    monto: -totalAhorrosActual, // Indica un retiro total con valor negativo
                    tipo: 'retiro_total',
                    fecha_registro: new Date().toISOString()
                });

                // Actualizar total de ahorros a 0
                await update(familiaRef, {
                    total_ahorros: 0
                });

                // Actualizar display
                totalAhorradoDisplay.textContent = '$0.00';

                Swal.fire({
                    title: 'Ahorros Retirados',
                    html: `Se han retirado <strong>$${totalAhorrosActual.toFixed(2)}</strong> en ahorros.`,
                    icon: 'success'
                });

                // Actualizar la lista de familias y reportes
                await Promise.all([
                    actualizarListaFamilias(),
                    actualizarReportesDespuesDeAhorros()
                ]);
            } catch (error) {
                console.error('Error al retirar ahorros:', error);
                Swal.fire({
                    title: 'Error',
                    text: 'No se pudieron retirar los ahorros',
                    icon: 'error'
                });
            }
        }
    });
}

// Función para actualizar reportes después de cambios en ahorros
async function actualizarReportesDespuesDeAhorros() {
    try {
        // Verificar si la página de reportes está abierta
        if (typeof calcularTotalAhorros === 'function') {
            await calcularTotalAhorros();
        }
    } catch (error) {
        console.error('Error al actualizar reportes:', error);
    }
}

// Exponer funciones al ámbito global
window.abrirModalAhorro = abrirModalAhorro;
window.guardarAhorro = guardarAhorro;
window.retirarAhorros = retirarAhorros;