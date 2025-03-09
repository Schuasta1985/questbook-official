// Importiere Firebase-Funktionen
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Firebase-Konfiguration
const firebaseConfig = {
    apiKey: "AIzaSyAtUbDDMpZodZ-rcp6GJfHbVWVZD2lXFgI",
    authDomain: "questbook-138c8.firebaseapp.com",
    databaseURL: "https://questbook-138c8-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "questbook-138c8",
    storageBucket: "questbook-138c8.appspot.com",
    messagingSenderId: "625259298286",
    appId: "1:625259298286:web:bf60483c258cd311bea2ff",
    measurementId: "G-H6F2TB6PY7"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

// 🌟 Event-Listener für Buttons nach Laden der Seite zuweisen
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("login-btn").onclick = zeigeLoginForm;
    document.getElementById("register-btn").onclick = zeigeRegistrierungForm;
});

// 🌟 Login & Registrierung anzeigen
function zeigeLoginForm() {
    document.getElementById("login-form").style.display = "block";
    document.getElementById("register-form").style.display = "none";
}

function zeigeRegistrierungForm() {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "block";
}

// 🔥 Familie gründen
window.familieErstellen = function () {
    const familienName = document.getElementById("family-name").value;
    const adminEmail = document.getElementById("admin-email").value;
    const adminPassword = document.getElementById("admin-password").value;

    if (!familienName || !adminEmail || !adminPassword) {
        alert("Bitte alle Felder ausfüllen!");
        return;
    }

    createUserWithEmailAndPassword(auth, adminEmail, adminPassword)
        .then(userCredential => {
            const adminUID = userCredential.user.uid;
            const familienID = Date.now().toString();

            const familienDaten = {
                name: familienName,
                admin: adminEmail,
                mitglieder: { [adminEmail]: true }
            };

            return set(ref(db, `familien/${familienID}`), familienDaten).then(() => {
                return set(ref(db, `benutzer/${adminUID}`), {
                    email: adminEmail,
                    familie: familienID
                });
            });
        })
        .then(() => {
            alert("Familie erfolgreich erstellt!");
            window.location.href = "dashboard.html";
        })
        .catch(error => {
            alert(error.message);
        });
}

// 🔑 Benutzer einloggen
window.benutzerEinloggen = function () {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        alert("Bitte E-Mail und Passwort eingeben!");
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then(() => {
            alert("Erfolgreich eingeloggt!");
            window.location.href = "dashboard.html";
        })
        .catch(error => {
            alert(error.message);
        });
}

// 🔑 Benutzer ausloggen
window.ausloggen = function () {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    }).catch(error => {
        console.error("Fehler beim Logout:", error);
    });
};

// ⚙️ Avatar ändern (öffnet Avatar-Auswahl)
window.zeigeAvatarEinstellungen = function () {
    let avatarElement = document.getElementById("avatar-anzeige");
    if (!avatarElement || !avatarElement.src) {
        alert("Kein Avatar gefunden!");
        return;
    }
    document.getElementById("avatar-section").style.display = "block";
};

// 🎭 Avatar-Dropdown befüllen & live aktualisieren
window.ladeAvatarDropdown = function () {
    const avatarSelect = document.getElementById("avatar-auswahl");
    if (!avatarSelect) return;

    avatarSelect.innerHTML = ""; // Dropdown leeren

    let avatarList = [
        "avatar1.png", "avatar2.png", "avatar3.png", "avatar4.png",
        "avatar5.png", "avatar6.png", "avatar7.png", "avatar8.png",
        "avatar9.png", "avatar10.png"
    ];

    avatarList.forEach(filename => {
        let option = document.createElement("option");
        option.value = filename;
        option.textContent = filename.replace(".png", ""); // Name ohne ".png"
        avatarSelect.appendChild(option);
    });

    // Setze den aktuellen Avatar als vorausgewählt
    get(ref(db, `benutzer/${auth.currentUser.uid}/avatar`)).then(snapshot => {
        if (snapshot.exists()) {
            avatarSelect.value = snapshot.val();
        }
    }).catch(error => {
        console.error("Fehler beim Laden des Avatars:", error);
    });

    // Avatar-Vorschau bei Auswahl ändern
    avatarSelect.addEventListener("change", function () {
        let selectedAvatar = avatarSelect.value;
        if (selectedAvatar) {
            document.getElementById("avatar-anzeige").src = `avatars/${selectedAvatar}`;
        }
    });
};

// 💾 Avatar speichern (schließt das Fenster nach dem Speichern)
window.avatarSpeichern = function () {
    let selectedAvatar = document.getElementById("avatar-auswahl").value;
    if (!selectedAvatar) return;

    set(ref(db, `benutzer/${auth.currentUser.uid}/avatar`), selectedAvatar)
        .then(() => {
            document.getElementById("avatar-anzeige").src = `avatars/${selectedAvatar}`;
            document.getElementById("avatar-section").style.display = "none"; // 🔥 Avatar-Auswahl ausblenden
        })
        .catch(error => console.error("Fehler beim Speichern des Avatars:", error));
};

// 🌟 **Lade Benutzerdaten + Avatar-Liste beim Start**
window.onload = function () {
    if (auth.currentUser) {
        ladeBenutzerdaten();
        ladeAvatarDropdown(); // 🔥 Avatar-Auswahl laden
    }
};
