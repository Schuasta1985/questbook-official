// 🔥 ALLE Import-Anweisungen oben:
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getDatabase, ref, get, update, remove
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
const auth= getAuth();

// Nur Admin darf rein!
onAuthStateChanged(auth, (user) => {
  // Hier prüfst du die Admin-E-Mail:
  if (!user || user.email !== "thomas.schuster-vb@eclipso.at") {
    window.location.href = "index.html";
  } else {
    ladeBenutzer();
    ladeFamilien();
  }
});

async function ladeBenutzer() {
  const snapshot = await get(ref(db, "benutzer"));
  if (!snapshot.exists()) return;
  
  const benutzerListe = document.getElementById("benutzer-liste");
  benutzerListe.innerHTML = "";

  const benutzer = snapshot.val();
  Object.keys(benutzer).forEach(uid => {
    const user = benutzer[uid];
    const tr = document.createElement("tr");
    
    // Neu: "Löschen"-Button zusätzlich zum "Speichern"-Button
    tr.innerHTML = `
      <td>${user.name || "Unbekannt"}</td>
      <td>${user.email}</td>
      <td>${user.familie || "Keine"}</td>
      <td>
          <input type="number" value="${user.level || 1}" min="1" id="level-${uid}">
          <button onclick="speichereLevel('${uid}')">Speichern</button>
          <button onclick="loescheMitglied('${uid}')">Löschen</button>
      </td>
    `;
    
    benutzerListe.appendChild(tr);
  });
}

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

// Neu: Mitglied komplett löschen
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
  //    Du kannst remove(...) statt update(..., null) benutzen
  await remove(ref(db, "benutzer/" + uid));

  alert("Mitglied gelöscht!");
  // Liste neu laden
  ladeBenutzer();
};

window.ausloggen = async function() {
  await signOut(auth);
  window.location.href = "index.html";
};
