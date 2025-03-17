import app from './firebaseConfig.js';
import { getDatabase, ref, onValue, remove, update, query, orderByChild, equalTo, get } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import * as XLSX from 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';
import { mostrarExito, mostrarError, mostrarAdvertencia } from './sweetalert-utils.js';

const database = getDatabase(app);
const alumnosRef = ref(database, 'alumnos');
const familiasRef = ref(database, 'familias');
const pagosRef = ref(database, 'pagos');

// Verificar autenticación
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    }
});

// Variables globales
let alumnosData = {};
let familiasData = {};
let pagosData = {};

// Referencias a elementos del DOM
const dojangFiltro = document.getElementById('dojangFiltro');
const estadoFiltro = document.getElementById('estadoFiltro');
const mesFiltro = document.getElementById('mesFiltro');
const busquedaFamilia = document.getElementById('busquedaFamilia');
const tablaPagos = document.getElementById('tablaPagos');

// Actualizar tabla de pagos
function actualizarTablaPagos() {
    try {
        // Verificar que los elementos del DOM existan
        const tablaPagosBody = document.getElementById('tablaPagos');
        if (!tablaPagosBody) {
            console.error('Elemento tablaPagos no encontrado');
            return;
        }

        // Verificar que los datos necesarios estén cargados
        if (!pagosData || !familiasData) {
            console.log('Datos de pagos o familias no cargados');
            return;
        }

        const pagosArray = Object.entries(pagosData || {})
            .map(([id, pago]) => {
                // Verificar que el pago y la familia existan
                if (!pago || !pago.familia_id) {
                    console.log('Pago inválido:', pago);
                    return null;
                }

                const familia = familiasData[pago.familia_id];
                if (!familia) {
                    console.warn('Familia no encontrada para pago:', {
                        pagoId: id,
                        familiaId: pago.familia_id,
                        pagoData: pago
                    });
                    return null;
                }

                // Obtener el doyang de la familia
                const doyangFamilia = obtenerDoyangFamilia(pago.familia_id);

                // Determinar el monto del pago
                const montoPago = pago.monto !== undefined ? pago.monto :
                    (pago.monto_pagado !== undefined ? pago.monto_pagado : 0);

                return {
                    id,
                    familia_id: pago.familia_id,
                    fecha: pago.fecha ? new Date(pago.fecha).toLocaleDateString('es-MX') :
                        (pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString('es-MX') : 'N/A'),
                    familia: familia.nombre_familia || 'Sin nombre',
                    doyang: doyangFamilia.split(' ').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ') || 'N/A',
                    mes: pago.mes_correspondiente ?
                        (() => {
                            console.log('Mes correspondiente:', pago.mes_correspondiente);
                            const [year, month] = pago.mes_correspondiente.split('-').map(Number);
                            const mesDate = new Date(year, month - 1, 1);  // month is 0-indexed
                            console.log('Fecha mes:', mesDate);
                            const mesFormateado = mesDate.toLocaleDateString('es-MX', {
                                year: 'numeric',
                                month: 'long'
                            });
                            console.log('Mes formateado:', mesFormateado);
                            return mesFormateado;
                        })() : 'N/A',
                    pago: parseFloat(montoPago).toFixed(2),
                    faltante: pago.es_beca ? '0.00' :
                        (familia.monto_mensual - parseFloat(montoPago)).toFixed(2),
                    tipo: pago.es_beca ? `${pago.tipo_pago} (Beca)` : pago.tipo_pago,
                    estado: calcularEstadoPagoFamilia(pago.familia_id),
                    montoEsperado: familia.monto_mensual
                };
            })
            .filter(pago => pago !== null)
            .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        // Limpiar tabla existente
        tablaPagosBody.innerHTML = pagosArray.map(pago => `
            <tr>
                <td>${pago.fecha}</td>
                <td>${pago.familia}</td>
                <td>${pago.doyang}</td>
                <td>${pago.mes}</td>
                <td>$${pago.pago}</td>
                <td>$${pago.faltante}</td>
                <td>${pago.tipo}</td>
                <td>
                    <span class="badge badge-${pago.estado === 'al_corriente' ? 'success' :
                pago.estado === 'adeudo' ? 'danger' : 'secondary'}">
                        ${pago.estado === 'al_corriente' ? 'Al día' :
                pago.estado === 'adeudo' ? 'Adeudado' : 'Sin Pago'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="eliminarPago('${pago.id}', '${pago.familia_id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        console.log(`Tabla de pagos actualizada. Total pagos: ${pagosArray.length}`);

        // Actualizar resumen de pagos
        actualizarResumen();
    } catch (error) {
        console.error('Error al actualizar tabla de pagos:', error);
    }
}

// Actualizar resumen
function actualizarResumen() {
    try {
        const totalFamilias = Object.keys(familiasData || {}).length;

        // Calcular total recaudado
        const totalRecaudado = Object.values(pagosData || {})
            .reduce((total, pago) => {
                // Verificar si la familia existe
                const familia = familiasData[pago.familia_id];
                if (!familia) return total;

                // Usar monto o monto_pagado
                const montoPago = pago.monto !== undefined ? pago.monto :
                    (pago.monto_pagado !== undefined ? pago.monto_pagado : 0);

                return total + (parseFloat(montoPago) || 0);
            }, 0);

        // Calcular total adeudos
        const totalAdeudos = Object.entries(familiasData || {})
            .reduce((totalAdeudo, [familiaId, familia]) => {
                // Calcular pagos totales para esta familia
                const pagosFamilia = Object.values(pagosData || {})
                    .filter(pago => pago.familia_id === familiaId);

                const totalPagado = pagosFamilia.reduce((total, pago) => {
                    const montoPago = pago.monto !== undefined ? pago.monto :
                        (pago.monto_pagado !== undefined ? pago.monto_pagado : 0);
                    return total + (parseFloat(montoPago) || 0);
                }, 0);

                // Calcular adeudo: monto mensual * número de meses pendientes
                const montoMensual = familia.monto_mensual || 0;
                const mesesPendientes = Math.max(0, Math.floor(
                    (new Date() - new Date(familia.fecha_registro || Date.now())) /
                    (1000 * 60 * 60 * 24 * 30)
                ) - pagosFamilia.length);

                const adeudoFamilia = montoMensual * mesesPendientes - totalPagado;

                return totalAdeudo + Math.max(0, adeudoFamilia);
            }, 0);

        // Calcular total ahorros
        const totalAhorros = Object.values(familiasData || {})
            .reduce((total, familia) => total + (familia.total_ahorros || 0), 0);

        // Actualizar elementos en el DOM
        const resumenData = {
            totalFamilias,
            totalRecaudado,
            totalAdeudos,
            totalAhorros
        };

        console.log('Resumen actualizado:', resumenData);

        // Actualizar elementos del DOM si existen
        if (document.getElementById('totalFamilias'))
            document.getElementById('totalFamilias').textContent = totalFamilias;
        if (document.getElementById('totalRecaudado'))
            document.getElementById('totalRecaudado').textContent = `$${totalRecaudado.toFixed(2)}`;
        if (document.getElementById('totalAdeudos'))
            document.getElementById('totalAdeudos').textContent = `$${totalAdeudos.toFixed(2)}`;
        if (document.getElementById('totalAhorros'))
            document.getElementById('totalAhorros').textContent = `$${totalAhorros.toFixed(2)}`;

        return resumenData;
    } catch (error) {
        console.error('Error al actualizar resumen:', error);
        return {
            totalFamilias: 0,
            totalRecaudado: 0,
            totalAdeudos: 0,
            totalAhorros: 0
        };
    }
}

// Exportar a Excel
function exportarExcel() {
    // Verificar que los datos necesarios estén cargados
    if (!pagosData || !familiasData) {
        mostrarAdvertencia('Aún no se han cargado los datos. Por favor, espere.');
        return;
    }

    const pagosFiltrados = filtrarPagos();

    // Preparar datos para exportación, excluyendo columnas de Editar y Eliminar
    const datosExcel = pagosFiltrados.map(pago => ({
        Fecha: pago.fecha,
        Familia: pago.familia,
        Doyang: pago.doyang,
        Mes: pago.mes,
        Pago: parseFloat(pago.pago),
        Faltante: parseFloat(pago.faltante),
        Tipo: pago.tipo,
        Estado: pago.estado === 'al_corriente' ? 'Al día' :
            pago.estado === 'adeudo' ? 'Adeudado' : 'Sin Pago'
    }));

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();

    // Crear hoja de pagos
    const wsPagos = XLSX.utils.json_to_sheet(datosExcel);

    // Definir formato para encabezados
    const headerStyle = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E0E0E0' } }
    };

    // Aplicar estilo a la primera fila (encabezados)
    const range = XLSX.utils.decode_range(wsPagos['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!wsPagos[cellAddress].s) {
            wsPagos[cellAddress].s = headerStyle;
        }
    }

    // Ajustar ancho de columnas
    wsPagos['!cols'] = [
        { wch: 15 },  // Fecha
        { wch: 25 },  // Familia
        { wch: 20 },  // Doyang
        { wch: 15 },  // Mes
        { wch: 15 },  // Pago
        { wch: 15 },  // Faltante
        { wch: 20 },  // Tipo
        { wch: 15 }   // Estado
    ];

    // Agregar franjas de color para filas
    const rowStyle = {
        fill: { patternType: 'solid', fgColor: { rgb: 'F0F0F0' } }
    };

    for (let row = 1; row <= datosExcel.length; row++) {
        if (row % 2 === 0) {
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                if (wsPagos[cellAddress]) {
                    wsPagos[cellAddress].s = rowStyle;
                }
            }
        }
    }

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(wb, wsPagos, "Pagos");

    // Descargar archivo
    try {
        XLSX.writeFile(wb, `reporte_pagos_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
        console.error('Error al exportar a Excel:', error);
        mostrarError('Error al exportar a Excel');
    }
}

// Eliminar pagos
async function eliminarPago(pagoId, familiaId) {
    if (!confirm('¿Está seguro de que desea eliminar este pago? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        // Eliminar el pago
        await remove(ref(database, `pagos/${pagoId}`));

        // Actualizar el estado de los miembros de la familia
        const familia = familiasData[familiaId];
        if (familia && familia.miembros) {
            const updates = {};

            // Obtener el último pago válido de la familia
            const ultimoPago = Object.entries(pagosData || {})
                .filter(([id, pago]) => pago.familia_id === familiaId && id !== pagoId)
                .sort((a, b) => b[1].mes_correspondiente.localeCompare(a[1].mes_correspondiente))[0];

            familia.miembros.forEach(miembroId => {
                if (alumnosData[miembroId] && alumnosData[miembroId].estado !== 'break') {
                    updates[`/alumnos/${miembroId}/estado`] = ultimoPago ?
                        (ultimoPago[1].estado === 'completo' ? 'al_corriente' : 'adeudo') :
                        'adeudo';
                }
            });

            if (Object.keys(updates).length > 0) {
                await update(ref(database), updates);
            }
        }

        mostrarExito('Pago eliminado correctamente');
    } catch (error) {
        console.error('Error al eliminar el pago:', error);
        mostrarError('Error al eliminar el pago');
    }
}

// Hacer funciones disponibles globalmente
window.eliminarPago = eliminarPago;
window.exportarExcel = exportarExcel;

// Event listeners
dojangFiltro.addEventListener('change', filtrarPagos);
estadoFiltro.addEventListener('change', filtrarPagos);
busquedaFamilia.addEventListener('input', filtrarPagos);

document.getElementById('btnExportarExcel').addEventListener('click', exportarExcel);

// Inicializar
cargarDatos();
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Cargar datos
        await cargarDatos();

        // Configurar filtros
        const dojangFiltro = document.getElementById('dojangFiltro');
        const estadoFiltro = document.getElementById('estadoFiltro');
        const mesFiltro = document.getElementById('mesFiltro');
        const busquedaFamilia = document.getElementById('busquedaFamilia');

        // Establecer mes actual por defecto
        const fechaActual = new Date();
        const mesActual = fechaActual.toISOString().slice(0, 7);
        mesFiltro.value = mesActual;

        // Llenar select de doyang
        const doyangSelect = document.getElementById('dojangFiltro');
        const doyangUnicos = new Set(
            Object.values(familiasData || {}).map(familia => familia.doyang)
        );
        doyangUnicos.forEach(doyang => {
            const option = document.createElement('option');
            option.value = doyang;
            option.textContent = doyang;
            doyangSelect.appendChild(option);
        });

        // Configurar eventos de filtro
        dojangFiltro.addEventListener('change', filtrarPagos);
        estadoFiltro.addEventListener('change', filtrarPagos);
        mesFiltro.addEventListener('change', filtrarPagos);
        busquedaFamilia.addEventListener('input', filtrarPagos);

        // Ejecutar filtrado inicial
        filtrarPagos();

    } catch (error) {
        console.error('Error al inicializar página de reportes:', error);
        mostrarError('No se pudieron cargar los datos. Intente de nuevo.');
    }
});

// Función para obtener el doyang de una familia
function obtenerDoyangFamilia(familiaId) {
    const familia = familiasData[familiaId];
    if (!familia || !familia.miembros || familia.miembros.length === 0) return '';

    // Tomamos el doyang del primer miembro y lo capitalizamos
    const primerMiembro = alumnosData[familia.miembros[0]];
    return primerMiembro ?
        primerMiembro.dojang.charAt(0).toUpperCase() + primerMiembro.dojang.slice(1).toLowerCase() :
        '';
}

// Calcular estado de pago de una familia
function calcularEstadoPagoFamilia(familiaId) {
    const familia = familiasData[familiaId];
    if (!familia) return 'sin_pago';

    // Obtener pagos de la familia
    const pagosFamilia = Object.values(pagosData || {})
        .filter(pago => pago.familia_id === familiaId);

    // Si no hay pagos, siempre retornar 'sin_pago'
    if (pagosFamilia.length === 0) {
        console.log(`Familia ${familia.nombre_familia} (${familiaId}): Sin pagos - Estado: sin_pago`);
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
    const montoMensual = familia.monto_mensual || 0;
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

// Calcular porcentaje pagado
function calcularPorcentajePagado(familiaId) {
    const familia = familiasData[familiaId];
    if (!familia) return 0;

    // Obtener pagos de la familia
    const pagosFamilia = Object.values(pagosData || {})
        .filter(pago => pago.familia_id === familiaId);

    // Calcular monto mensual
    const montoMensual = familia.monto_mensual || 0;

    // Fecha de inicio para cálculo de adeudos
    const fechaInicioPago = new Date('2025-01-01');
    const fechaActual = new Date();

    // Calcular meses transcurridos desde enero 2025
    const mesesTotales = calcularMesesTranscurridos(fechaInicioPago, fechaActual);

    // Calcular total pagado desde enero 2025
    const totalPagado = pagosFamilia.reduce((total, pago) => {
        // Verificar si el pago es de enero 2025 en adelante
        const fechaPago = new Date(pago.fecha || pago.fecha_pago);
        if (fechaPago < fechaInicioPago) return total;

        const montoPago = pago.monto !== undefined ? pago.monto :
            (pago.monto_pagado !== undefined ? pago.monto_pagado : 0);

        return total + (parseFloat(montoPago) || 0);
    }, 0);

    // Calcular total esperado
    const totalEsperado = montoMensual * mesesTotales;

    // Calcular porcentaje
    return totalEsperado > 0 ? (totalPagado / totalEsperado) * 100 : 0;
}

// Filtrar pagos
function filtrarPagos() {
    const dojang = dojangFiltro.value.toLowerCase();
    const estado = estadoFiltro.value;
    const mesFiltrado = mesFiltro.value;
    const busqueda = busquedaFamilia.value.toLowerCase();

    const pagosFiltrados = Object.entries(pagosData || {})
        .filter(([id, pago]) => {
            const familia = familiasData[pago.familia_id];
            if (!familia) return false;

            // Filtro por doyang
            const doyangFamilia = obtenerDoyangFamilia(pago.familia_id).toLowerCase();
            const coincideDojang = !dojang || doyangFamilia.includes(dojang);

            // Filtro por mes
            const coincideMes = !mesFiltrado ||
                (pago.mes_correspondiente || '').startsWith(mesFiltrado);

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

            // Filtro por estado
            const estadoPago = calcularEstadoPagoFamilia(pago.familia_id);
            const coincideEstado = !estado || estadoPago === estado;

            return coincideDojang && coincideMes && coincideBusqueda && coincideEstado;
        })
        .map(([id, pago]) => {
            const familia = familiasData[pago.familia_id];
            const doyangFamilia = obtenerDoyangFamilia(pago.familia_id);
            const estadoPago = calcularEstadoPagoFamilia(pago.familia_id);

            // Calcular faltante, considerando pagos con beca
            const montoMensual = familia.monto_mensual || 0;
            const montoPago = parseFloat(pago.monto || pago.monto_pagado || 0);
            const faltante = pago.es_beca ? 0 : (montoMensual - montoPago).toFixed(2);

            return {
                id,
                fecha: pago.fecha ? new Date(pago.fecha).toLocaleDateString('es-MX') :
                    (pago.fecha_pago ? new Date(pago.fecha_pago).toLocaleDateString('es-MX') : 'N/A'),
                familia: familia.nombre_familia || 'Sin nombre',
                doyang: doyangFamilia.split(' ').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ') || 'N/A',
                mes: pago.mes_correspondiente ?
                    (() => {
                        console.log('Mes correspondiente:', pago.mes_correspondiente);
                        const [year, month] = pago.mes_correspondiente.split('-').map(Number);
                        const mesDate = new Date(year, month - 1, 1);  // month is 0-indexed
                        console.log('Fecha mes:', mesDate);
                        const mesFormateado = mesDate.toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'long'
                        });
                        console.log('Mes formateado:', mesFormateado);
                        return mesFormateado;
                    })() : 'N/A',
                pago: parseFloat(pago.monto || pago.monto_pagado || 0).toFixed(2),
                faltante: faltante,
                tipo: pago.es_beca ? `${pago.tipo_pago} (Beca)` : pago.tipo_pago,
                estado: estadoPago
            };
        });

    // Actualizar tabla de pagos
    const tablaPagosBody = document.getElementById('tablaPagos');
    tablaPagosBody.innerHTML = pagosFiltrados.map(pago => `
        <tr>
            <td>${pago.fecha}</td>
            <td>${pago.familia}</td>
            <td>${pago.doyang}</td>
            <td>${pago.mes}</td>
            <td>$${pago.pago}</td>
            <td>$${pago.faltante}</td>
            <td>${pago.tipo}</td>
            <td>
                <span class="badge badge-${pago.estado === 'al_corriente' ? 'success' :
            pago.estado === 'adeudo' ? 'danger' : 'secondary'}">
                    ${pago.estado === 'al_corriente' ? 'Al día' :
            pago.estado === 'adeudo' ? 'Adeudado' : 'Sin Pago'}
                </span>
            </td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="eliminarPago('${pago.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Actualizar resumen con pagos filtrados
    const totalRecaudado = pagosFiltrados.reduce((total, pago) =>
        total + parseFloat(pago.pago), 0);
    const totalAdeudos = pagosFiltrados.reduce((total, pago) =>
        total + parseFloat(pago.faltante), 0);
    const totalFamilias = new Set(pagosFiltrados.map(pago => pago.familia)).size;

    document.getElementById('totalRecaudado').textContent = `$${totalRecaudado.toFixed(2)}`;
    document.getElementById('totalAdeudos').textContent = `$${totalAdeudos.toFixed(2)}`;
    document.getElementById('totalFamilias').textContent = totalFamilias;

    return pagosFiltrados;
}

// Inicializar listeners de filtros
function inicializarFiltros() {
    // Listeners para filtros
    dojangFiltro.addEventListener('change', filtrarPagos);
    estadoFiltro.addEventListener('change', filtrarPagos);
    busquedaFamilia.addEventListener('input', filtrarPagos);

    // Listeners para fechas
    mesFiltro.addEventListener('change', filtrarPagos);
}

// Cargar datos iniciales
function cargarDatos() {
    // Función de manejo de errores
    const handleError = (source, error) => {
        console.error(`Error cargando ${source}:`, error);
    };

    // Cargar datos de alumnos
    onValue(alumnosRef, (snapshot) => {
        try {
            alumnosData = snapshot.val() || {};
            console.log('Alumnos cargados:', Object.keys(alumnosData).length);
            actualizarResumen();
            inicializarFiltros();
        } catch (error) {
            handleError('alumnos', error);
        }
    }, (error) => handleError('alumnos', error));

    // Cargar datos de familias
    onValue(familiasRef, (snapshot) => {
        try {
            familiasData = snapshot.val() || {};
            console.log('Familias cargadas:', Object.keys(familiasData).length);
            actualizarResumen();
        } catch (error) {
            handleError('familias', error);
        }
    }, (error) => handleError('familias', error));

    // Cargar datos de pagos
    onValue(pagosRef, (snapshot) => {
        try {
            pagosData = snapshot.val() || {};
            console.log('Pagos cargados:', Object.keys(pagosData).length);
            actualizarResumen();
            actualizarTablaPagos();
        } catch (error) {
            handleError('pagos', error);
        }
    }, (error) => handleError('pagos', error));
}

// Calcular meses transcurridos entre dos fechas
function calcularMesesTranscurridos(fechaInicio, fechaFin) {
    return Math.floor(
        (fechaFin.getTime() - fechaInicio.getTime()) /
        (1000 * 60 * 60 * 24 * 30.44)  // Promedio de días por mes
    );
}

// Variable global para almacenar el resumen
let resumenGeneral = {
    totalFamilias: 0,
    totalRecaudado: 0,
    totalAdeudos: 0,
    totalAhorros: 0
};

// Función para calcular y mostrar el total de ahorros
async function calcularTotalAhorros() {
    console.log(' Iniciando cálculo de ahorros');
    console.log('Dojang seleccionado: todos');

    try {
        const familiaRef = ref(database, 'familias');
        const alumnosRef = ref(database, 'alumnos');

        console.log(' Cargando datos de alumnos...');
        const alumnosSnapshot = await get(alumnosRef);
        const alumnosData = alumnosSnapshot.val() || {};
        console.log('Número de alumnos:', Object.keys(alumnosData).length);

        console.log(' Cargando datos de familias...');
        const familiaSnapshot = await get(familiaRef);
        const familias = familiaSnapshot.val() || {};
        console.log('Número de familias:', Object.keys(familias).length);

        // Filtrar y calcular ahorros por doyang
        const familiasFiltradas = Object.entries(familias)
            .filter(([_, familia]) => {
                // Si es 'todos', mostrar todo
                return true;

            });

        console.log('Familias filtradas:', familiasFiltradas.length);

        const totalAhorros = familiasFiltradas
            .reduce((total, [_, familia]) => {
                console.log(`Ahorro de familia ${familia.nombre_familia}: $${familia.total_ahorros || 0}`);
                return total + (familia.total_ahorros || 0);
            }, 0);

        console.log(` Total de ahorros para dojang todos: $${totalAhorros.toFixed(2)}`);

        // Actualizar display de ahorros por doyang
        const ahorrosDojangDisplay = document.getElementById('totalAhorros');
        if (ahorrosDojangDisplay) {
            ahorrosDojangDisplay.textContent = `$${totalAhorros.toFixed(2)}`;
        }

        return totalAhorros;
    } catch (error) {
        console.error(` Error al calcular ahorros para dojang todos:`, error);
        return 0;
    }
}

// Modificar evento de cambio de dojang para filtrar ahorros
document.getElementById('dojangFiltro').addEventListener('change', (event) => {
    const dojangSeleccionado = event.target.value;
    console.log(' Cambio de dojang detectado:', dojangSeleccionado);
    calcularTotalAhorrosPorDojang(dojangSeleccionado);
});

// Función para calcular total de ahorros por doyang
async function calcularTotalAhorrosPorDojang(dojangSeleccionado = 'todos') {
    console.log(' Iniciando cálculo de ahorros');
    console.log('Dojang seleccionado:', dojangSeleccionado);

    try {
        const familiaRef = ref(database, 'familias');
        const alumnosRef = ref(database, 'alumnos');

        console.log(' Cargando datos de alumnos...');
        const alumnosSnapshot = await get(alumnosRef);
        const alumnosData = alumnosSnapshot.val() || {};
        console.log('Número de alumnos:', Object.keys(alumnosData).length);

        console.log(' Cargando datos de familias...');
        const familiaSnapshot = await get(familiaRef);
        const familias = familiaSnapshot.val() || {};
        console.log('Número de familias:', Object.keys(familias).length);

        // Calcular ahorros
        let totalAhorros;
        if (dojangSeleccionado === '') {
            // Si es 'todos', sumar todos los ahorros sin filtrar
            totalAhorros = Object.values(familias)
                .reduce((total, familia) => total + (familia.total_ahorros || 0), 0);
            console.log(' Calculando ahorros de TODOS los dojangs');
        } else {
            // Filtrar y calcular ahorros por doyang específico
            const familiasFiltradas = Object.entries(familias)
                .filter(([_, familia]) => {
                    // Verificar si algún miembro de la familia pertenece al dojang seleccionado
                    const coincideDojang = familia.miembros.some(alumnoId => {
                        const alumno = alumnosData[alumnoId];
                        const resultado = alumno &&
                            alumno.dojang &&
                            alumno.dojang.toLowerCase() === dojangSeleccionado.toLowerCase();

                        if (resultado) {
                            console.log(` Familia ${familia.nombre_familia} coincide con dojang ${dojangSeleccionado}`);
                        }

                        return resultado;
                    });

                    return coincideDojang;
                });

            console.log('Familias filtradas:', familiasFiltradas.length);

            totalAhorros = familiasFiltradas
                .reduce((total, [_, familia]) => {
                    console.log(`Ahorro de familia ${familia.nombre_familia}: $${familia.total_ahorros || 0}`);
                    return total + (familia.total_ahorros || 0);
                }, 0);
        }

        console.log(` Total de ahorros para dojang ${dojangSeleccionado}: $${totalAhorros.toFixed(2)}`);

        // Actualizar display de ahorros por doyang
        const ahorrosDojangDisplay = document.getElementById('totalAhorros');
        if (ahorrosDojangDisplay) {
            ahorrosDojangDisplay.textContent = `$${totalAhorros.toFixed(2)}`;
        }

        return totalAhorros;
    } catch (error) {
        console.error(` Error al calcular ahorros para dojang ${dojangSeleccionado}:`, error);
        return 0;
    }
}
