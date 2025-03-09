// 🔥 Importiere Firebase-Funktionen
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, set, get, update, push, onValue } 
  from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { 
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} 
  from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// 🔑 DEINE Firebase-Konfiguration
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

/* ===========================
   1. LOGIN & REGISTRIERUNG
=========================== */

/** Wird ausgeführt, sobald das HTML geladen ist. */
document.addEventListener("DOMContentLoaded", function () {
  let loginBtn = document.getElementById("login-btn");
  let registerBtn = document.getElementById("register-btn");

  if (loginBtn) {
    loginBtn.onclick = () => {
      document.getElementById("login-form").style.display = "block";
      document.getElementById("register-form").style.display = "none";
    };
  }

  if (registerBtn) {
    registerBtn.onclick = () => {
      document.getElementById("login-form").style.display = "none";
      document.getElementById("register-form").style.display = "block";
    };
  }
});

/** Benutzer per E-Mail/Passwort einloggen */
window.benutzerEinloggen = function () {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      // Bei Erfolg: wechsle zum Dashboard
      window.location.href = "dashboard.html";
    })
    .catch(error => alert(error.message));
};

/** Google-Login */
window.googleLogin = function () {
  const provider = new GoogleAuthProvider();
  signInWithPopup(auth, provider)
    .then(() => {
      // Erfolgreicher Login → Dashboard
      window.location.href = "dashboard.html";
    })
    .catch(error => {
      alert(error.message);
    });
};

/** Familie erstellen ODER normale Registrierung, je nach Eingabe */
window.familieErstellen = function () {
  const familienName = document.getElementById("family-name").value;
  const adminEmail = document.getElementById("admin-email").value;
  const adminPassword = document.getElementById("admin-password").value;

  if (!adminEmail || !adminPassword) {
    alert("E-Mail und Passwort dürfen nicht leer sein!");
    return;
  }

  createUserWithEmailAndPassword(auth, adminEmail, adminPassword)
    .then(userCredential => {
      const adminUID = userCredential.user.uid;

      // Wenn KEIN Familienname eingegeben wurde → Nur User anlegen, kein isAdmin.
      if (!familienName) {
        return set(ref(db, `benutzer/${adminUID}`), {
          email: adminEmail,
          familie: null,
          isAdmin: false,
          name: adminEmail.split("@")[0],
          level: 1,
          xp: 0,
          hp: 100,
          mp: 100
        });
      } else {
        // Nutzer WILL eine Familie gründen → isAdmin = true
        const familienID = Date.now().toString();
        const familienDaten = {
          name: familienName,
          admin: adminEmail,
          mitglieder: { [adminUID]: true }
        };
        // 1) Familie-Eintrag
        return set(ref(db, `familien/${familienID}`), familienDaten)
          .then(() => {
            // 2) Benutzer-Eintrag
            return set(ref(db, `benutzer/${adminUID}`), {
              email: adminEmail,
              familie: familienID,
              isAdmin: true,
              name: adminEmail.split("@")[0],
              level: 1,
              xp: 0,
              hp: 100,
              mp: 100
            });
          });
      }
    })
    .then(() => {
      alert("Registrierung erfolgreich!");
      window.location.href = "dashboard.html";
    })
    .catch(error => {
      alert(error.message);
    });
};

/** Ausloggen */
window.ausloggen = function () {
  signOut(auth)
    .then(() => {
      window.location.href = "index.html";
    })
    .catch(error => {
      console.error("Fehler beim Logout:", error);
    });
};

/* ===========================
   2. TÄGLICHE REGENERATION
   => Nur einmal pro Tag
=========================== */
async function checkeTäglicheRegeneration(userUID) {
  // "YYYY-MM-DD"
  const heute = new Date().toISOString().split('T')[0];

  // Benutzerdaten holen
  const benutzerRef = ref(db, `benutzer/${userUID}`);
  const snapshot = await get(benutzerRef);
  if (!snapshot.exists()) return;

  const userData = snapshot.val();

  // Schon heute regeneriert?
  if (userData.lastDailyRegen === heute) {
    console.log("Heute bereits aufgeladen:", userUID);
    return;
  }

  // Regenerations-Logik
  let level = userData.level || 1;
  let currentHP = userData.hp ?? 100;
  let currentMP = userData.mp ?? 100;

  let maxHP = 100 + Math.floor((level - 1) / 10) * 100;
  let maxMP = 100 + Math.floor((level - 1) / 10) * 50;

  // Beispiel: +10% vom Maximum
  let neueHP = Math.min(maxHP, currentHP + Math.floor(maxHP * 0.1));
  let neueMP = Math.min(maxMP, currentMP + Math.floor(maxMP * 0.1));

  await update(benutzerRef, {
    hp: neueHP,
    mp: neueMP,
    lastDailyRegen: heute
  });

  console.log("Tägliche Regeneration durchgeführt für:", userUID);
}

/* ===========================
   3. DASHBOARD-FUNKTIONEN
=========================== */

/** Lädt Benutzerdaten aus DB und füllt Profil/Avatar usw. */
async function ladeBenutzerdaten() {
  const user = auth.currentUser;
  if (!user) return;

  const snapshot = await get(ref(db, `benutzer/${user.uid}`));
  if (!snapshot.exists()) return;

  const userData = snapshot.val();

  // Profilfelder
  const nameElem = document.getElementById("benutzer-name");
  const levelElem = document.getElementById("benutzer-level");
  const xpElem = document.getElementById("benutzer-xp");

  if (nameElem)  nameElem.textContent  = userData.name  || "Unbekannt";
  if (levelElem) levelElem.textContent = userData.level || "1";
  if (xpElem)    xpElem.textContent    = userData.xp    || "0";

  // Admin-Check
  if (userData.isAdmin) {
    const adminSection = document.getElementById("admin-section");
    if (adminSection) adminSection.style.display = "block";
  }

  // Avatar
  const avatarElem = document.getElementById("avatar-anzeige");
  if (avatarElem && userData.avatarURL) {
    avatarElem.src = userData.avatarURL;
  }

  // TÄGLICHE REGENERATION nur 1x pro Tag
  await checkeTäglicheRegeneration(user.uid);

  // Danach: Ziel-/Zauberlisten laden + Logs
  ladeSpielerliste();
  ladeZauberliste();
  ladePublicLogs();
}

/** Alle Spieler aus DB laden und in <select id="zauber-ziel"> einfügen */
async function ladeSpielerliste() {
  const selectZiel = document.getElementById("zauber-ziel");
  if (!selectZiel) return;

  const snapshot = await get(ref(db, "benutzer"));
  if (!snapshot.exists()) return;

  selectZiel.innerHTML = "";
  const userList = snapshot.val();
  for (let uid in userList) {
    const option = document.createElement("option");
    option.value = uid;
    option.textContent = userList[uid].name || userList[uid].email;
    selectZiel.appendChild(option);
  }
}

/** Beispiel: Zauber-Liste */
async function ladeZauberliste() {
  const selectZauber = document.getElementById("zauber-auswahl");
  if (!selectZauber) return;

  // Du könntest das auch dynamisch aus DB ("zauber/") laden
  const zauberArten = [
    { id: "z1", name: "Heilzauber",  typ: "heilen", wert: 20 },
    { id: "z2", name: "Feuerball",   typ: "schaden", wert: 30 }
  ];

  selectZauber.innerHTML = "";
  zauberArten.forEach(z => {
    const opt = document.createElement("option");
    opt.value = z.id;
    opt.textContent = z.name;
    selectZauber.appendChild(opt);
  });
}

/** Button-Click: Zauber wirken */
window.zauberWirkenHandler = async function() {
  const zielID = document.getElementById("zauber-ziel").value;
  const zauberID = document.getElementById("zauber-auswahl").value;

  // Mock: Hardcodierte Zauberdaten
  let zauberObj = {};
  if (zauberID === "z1") {
    zauberObj = { typ: "heilen", wert: 20, name: "Heilzauber" };
  } else if (zauberID === "z2") {
    zauberObj = { typ: "schaden", wert: 30, name: "Feuerball" };
  }

  await wirkeZauber(zielID, zauberObj);
};

/** Die Kernfunktion zum Anwenden eines Zaubers */
async function wirkeZauber(zielID, zauber) {
  const user = auth.currentUser;
  if (!user) return;

  const zielSnapshot = await get(ref(db, `benutzer/${zielID}`));
  if (!zielSnapshot.exists()) {
    alert("Zielspieler nicht gefunden!");
    return;
  }

  const zielData = zielSnapshot.val();
  let updates = {};

  if (zauber.typ === "heilen") {
    let maxHP = 100 + Math.floor((zielData.level - 1) / 10) * 100;
    let neueHP = Math.min(maxHP, (zielData.hp || 100) + zauber.wert);
    updates[`benutzer/${zielID}/hp`] = neueHP;

  } else if (zauber.typ === "schaden") {
    let neueHP = Math.max(0, (zielData.hp || 100) - zauber.wert);
    updates[`benutzer/${zielID}/hp`] = neueHP;

    // Prüfen, ob Spieler tot
    if (neueHP <= 0) {
      const neuesLevel = Math.max(1, (zielData.level || 1) - 1);
      let maxHP = 100 + Math.floor((neuesLevel - 1) / 10) * 100;
      updates[`benutzer/${zielID}/level`] = neuesLevel;
      updates[`benutzer/${zielID}/hp`] = maxHP; // Respawn
      updates[`benutzer/${zielID}/gestorben`] = {
        datum: new Date().toISOString(),
        durch: user.uid,
        zauber: zauber.name
      };
    }
  }

  // Write
  await update(ref(db), updates);

  // Log in publicLogs
  await push(ref(db, "publicLogs"), {
    timestamp: Date.now(),
    caster: user.uid,
    target: zielID,
    zauber: zauber.name,
    typ: zauber.typ,
    wert: zauber.wert
  });

  alert(`Zauber "${zauber.name}" erfolgreich gewirkt!`);
}

/* ===========================
   4. LOGS (Public + Admin)
=========================== */

/** Lädt die öffentlichen Logs in #public-logs-list */
async function ladePublicLogs() {
  const publicLogsList = document.getElementById("public-logs-list");
  if (!publicLogsList) return;

  onValue(ref(db, "publicLogs"), (snapshot) => {
    publicLogsList.innerHTML = "";
    if (!snapshot.exists()) return;

    const logs = snapshot.val();
    const sortedKeys = Object.keys(logs).sort((a, b) => logs[b].timestamp - logs[a].timestamp);

    sortedKeys.forEach(key => {
      const item = logs[key];
      const li = document.createElement("li");
      let date = new Date(item.timestamp).toLocaleString();
      li.textContent = `[${date}] ${item.caster} wirkte '${item.zauber}' auf ${item.target} (typ: ${item.typ}, wert: ${item.wert})`;
      publicLogsList.appendChild(li);
    });
  });
}

/** ADMIN: Logs anzeigen & löschen */
window.adminZeigeLogs = async function() {
  const adminLogsContainer = document.getElementById("admin-logs-container");
  const adminLogsList = document.getElementById("admin-logs-list");
  if (!adminLogsContainer || !adminLogsList) return;

  // Toggle
  adminLogsContainer.style.display = (adminLogsContainer.style.display === "none") ? "block" : "none";

  if (adminLogsContainer.style.display === "block") {
    // Einmalig Logs laden
    const snapshot = await get(ref(db, "publicLogs"));
    adminLogsList.innerHTML = "";
    if (!snapshot.exists()) return;

    const logs = snapshot.val();
    Object.keys(logs).forEach(key => {
      const li = document.createElement("li");
      const date = new Date(logs[key].timestamp).toLocaleString();
      li.textContent = `[${date}] ${logs[key].caster} -> ${logs[key].target}: ${logs[key].zauber}`;

      // Löschen-Button
      const btn = document.createElement("button");
      btn.textContent = "Löschen";
      btn.style.marginLeft = "10px";
      btn.onclick = () => {
        if (confirm("Diesen Log-Eintrag wirklich löschen?")) {
          update(ref(db, `publicLogs/${key}`), null);
        }
      };
      li.appendChild(btn);

      adminLogsList.appendChild(li);
    });
  }
};

window.adminNeuenBenutzerAnlegen = function() {
  alert("Hier könntest du einen kleinen Dialog implementieren, um neue Benutzer einzuladen, etc.");
};

/* ===========================
   5. AVATAR-EINSTELLUNGEN
=========================== */

/** Öffnet Avatar-Auswahl */
window.zeigeAvatarEinstellungen = function () {
  document.getElementById("avatar-section").style.display = "block";
  const avatarAuswahl = document.getElementById("avatar-auswahl");
  if (!avatarAuswahl) return;

  avatarAuswahl.innerHTML = "";
  // Zehn verschiedene Avatare
  const verfügbareAvatare = [
    "avatars/avatar1.png",
    "avatars/avatar2.png",
    "avatars/avatar3.png",
    "avatars/avatar4.png",
    "avatars/avatar5.png",
    "avatars/avatar6.png",
    "avatars/avatar7.png",
    "avatars/avatar8.png",
    "avatars/avatar9.png",
    "avatars/avatar10.png"
  ];

  verfügbareAvatare.forEach(url => {
    const opt = document.createElement("option");
    opt.value = url;
    opt.textContent = url.split("/").pop();
    avatarAuswahl.appendChild(opt);
  });
};

/** Speichert den gewählten Avatar in der DB */
window.avatarSpeichern = async function () {
  const user = auth.currentUser;
  if (!user) return;

  const avatarAuswahl = document.getElementById("avatar-auswahl");
  if (!avatarAuswahl) return;

  const selectedURL = avatarAuswahl.value;
  await update(ref(db, `benutzer/${user.uid}`), {
    avatarURL: selectedURL
  });

  // UI aktualisieren
  const avatarAnzeige = document.getElementById("avatar-anzeige");
  if (avatarAnzeige) {
    avatarAnzeige.src = selectedURL;
  }

  document.getElementById("avatar-section").style.display = "none";
};

/* ===========================
   6. ON AUTH STATE CHANGED
=========================== */

/** Wird auf jeder Seite aufgerufen, sobald sich Auth-Zustand ändert */
onAuthStateChanged(auth, (user) => {
  // Auf dashboard.html -> lade Benutzerdaten
  if (user && window.location.href.includes("dashboard.html")) {
    ladeBenutzerdaten();
  }
  // Kein User und wir sind auf dashboard.html -> redirect
  else if (!user && window.location.href.includes("dashboard.html")) {
    window.location.href = "index.html";
  }
});
