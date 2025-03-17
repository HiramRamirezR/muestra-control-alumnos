document.getElementById('fechaNacimiento').addEventListener('input', calcularTiempo);
document.getElementById('fechaExamen').addEventListener('input', calcularTiempo);
document.getElementById('fechaIngreso').addEventListener('input', calcularTiempo);

function calcularTiempo() {
    var fechaNacimiento = new Date(document.getElementById('fechaNacimiento').value);
    var hoy = new Date();
    var fechaIngreso = new Date(document.getElementById('fechaIngreso').value);

    var edad = calcularDiferenciaAniosMeses(hoy, fechaNacimiento);
    var tiempoPracticando = calcularDiferenciaAniosMeses(hoy, fechaIngreso);

    document.getElementById('edad').value = edad;
    document.getElementById('tiempoPracticando').value = tiempoPracticando;
}

function calcularDiferenciaAniosMeses(fecha1, fecha2) {
    var diferenciaAnios = fecha1.getFullYear() - fecha2.getFullYear();
    var diferenciaMeses = fecha1.getMonth() - fecha2.getMonth();

    if (fecha1.getDate() < fecha2.getDate()) {
        diferenciaMeses--;
    }

    if (diferenciaMeses < 0) {
        diferenciaMeses += 12;
        diferenciaAnios--;
    }

    if (diferenciaAnios === 1) {
        diferenciaAnios += ' AÑO';
    } else {
        diferenciaAnios += ' AÑOS';
    }

    if (diferenciaMeses === 1) {
        diferenciaMeses += ' MES';
    } else {
        diferenciaMeses += ' MESES';
    }

    return diferenciaAnios + ',  ' + diferenciaMeses + '.';
}