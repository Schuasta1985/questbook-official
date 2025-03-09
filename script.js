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
        ladeAvatare();  // 🚀 Avatar wird erst geladen, wenn `currentUser` existiert
    } else {
        window.location.href = "index.html"; // Zurück zum Login, falls nicht eingeloggt
    }
});

// 🔑 Benutzer einloggen
window.einloggen = function() {
    const email = document.getElementById("login-email").value;
    const passwort = document.getElementById("login-passwort").value;

    signInWithEmailAndPassword(auth, email, passwort)
        .then(() => {
            window.location.href = "dashboard.html"; // Kein Alert mehr
        })
        .catch(error => {
            console.error("Fehler beim Login:", error);
            alert(error.message);
        });
};

// 🔑 Benutzer ausloggen
window.ausloggen = function() {
    signOut(auth).then(() => {
        window.location.href = "index.html";
    }).catch(error => {
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
                }
            });
        }
    });
}

// 📷 Avatare automatisch erkennen & Dropdown befüllen
function ladeAvatare() {
    const avatarSelect = document.getElementById("avatar-select");
    if (!avatarSelect) return;  // 🔴 Verhindert Fehler, falls Element nicht existiert

    avatarSelect.innerHTML = ""; // Dropdown leeren

    // Standardoption hinzufügen
    let defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "-- Avatar wählen --";
    avatarSelect.appendChild(defaultOption);

    // Manuelle Liste (da GitHub Pages kein Verzeichnis auslesen kann)
    let avatarList = [
        "avatar1.webp",
        "avatar2.webp",
        "avatar3.webp",
        "avatar4.webp",
        "avatar5.webp",
        "avatar6.webp"
    ];

    avatarList.forEach(filename => {
        let option = document.createElement("option");
        option.value = filename;
        option.textContent = filename.replace(".webp", ""); // Name ohne ".webp"
        avatarSelect.appendChild(option);
    });

    // Falls der Benutzer bereits einen Avatar hat, anzeigen
    get(ref(db, `benutzer/${currentUser.uid}/avatar`)).then(snapshot => {
        if (snapshot.exists()) {
            let avatarName = snapshot.val();
            document.getElementById("avatar-anzeige").src = `avatars/${avatarName}`;
            avatarSelect.value = avatarName;  // 🚀 Avatar auch im Dropdown vorausgewählt
        }
    });

    // Live-Vorschau bei Auswahl ändern
    avatarSelect.addEventListener("change", function () {
        let selectedAvatar = avatarSelect.value;
        if (selectedAvatar) {
            document.getElementById("avatar-anzeige").src = `avatars/${selectedAvatar}`;
        }
    });
}

// 🖼 Avatar speichern
window.avatarSpeichern = function () {
    let selectedAvatar = document.getElementById("avatar-select").value;
    if (!selectedAvatar) return; // Kein Alert mehr, falls keiner gewählt

    // Avatar in Firebase speichern
    update(ref(db, `benutzer/${currentUser.uid}`), {
        avatar: selectedAvatar
    }).then(() => {
        document.getElementById("avatar-anzeige").src = `avatars/${selectedAvatar}`;
    }).catch(error => {
        console.error("Fehler beim Speichern des Avatars:", error);
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
};

// **Starte das Spiel nach dem Laden**
window.onload = function () {
    ladeQuests();
    if (currentUser) ladeAvatare(); // 🚀 Avatar nur laden, wenn User existiert
};
