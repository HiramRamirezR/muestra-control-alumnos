const hoja = document.querySelector('.imprimir');
const alumno = document.querySelector('#nombres');
const crearPDF = document.querySelector('#crearPDF');
const fechaElementos = document.querySelectorAll('.fecha-formato');

crearPDF.addEventListener('click', () => {
  fechaElementos.forEach(elemento => {
    const fechaOriginal = elemento.value;
    elemento.type = 'input';
    console.log('Fecha original:', fechaOriginal);
    const fechaFormateada = fechaOriginal.split('-').reverse().join('/');
    elemento.value = fechaFormateada;
    console.log('Fecha formateada:', fechaFormateada);
    // elemento.type = 'date';
  });

  html2pdf()
    .set({
      margin: 0.3,
      filename: `${alumno.value}.pdf`,
      image: {
        type: 'jpeg',
        quality: 1
      },
      html2canvas: {
        scale: 3,
        letterRendering: true,
      },
      jsPDF: {
        unit: "in",
        format: "letter",
        orientation: 'portrait'
      }
    })
    .from(hoja)
    .save()
    console.log("PDF creado");
    setTimeout(() => {
      window.location.href = 'buscar-alumno.html';
    }, 1000);
  });