// 🔥 Importiere Firebase-Funktionen
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// 🚀 Firebase-Konfiguration
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

// 🔥 Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth();

// 🌟 EVENT-LISTENER BEIM LADEN DER SEITE
document.addEventListener("DOMContentLoaded", function () {
    let loginBtn = document.getElementById("login-btn");
    let registerBtn = document.getElementById("register-btn");
    let avatarSaveBtn = document.getElementById("avatar-speichern");

    if (loginBtn) loginBtn.onclick = zeigeLoginForm;
    if (registerBtn) registerBtn.onclick = zeigeRegistrierungForm;
    if (avatarSaveBtn) avatarSaveBtn.onclick = avatarSpeichern;
});

// ✅ LOGIN & REGISTRIERUNG
function zeigeLoginForm() {
    document.getElementById("login-form").style.display = "block";
    document.getElementById("register-form").style.display = "none";
}

function zeigeRegistrierungForm() {
    document.getElementById("login-form").style.display = "none";
    document.getElementById("register-form").style.display = "block";
}

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

window.ausloggen = function () {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    }).catch(error => {
        console.error("Fehler beim Logout:", error);
    });
};

// ✅ AVATAR-EINSTELLUNGEN
window.zeigeAvatarEinstellungen = function () {
    document.getElementById("avatar-section").style.display = "block";
};

window.avatarSpeichern = function () {
    let selectedAvatar = document.getElementById("avatar-auswahl").value;
    if (!selectedAvatar) {
        alert("Bitte einen Avatar auswählen!");
        return;
    }

    const user = auth.currentUser;
    if (user) {
        set(ref(db, `benutzer/${user.uid}/avatar`), selectedAvatar)
            .then(() => {
                document.getElementById("avatar-anzeige").src = `avatars/${selectedAvatar}`;
                document.getElementById("avatar-section").style.display = "none";
            })
            .catch(error => {
                alert("Fehler beim Speichern.");
            });
    }
};

// ✅ BENUTZERDATEN LADEN
window.ladeBenutzerdaten = async function () {
    const user = auth.currentUser;
    if (!user) return;

    const snapshot = await get(ref(db, `benutzer/${user.uid}`));
    if (snapshot.exists()) {
        const userData = snapshot.val();
        document.getElementById("benutzer-name").textContent = userData.name || "Unbekannt";
        document.getElementById("benutzer-level").textContent = userData.level || "1";
    }
};

// ✅ ZAUBER WIRKEN
window.wirkeZauber = async function (zielID, zauberID) {
    const user = auth.currentUser;
    if (!user) return;

    const zauberSnapshot = await get(ref(db, `zauber/${zauberID}`));
    if (!zauberSnapshot.exists()) return alert("Zauber existiert nicht!");

    const zielSnapshot = await get(ref(db, `benutzer/${zielID}`));
    if (!zielSnapshot.exists()) return alert("Zielspieler nicht gefunden!");

    const zauber = zauberSnapshot.val();
    const ziel = zielSnapshot.val();

    let updates = {};
    if (zauber.typ === "heilen") {
        let maxHP = 100 + Math.floor((ziel.level - 1) / 10) * 100;
        updates[`benutzer/${zielID}/hp`] = Math.min(maxHP, ziel.hp + zauber.wert);
    } else if (zauber.typ === "schaden") {
        updates[`benutzer/${zielID}/hp`] = Math.max(0, ziel.hp - zauber.wert);
    }

    await update(ref(db), updates);
    await checkeSpielerTod(zielID, user.uid, zauber.name);
};

// ✅ TOD-MECHANIK
async function checkeSpielerTod(zielID, angreiferID, zauberName) {
    const zielSnapshot = await get(ref(db, `benutzer/${zielID}`));
    if (!zielSnapshot.exists()) return;

    const ziel = zielSnapshot.val();
    if (ziel.hp > 0) return;

    let maxHP = 100 + Math.floor((ziel.level - 1) / 10) * 100;
    let updates = {
        [`benutzer/${zielID}/level`]: Math.max(1, ziel.level - 1),
        [`benutzer/${zielID}/hp`]: maxHP,
        [`benutzer/${zielID}/gestorben`]: { datum: new Date().toISOString(), durch: angreiferID, grund: `Getötet durch '${zauberName}'` }
    };

    await update(ref(db), updates);
}

// ✅ HP/MP REGENERATION
async function regeneriereHPundMP() {
    const snapshot = await get(ref(db, "benutzer"));
    if (!snapshot.exists()) return;

    let updates = {};
    Object.keys(snapshot.val()).forEach(uid => {
        const user = snapshot.val()[uid];
        let maxHP = 100 + Math.floor((user.level - 1) / 10) * 100;
        let maxMP = 100 + Math.floor((user.level - 1) / 10) * 50;
        if (user.hp < maxHP) updates[`benutzer/${uid}/hp`] = Math.min(maxHP, user.hp + Math.floor(maxHP * 0.1));
        if (!user.lastMPUpdate) updates[`benutzer/${uid}/mp`] = maxMP;
    });

    await update(ref(db), updates);
}

// ✅ AUTOMATISCHE REGENERATION TÄGLICH UM 00:00
setInterval(async () => {
    const jetzt = new Date();
    if (jetzt.getHours() === 0 && jetzt.getMinutes() === 0) await regeneriereHPundMP();
}, 60000);
