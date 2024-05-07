document.getElementById('gradoActual').addEventListener('change', actualizarGradoParaSubir);

function actualizarGradoParaSubir() {
    var gradoActual = document.getElementById('gradoActual').value;
    console.log(gradoActual);
    var gradoParaSubir = gradoActual.substring(0, gradoActual.length - 3) - 1 + '° KUP';
    document.getElementById('gradoParaSubir').value = gradoParaSubir;
    if (gradoParaSubir === '0° KUP') {
        document.getElementById('gradoParaSubir').value = '1° DAN';
    }
    if (gradoActual === 'principiante') {
        document.getElementById('gradoParaSubir').value = '10° KUP';
    }
    if (gradoActual === '') {
        document.getElementById('gradoParaSubir').value = '';
    }
}