// 🔥 ALLE Import-Anweisungen oben:
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getDatabase, ref, get, update, remove, set
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);
const auth = getAuth();

// Flags, um wiederholte Redirects und Datenladungen zu verhindern
window.hasRedirected = false;
window.adminDataLoaded = false;

// Nur Admin darf rein!
onAuthStateChanged(auth, (user) => {
  if (!user || user.email.toLowerCase() !== "thomas.schuster-vb@eclipso.at") {
    // Falls nicht Admin => zurück zur index
    if (!window.hasRedirected && !window.location.href.includes("index.html")) {
      window.hasRedirected = true;
      window.location.href = "index.html";
    }
  } else {
    // Admin => Daten laden (nur einmal)
    if (!window.adminDataLoaded) {
      window.adminDataLoaded = true;
      ladeBenutzer();
      ladeFamilien();
    }
  }
});

// =============== BENUTZER LADEN ===============
async function ladeBenutzer() {
  const snapshot = await get(ref(db, "benutzer"));
  if (!snapshot.exists()) return;
  
  const benutzerListe = document.getElementById("benutzer-liste");
  benutzerListe.innerHTML = "";

  const benutzer = snapshot.val();
  Object.keys(benutzer).forEach(uid => {
    const user = benutzer[uid];
    const tr = document.createElement("tr");
    
    // Buttons in die 5. Spalte (Aktionen)
    // => 4. Spalte NUR Level + Speichern
    tr.innerHTML = `
      <td>${user.name || "Unbekannt"}</td>
      <td>${user.email}</td>
      <td>${user.familie || "Keine"}</td>
      <td>
        <input type="number" value="${user.level || 1}" min="1" id="level-${uid}">
        <button class="btn-save" onclick="speichereLevel('${uid}')">Speichern</button>
      </td>
      <td>
        <button class="btn-move" onclick="verschiebeMitglied('${uid}')">Verschieben</button>
        <button class="btn-delete" onclick="loescheMitglied('${uid}')">Löschen</button>
      </td>
    `;
    
    benutzerListe.appendChild(tr);
  });
}

// =============== FAMILIEN LADEN ===============
async function ladeFamilien() {
  const snapshot = await get(ref(db, "familien"));
  if (!snapshot.exists()) return;
  
  const familienListe = document.getElementById("familien-liste");
  familienListe.innerHTML = "";

  const familien = snapshot.val();
  Object.keys(familien).forEach(fid => {
    const fam = familien[fid];
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${fam.name}</td>
      <td>${fam.admin}</td>
      <td>${Object.keys(fam.mitglieder).length}</td>
    `;

    familienListe.appendChild(tr);
  });
}

// =============== LEVEL SPEICHERN ===============
window.speichereLevel = async function(uid) {
  const levelInput = document.getElementById(`level-${uid}`);
  const neuesLevel = parseInt(levelInput.value, 10);
  
  if (isNaN(neuesLevel) || neuesLevel < 1) {
    alert("Ungültiges Level!");
    return;
  }

  await update(ref(db, `benutzer/${uid}`), { level: neuesLevel });
  alert("Level gespeichert!");
};

// =============== MITGLIED LÖSCHEN ===============
window.loescheMitglied = async function(uid) {
  if (!confirm("Soll dieses Mitglied wirklich gelöscht werden?")) return;

  // 1) Hole die Benutzerdaten
  const snap = await get(ref(db, "benutzer/" + uid));
  if (!snap.exists()) {
    alert("Benutzer existiert nicht (oder schon gelöscht).");
    return;
  }
  const userData = snap.val();

  // 2) Entferne den Benutzer aus der Familie (falls vorhanden)
  if (userData.familie) {
    await update(ref(db, `familien/${userData.familie}/mitglieder/${uid}`), null);
  }

  // 3) Benutzer selbst entfernen
  await remove(ref(db, "benutzer/" + uid));

  alert("Mitglied gelöscht!");
  ladeBenutzer();
  ladeFamilien();
};

// =============== MITGLIED VERSCHIEBEN ===============
window.verschiebeMitglied = async function(uid) {
  const snap = await get(ref(db, "benutzer/" + uid));
  if (!snap.exists()) {
    alert("Benutzer existiert nicht (oder schon gelöscht).");
    return;
  }
  const userData = snap.val();

  // Nach neuem Familiennamen fragen
  let newFamName = prompt("Bitte neuen Familiennamen eingeben:");
  if (!newFamName) return; // abgebrochen

  // Hole alle Familien
  const famSnap = await get(ref(db, "familien"));
  if (!famSnap.exists()) {
    // Keine Familie existiert => wir legen neu an
    const newFamID = Date.now().toString();
    await set(ref(db, "familien/" + newFamID), {
      name: newFamName,
      admin: userData.email, // oder kann leer sein
      mitglieder: { [uid]: true }
    });
    // Entferne aus alter Familie
    if (userData.familie) {
      await update(ref(db, "familien/" + userData.familie + "/mitglieder/" + uid), null);
    }
    // Update Benutzer
    await update(ref(db, "benutzer/" + uid), { familie: newFamID });
    alert("Benutzer verschoben in neue Familie: " + newFamName);
    ladeBenutzer();
    ladeFamilien();
    return;
  }

  // Es existieren Familien => schauen, ob newFamName existiert
  let allFams = famSnap.val();
  let foundFamID = null;
  for (let fKey in allFams) {
    if (allFams[fKey].name === newFamName) {
      foundFamID = fKey;
      break;
    }
  }

  if (foundFamID) {
    // => in bestehende Familie verschieben
    // 1) alten Eintrag entfernen
    if (userData.familie) {
      await update(ref(db, "familien/" + userData.familie + "/mitglieder/" + uid), null);
    }
    // 2) in neue Fam
    await update(ref(db, "familien/" + foundFamID + "/mitglieder"), { [uid]: true });
    // 3) user.familie = foundFamID
    await update(ref(db, "benutzer/" + uid), { familie: foundFamID });
    alert("Benutzer verschoben in bestehende Familie: " + newFamName);
  } else {
    // => Neue Familie anlegen
    const newFamID = Date.now().toString();
    await set(ref(db, "familien/" + newFamID), {
      name: newFamName,
      admin: userData.email, // kann man anpassen
      mitglieder: { [uid]: true }
    });
    // Alten Eintrag entfernen
    if (userData.familie) {
      await update(ref(db, "familien/" + userData.familie + "/mitglieder/" + uid), null);
    }
    // user.familie = newFamID
    await update(ref(db, "benutzer/" + uid), { familie: newFamID });
    alert("Benutzer verschoben in neu angelegte Familie: " + newFamName);
  }

  ladeBenutzer();
  ladeFamilien();
};

// =============== AUSLOGGEN ===============
window.ausloggen = async function() {
  await signOut(auth);
  window.location.href = "index.html";
};
