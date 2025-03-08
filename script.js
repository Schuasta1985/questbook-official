// Importiere Firebase-Funktionen
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, set, get, update, child } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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

// Benutzerstatus prüfen
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        ladeFamilie(user.uid);
    } else {
        window.location.href = "index.html"; // Zurück zum Login, falls nicht eingeloggt
    }
});

// 🏡 Familie laden & Benutzerstatus setzen
function ladeFamilie(userId) {
    get(ref(db, `benutzer/${userId}`)).then((snapshot) => {
        if (snapshot.exists()) {
            const userData = snapshot.val();
            currentFamily = userData.familie;

            get(ref(db, `familien/${currentFamily}`)).then((familySnapshot) => {
                if (familySnapshot.exists()) {
                    const familyData = familySnapshot.val();
                    isAdmin = familyData.admin === currentUser.email;

                    // Spiel starten
                    ladeBenutzerDaten();
                }
            });
        }
    });
}

// 🔑 Benutzer ausloggen
window.ausloggen = function() {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    }).catch((error) => {
        console.error("Fehler beim Logout:", error);
    });
};

// 🌟 Benutzerdaten laden & anzeigen
function ladeBenutzerDaten() {
    get(ref(db, `benutzer/${currentUser.uid}/fortschritte`)).then((snapshot) => {
        if (snapshot.exists()) {
            const daten = snapshot.val();
            aktualisiereXPAnzeige(daten.level, daten.xp);
        } else {
            initialisiereBenutzerdaten();
        }
    });
}

// 🆕 Benutzer initialisieren (falls neu)
function initialisiereBenutzerdaten() {
    set(ref(db, `benutzer/${currentUser.uid}/fortschritte`), {
        level: 1,
        xp: 0,
        hp: 100,
        maxHP: 100,
        mp: 50,
        maxMP: 50
    }).then(() => {
        ladeBenutzerDaten();
    });
}

// 📊 XP- & Level-Anzeige aktualisieren
function aktualisiereXPAnzeige(level, xp) {
    const levelElement = document.getElementById("level");
    const xpProgressElement = document.getElementById("xp-progress");

    if (levelElement) levelElement.textContent = `Level: ${level}`;
    if (xpProgressElement) xpProgressElement.style.width = `${(xp / (level * 100)) * 100}%`;
}

// 🎮 XP hinzufügen & Levelaufstieg prüfen
window.xpHinzufügen = function(xpWert) {
    get(ref(db, `benutzer/${currentUser.uid}/fortschritte`)).then((snapshot) => {
        if (snapshot.exists()) {
            let daten = snapshot.val();
            daten.xp += xpWert;

            // Levelaufstieg prüfen
            while (daten.xp >= daten.level * 100) {
                daten.xp -= daten.level * 100;
                daten.level += 1;
            }

            update(ref(db, `benutzer/${currentUser.uid}/fortschritte`), daten).then(() => {
                aktualisiereXPAnzeige(daten.level, daten.xp);
            });
        }
    });
};

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
