// Importiere Firebase-Funktionen
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, set, get, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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
    let loginBtn = document.getElementById("login-btn");
    let registerBtn = document.getElementById("register-btn");
    let avatarSaveBtn = document.getElementById("avatar-speichern");

    if (loginBtn) loginBtn.onclick = zeigeLoginForm;
    if (registerBtn) registerBtn.onclick = zeigeRegistrierungForm;
    if (avatarSaveBtn) avatarSaveBtn.onclick = avatarSpeichern;
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
};

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
};

// 🔑 Benutzer ausloggen
window.ausloggen = function () {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    }).catch(error => {
        console.error("Fehler beim Logout:", error);
    });
};

// 🌟 Benutzerstatus überwachen & notwendige Daten laden
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Benutzer erkannt:", user.email);
        await zeigeTodesNachricht();
        await ladeBenutzerdaten();
    } else {
        console.log("Kein Benutzer angemeldet.");
    }
});

// ⚠️ Nachricht bei Tod anzeigen
async function zeigeTodesNachricht() {
    const user = auth.currentUser;
    if (!user) return;

    const snapshot = await get(ref(db, `benutzer/${user.uid}/gestorben`));
    if (snapshot.exists()) {
        const todDaten = snapshot.val();
        alert(`Du bist gestorben! Ursache: ${todDaten.grund}. Angreifer: ${todDaten.durch}`);

        // Lösche die Nachricht nach dem Anzeigen
        await update(ref(db, `benutzer/${user.uid}`), { gestorben: null });
    }
}

// 🔄 Automatische HP- und MP-Regeneration
async function regeneriereHPundMP() {
    const snapshot = await get(ref(db, "benutzer"));
    if (!snapshot.exists()) return;

    const jetzt = new Date();
    const heutigesDatum = `${jetzt.getFullYear()}-${jetzt.getMonth() + 1}-${jetzt.getDate()}`;

    let updates = {};
    Object.keys(snapshot.val()).forEach(uid => {
        const user = snapshot.val()[uid];

        let maxHP = 100 + Math.floor((user.level - 1) / 10) * 100;
        let maxMP = 100 + Math.floor((user.level - 1) / 10) * 50;

        if (user.hp < maxHP) {
            updates[`benutzer/${uid}/hp`] = Math.min(maxHP, user.hp + Math.floor(maxHP * 0.1));
        }

        if (!user.lastMPUpdate || user.lastMPUpdate !== heutigesDatum) {
            updates[`benutzer/${uid}/mp`] = maxMP;
            updates[`benutzer/${uid}/lastMPUpdate`] = heutigesDatum;
        }
    });

    if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
        console.log("HP & MP für alle Spieler regeneriert.");
    }
}

// 🌙 HP & MP-Regeneration täglich um 00:00
setInterval(async () => {
    const jetzt = new Date();
    if (jetzt.getHours() === 0 && jetzt.getMinutes() === 0) {
        await regeneriereHPundMP();
    }
}, 60000);

