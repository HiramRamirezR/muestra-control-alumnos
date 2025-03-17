// Función para determinar precio basado en número de miembros
export function determinarPrecioPorMiembros(miembros) {
    const numMiembros = Array.isArray(miembros) ? miembros.length :
        (miembros ? Object.keys(miembros).length : 0);

    let precio;
    if (numMiembros === 1) precio = 600;
    else if (numMiembros === 2) precio = 900;
    else precio = 1200;

    console.warn(`PRECIO - Miembros: ${numMiembros}, Precio: $${precio}`);

    return precio;
}

// Función para determinar plan de pago basado en número de miembros
export function determinarPlanPorMiembros(miembros) {
    const numMiembros = Array.isArray(miembros) ? miembros.length :
        (miembros ? Object.keys(miembros).length : 0);

    let plan;
    if (numMiembros === 1) plan = '1_persona';
    else if (numMiembros === 2) plan = '2_personas';
    else plan = '3_o_mas';

    console.warn(`PLAN DE PAGO - Miembros: ${numMiembros}, Plan: ${plan}`);

    return plan;
}
