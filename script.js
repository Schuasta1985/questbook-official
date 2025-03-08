// Importiere Firebase-Funktionen
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, set, get, update, child } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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
let currentFamily = null;
let isAdmin = false;

// Funktion zur Bereinigung von E-Mail-Adressen für Firebase
function sanitizeEmail(email) {
    return email.replace(/\./g, "_").replace(/#/g, "_").replace(/\$/g, "_").replace(/\[/g, "_").replace(/\]/g, "_").replace(/\//g, "_");
}

// Benutzerstatus prüfen
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        ladeFamilie(user.uid);
    } else {
        window.location.href = "index.html"; // Zurück zum Login, falls nicht eingeloggt
    }
});

// 🔐 Benutzer registrieren
window.registrieren = function() {
    const email = document.getElementById("register-email").value;
    const passwort = document.getElementById("register-passwort").value;
    const familieName = document.getElementById("register-familie").value;

    if (!email || !passwort || !familieName) {
        alert("Bitte alle Felder ausfüllen.");
        return;
    }

    createUserWithEmailAndPassword(auth, email, passwort)
        .then((userCredential) => {
            const user = userCredential.user;
            const sanitizedEmail = sanitizeEmail(email);
            const familienId = `familie_${Date.now()}`;

            // Neue Familie erstellen und Benutzer als Admin setzen
            set(ref(db, `familien/${familienId}`), {
                name: familieName,
                admin: sanitizedEmail,
                mitglieder: { [sanitizedEmail]: true }
            });

            // Benutzer zur Familie hinzufügen
            set(ref(db, `benutzer/${user.uid}`), {
                email: sanitizedEmail,
                familie: familienId
            }).then(() => {
                alert("Registrierung erfolgreich! Du bist nun Admin deiner Familie.");
                window.location.href = "dashboard.html"; // Weiterleitung nach erfolgreicher Registrierung
            });
        })
        .catch((error) => {
            console.error("Registrierungsfehler:", error);
            alert(error.message);
        });
};

// 🔑 Benutzer einloggen
window.einloggen = function() {
    const email = document.getElementById("login-email").value;
    const passwort = document.getElementById("login-passwort").value;

    signInWithEmailAndPassword(auth, email, passwort)
        .then((userCredential) => {
            alert("Login erfolgreich!");
            window.location.href = "dashboard.html";
        })
        .catch((error) => {
            console.error("Fehler beim Login:", error);
            alert(error.message);
        });
};

// 🔑 Benutzer ausloggen
window.ausloggen = function() {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    }).catch((error) => {
        console.error("Fehler beim Logout:", error);
    });
};

// 🏡 Familie laden & Benutzerstatus setzen
function ladeFamilie(userId) {
    get(ref(db, `benutzer/${userId}`)).then((snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            currentFamily = userData.familie;

            get(ref(db, `familien/${currentFamily}`)).then((familySnapshot) => {
                if (familySnapshot.exists()) {
                    const familyData = familySnapshot.val();
                    isAdmin = familyData.admin === sanitizeEmail(currentUser.email);

                    // Spiel starten
                    ladeBenutzerDaten();
                }
            });
        }
    });
}

// 📊 XP- & Level-Anzeige aktualisieren
function aktualisiereXPAnzeige(level, xp) {
    const levelElement = document.getElementById("level");
    const xpProgressElement = document.getElementById("xp-progress");

    if (levelElement) levelElement.textContent = `Level: ${level}`;
    if (xpProgressElement) xpProgressElement.style.width = `${(xp / (level * 100)) * 100}%`;
}

// 🏆 Quests verwalten
window.questAbschließen = function(questID, xpWert) {
    xpHinzufügen(xpWert);

    // Quest als erledigt speichern
    update(ref(db, `familien/${currentFamily}/quests/${questID}`), {
        erledigt: true,
        abgeschlossenVon: currentUser.email
    }).then(() => {
        alert("Quest abgeschlossen!");
        ladeQuests();
    });
};

// 📜 Quests laden
function ladeQuests() {
    get(ref(db, `familien/${currentFamily}/quests`)).then((snapshot) => {
        if (snapshot.exists()) {
            const quests = snapshot.val();
            const questListe = document.getElementById("quest-liste");
            questListe.innerHTML = "";

            Object.entries(quests).forEach(([id, quest]) => {
                const li = document.createElement("li");
                li.innerHTML = `
                    ${quest.beschreibung} - ${quest.xp} XP
                    ${quest.erledigt ? `<span style="color:green;">✔️ Erledigt von ${quest.abgeschlossenVon}</span>` : `<button onclick="questAbschließen('${id}', ${quest.xp})">Abschließen</button>`}
                `;
                questListe.appendChild(li);
            });
        }
    });
}

// ➕ Neue Quest erstellen (nur Admin)
window.neueQuestErstellen = function() {
    if (!isAdmin) {
        alert("Nur der Admin kann neue Quests erstellen!");
        return;
    }

    const beschreibung = prompt("Beschreibung der Quest:");
    const xp = parseInt(prompt("Wie viele XP gibt diese Quest?"), 10);

    if (!beschreibung || isNaN(xp)) {
        alert("Ungültige Eingabe!");
        return;
    }

    const neueQuest = {
        beschreibung: beschreibung,
        xp: xp,
        erledigt: false,
        abgeschlossenVon: null
    };

    get(ref(db, `familien/${currentFamily}/quests`)).then((snapshot) => {
        const quests = snapshot.exists() ? snapshot.val() : {};
        quests[`quest_${Date.now()}`] = neueQuest;

        set(ref(db, `familien/${currentFamily}/quests`), quests).then(() => {
            alert("Quest hinzugefügt!");
            ladeQuests();
        });
    });
};

// 🛠 Admin: Quests zurücksetzen
window.questsZurücksetzen = function() {
    if (!isAdmin) {
        alert("Nur der Admin kann Quests zurücksetzen!");
        return;
    }

    set(ref(db, `familien/${currentFamily}/quests`), {}).then(() => {
        alert("Alle Quests wurden zurückgesetzt.");
        ladeQuests();
    });
};

// **Starte das Spiel nach dem Laden**
window.onload = function() {
    ladeQuests();
};
