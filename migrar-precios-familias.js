import app from './firebaseConfig.js';
import { getDatabase, ref, get, update } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';
import { mostrarExito, mostrarError } from './sweetalert-utils.js';

const database = getDatabase(app);
const familiasRef = ref(database, 'familias');

// Función para determinar el nuevo monto basado en el número de miembros
function calcularNuevoMontoPorMiembros(numMiembros) {
    if (numMiembros === 1) return 600;
    if (numMiembros === 2) return 900;
    return 1200; // 3 o más miembros
}

async function migrarPreciosFamilias() {
    try {
        // Obtener todas las familias
        const snapshot = await get(familiasRef);
        const familias = snapshot.val();

        if (!familias) {
            mostrarError('No se encontraron familias para migrar.');
            return;
        }

        const updates = {};
        let familiasMigradas = 0;

        // Iterar sobre cada familia
        Object.entries(familias).forEach(([familiaId, familia]) => {
            // Contar número de miembros
            const numMiembros = familia.miembros ? Object.keys(familia.miembros).length : 0;

            // Calcular nuevo monto
            const nuevoMonto = calcularNuevoMontoPorMiembros(numMiembros);

            // Preparar actualización
            updates[`/familias/${familiaId}/monto_mensual`] = nuevoMonto;
            updates[`/familias/${familiaId}/plan_pago`] =
                numMiembros === 1 ? '1_persona' :
                numMiembros === 2 ? '2_personas' : '3_o_mas';

            familiasMigradas++;
        });

        // Aplicar actualizaciones
        if (Object.keys(updates).length > 0) {
            await update(ref(database), updates);
            mostrarExito(`Migración completada. ${familiasMigradas} familias actualizadas.`);
        } else {
            mostrarError('No se requirieron actualizaciones.');
        }

    } catch (error) {
        console.error('Error en la migración:', error);
        mostrarError('Ocurrió un error durante la migración de precios.');
    }
}

// Exponer la función globalmente para poder ejecutarla desde la consola
window.migrarPreciosFamilias = migrarPreciosFamilias;

// Opcional: Ejecutar automáticamente si es necesario
// migrarPreciosFamilias();
