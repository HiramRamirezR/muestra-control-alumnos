import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

const firebaseConfig = {
    apiKey: "AIzaSyDV-1Q4ETGOnRYjUHKlD3CmYLC5p0vLoY8",
    authDomain: "control-alumnos-76bc2.firebaseapp.com",
    databaseURL: 'https://control-alumnos-76bc2-default-rtdb.firebaseio.com/',
    projectId: "control-alumnos-76bc2",
  };

const app = initializeApp(firebaseConfig);

export default app;
