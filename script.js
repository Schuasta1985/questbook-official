// Importiere Firebase-Funktionen
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Firebase-Konfiguration
const firebaseConfig = {
    apiKey: "AIzaSyAtUbDDMpZodZ-rcp6GJfHbVWVZD2lXFgI",
    authDomain: "questbook-138c8.firebaseapp.com",
    databaseURL: "https://questbook-138c8-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "questbook-138c8",
    storageBucket: "questbook-138c8.firebasestorage.app",
    messagingSenderId: "625259298286",
    appId: "1:625259298286:web:bf60483c258cd311bea2ff",
    measurementId: "G-H6F2TB6PY7"
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

// Globale Variablen
let currentUser = null;

// Benutzerstatus prüfen
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        ladeBenutzerdaten();
    } else {
        window.location.href = "index.html"; // Zurück zum Login, falls nicht eingeloggt
    }
});

// 🔑 Benutzer ausloggen (Logout-Button fixen)
window.ausloggen = function () {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    }).catch(error => {
        console.error("Fehler beim Logout:", error);
    });
};

// 🏡 Benutzerdaten & Avatar laden
function ladeBenutzerdaten() {
    get(ref(db, `benutzer/${currentUser.uid}`)).then(snapshot => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            document.getElementById("benutzer-name").textContent = userData.name || "Unbekannt";
            document.getElementById("benutzer-level").textContent = userData.level || "1";
            document.getElementById("benutzer-xp").textContent = userData.xp || "0";
            ladeAvatar();
        }
    });
}

// 📷 Avatar laden und anzeigen
function ladeAvatar() {
    get(ref(db, `benutzer/${currentUser.uid}/avatar`)).then(snapshot => {
        if (snapshot.exists()) {
            let avatarName = snapshot.val();
            let avatarPfad = `https://schuasta1985.github.io/questbook-official/avatars/${avatarName}.png`;
            document.getElementById("avatar-anzeige").src = avatarPfad;
            document.getElementById("einstellungen-icon").style.display = "block"; // ⚙️-Icon anzeigen
            document.getElementById("avatar-section").style.display = "none"; // Avatar-Auswahl verstecken
        } else {
            ladeAvatarDropdown();
        }
    }).catch(error => {
        console.error("Fehler beim Laden des Avatars:", error);
    });
}


// 🎭 Avatar-Dropdown befüllen
function ladeAvatarDropdown() {
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

    // Falls ein Avatar bereits gespeichert ist, Dropdown vorauswählen
    get(ref(db, `benutzer/${currentUser.uid}/avatar`)).then(snapshot => {
        if (snapshot.exists()) {
            avatarSelect.value = snapshot.val();
        }
    });

    // Live-Vorschau des Avatars bei Auswahl
    avatarSelect.addEventListener("change", function () {
        let selectedAvatar = avatarSelect.value;
        if (selectedAvatar) {
            document.getElementById("avatar-anzeige").src = `https://schuasta1985.github.io/questbook-official/avatars/${selectedAvatar}`;
        }
    });
}

// 💾 Avatar speichern (Fix: Avatar wird sofort aktualisiert + Auswahl verschwindet)
window.avatarSpeichern = function () {
    let selectedAvatar = document.getElementById("avatar-auswahl").value;
    if (!selectedAvatar) return;

    update(ref(db, `benutzer/${currentUser.uid}`), {
        avatar: selectedAvatar
    }).then(() => {
        let avatarPfad = `https://schuasta1985.github.io/questbook-official/avatars/${selectedAvatar}`;
        document.getElementById("avatar-anzeige").src = avatarPfad;
        document.getElementById("avatar-section").style.display = "none"; // Auswahl ausblenden
        document.getElementById("einstellungen-icon").style.display = "block"; // ⚙️-Icon anzeigen
    }).catch(error => {
        console.error("Fehler beim Speichern des Avatars:", error);
    });
};


// ⚙️ Avatar ändern (zeigt Avatar-Auswahl)
window.zeigeAvatarEinstellungen = function () {
    document.getElementById("avatar-section").style.display = "block";
};

// **Seite laden & Daten abrufen**
window.onload = function () {
    if (currentUser) ladeBenutzerdaten();

    // Logout-Button fixen
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.style.position = "fixed";
        logoutBtn.style.bottom = "10px";
        logoutBtn.style.right = "10px";
        logoutBtn.style.padding = "5px 10px";
        logoutBtn.style.fontSize = "12px";
        logoutBtn.style.background = "#444";
        logoutBtn.style.color = "white";
        logoutBtn.style.border = "none";
        logoutBtn.style.cursor = "pointer";
        logoutBtn.style.borderRadius = "5px";
        logoutBtn.addEventListener("click", ausloggen);
    }
};

