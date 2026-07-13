/* ============================================================================
   CONFIGURACIÓN DE FIREBASE — Godínez Creativos
   ============================================================================
   1) Ve a la consola de Firebase → tu proyecto → ⚙️ Configuración del proyecto.
   2) En "Tus apps" registra una app WEB (</>) si aún no lo hiciste.
   3) Copia el objeto "firebaseConfig" que te muestra y PÉGALO aquí abajo,
      reemplazando los valores TODO.

   NOTA: este config web NO es secreto. Es seguro subirlo a git y publicarlo;
   la seguridad real la dan las Reglas de Firestore (ver firestore.rules).

   Correo de administrador (el que verá el panel admin.html):
      godinezcreativoss@gmail.com
   Debes crear ese usuario en Firebase → Authentication → Users, y habilitar
   los métodos "Anónimo" y "Correo electrónico/contraseña".
   ============================================================================ */

export const firebaseConfig = {
  apiKey: "AIzaSyBGqJRucZpRZnZhe7QoYWy0fwqsr2oj9fI",
  authDomain: "godinez-3694f.firebaseapp.com",
  projectId: "godinez-3694f",
  storageBucket: "godinez-3694f.firebasestorage.app",
  messagingSenderId: "778943442798",
  appId: "1:778943442798:web:0975817716b59ba6959b7f"
};

// Correo de la cuenta de administrador. Debe coincidir con el de firestore.rules.
export const ADMIN_EMAIL = "godinezcreativoss@gmail.com";
