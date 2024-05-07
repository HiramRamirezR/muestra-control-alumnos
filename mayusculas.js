// Función para convertir a mayúsculas
function convertirAMayusculas(event) {
    // Obtener el valor del campo
    let valor = event.target.value;
    // Convertir a mayúsculas
    valor = valor.toUpperCase();
    // Asignar el valor convertido de vuelta al campo
    event.target.value = valor;
}

// Obtener todos los campos de entrada del formulario
const campos = document.querySelectorAll('input[type="text"]');

// Iterar sobre cada campo y agregar el event listener
campos.forEach(campo => {
    campo.addEventListener('input', convertirAMayusculas);
});
