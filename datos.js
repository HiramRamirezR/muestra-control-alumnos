const fs = require('fs');
const faker = require('faker');

const alumnos = {};

for (let i = 1; i <= 20; i++) {
  const alumno = {
    apellidoMaterno: faker.name.lastName(),
    apellidoPaterno: faker.name.firstName(),
    direccion: faker.address.streetAddress(),
    nombre: faker.name.findName(),
    nombreProfesor: faker.name.findName(),
    numeroCertificado: i,
    radioAdulto: faker.datatype.boolean(),
    radioNino: faker.datatype.boolean(),
    telefono: faker.phone.phoneNumber()
  };
  const idAlumno = `${i.toString().padStart(3, '0')}`;
  alumnos[idAlumno] = alumno;
}

// Crear el JSON con la estructura deseada
const jsonData = { alumnos };

// Escribir el JSON en un archivo
fs.writeFileSync('alumnos.json', JSON.stringify(jsonData, null, 2));