// Utilidades de SweetAlert para mostrar mensajes consistentes

function mostrarAlerta(tipo, titulo, mensaje, opciones = {}) {
    const configuracionBase = {
        icon: tipo,
        title: titulo,
        text: mensaje,
        showConfirmButton: true,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Aceptar',
        timer: tipo === 'success' ? 2000 : undefined,
        timerProgressBar: tipo === 'success',
    };

    // Combinar configuración base con opciones personalizadas
    const configuracionFinal = { ...configuracionBase, ...opciones };

    Swal.fire(configuracionFinal);
}

// Funciones específicas para tipos de alertas
function mostrarExito(titulo, mensaje = '', opciones = {}) {
    mostrarAlerta('success', titulo, mensaje, opciones);
}

function mostrarError(titulo, mensaje = '', opciones = {}) {
    mostrarAlerta('error', titulo, mensaje, opciones);
}

function mostrarAdvertencia(titulo, mensaje = '', opciones = {}) {
    mostrarAlerta('warning', titulo, mensaje, opciones);
}

function mostrarInformacion(titulo, mensaje = '', opciones = {}) {
    mostrarAlerta('info', titulo, mensaje, opciones);
}

// Exportar funciones si se usa como módulo
export {
    mostrarAlerta,
    mostrarExito,
    mostrarError,
    mostrarAdvertencia,
    mostrarInformacion
};
