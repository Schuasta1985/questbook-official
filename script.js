// 🔥 ALLE Import-Anweisungen oben:
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getDatabase, ref, set, get, update, push, onValue,
  query, orderByChild, equalTo
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// 🔑 Deine Firebase-Daten (Questbook-138c8)
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

/* =============== LOGIN & REGISTRIERUNG =============== */
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn    = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  if (loginBtn) {
    loginBtn.onclick = () => {
      if (document.getElementById("login-form")) {
        document.getElementById("login-form").style.display = "block";
      }
      if (document.getElementById("register-form")) {
        document.getElementById("register-form").style.display = "none";
      }
    };
  }
  if (registerBtn) {
    registerBtn.onclick = () => {
      if (document.getElementById("login-form")) {
        document.getElementById("login-form").style.display = "none";
      }
      if (document.getElementById("register-form")) {
        document.getElementById("register-form").style.display = "block";
      }
    };
  }
});

window.benutzerEinloggen = async function() {
  const email = document.getElementById("login-email")?.value;
  const pw    = document.getElementById("login-password")?.value;
  try {
    await signInWithEmailAndPassword(auth, email, pw);
    window.location.href = "dashboard.html";
  } catch(e) {
    alert(e.message);
  }
};

window.googleLogin = async function() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
    window.location.href = "dashboard.html";
  } catch(e) {
    alert(e.message);
  }
};

/** Familie erstellen / Registrieren */
window.familieErstellen = async function() {
  const famName    = document.getElementById("family-name").value.trim();
  const adminEmail = document.getElementById("admin-email").value.trim();
  const adminPass  = document.getElementById("admin-password").value.trim();

  if (!adminEmail || !adminPass) {
    alert("E-Mail und Passwort erforderlich!");
    return;
  }

  try {
    // 1) User anlegen
    const userCred = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
    const uid      = userCred.user.uid;

    // 2) Falls kein famName: Einfach ohne Familie
    if (!famName) {
      await set(ref(db, `benutzer/${uid}`), {
        email: adminEmail,
        familie: null,
        isAdmin: false,
        name: adminEmail.split("@")[0],
        level: 1,
        xp: 0,
        hp: 100,
        mp: 100
      });
      alert("Registrierung erfolgreich (ohne Familie)!");
      window.location.href = "dashboard.html";
      return;
    }

    // 3) Prüfen, ob es diese Familie (famName) schon gibt
    const familiesRef = ref(db, "familien");
    const qRef = query(familiesRef, orderByChild("name"), equalTo(famName));
    const snap = await get(qRef);

    if (snap.exists()) {
      // Familie existiert => Neuer User wird Mitglied
      const familiesData = snap.val();
      const famKey = Object.keys(familiesData)[0]; 
      // 3a) benutzer/ anlegen
      await set(ref(db, `benutzer/${uid}`), {
        email: adminEmail,
        familie: famKey,
        isAdmin: false,
        name: adminEmail.split("@")[0],
        level: 1,
        xp: 0,
        hp: 100,
        mp: 100
      });
      // 3b) Familie-Mitgliederliste updaten
      await update(ref(db, `familien/${famKey}/mitglieder`), {
        [uid]: true
      });

      alert(`Registrierung erfolgreich! Du bist jetzt Mitglied der Familie "${famName}".`);
      window.location.href = "dashboard.html";

    } else {
      // 4) Familie existiert nicht => neu anlegen, user = Admin
      const famID = Date.now().toString();
      await set(ref(db, `familien/${famID}`), {
        name: famName,
        admin: adminEmail,
        mitglieder: { [uid]: true }
      });
      await set(ref(db, `benutzer/${uid}`), {
        email: adminEmail,
        familie: famID,
        isAdmin: true,
        name: adminEmail.split("@")[0],
        level: 1,
        xp: 0,
        hp: 100,
        mp: 100
      });

      alert(`Neue Familie "${famName}" erstellt! Du bist Admin.`);
      window.location.href = "dashboard.html";
    }
  } catch (e) {
    alert(e.message);
  }
};

window.ausloggen = async function() {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch(e) {
    console.error(e);
  }
};

/* =============== AUTH-STATE =============== */
onAuthStateChanged(auth, async (user) => {
  if (user && window.location.href.includes("dashboard.html")) {
    await ladeBenutzerdaten();
  } else if (!user && window.location.href.includes("dashboard.html")) {
    window.location.href = "index.html";
  }
});

/* =============== TÄGLICHE REGENERATION =============== */
async function checkeTäglicheRegeneration(uid) {
  const heute = new Date().toISOString().split('T')[0];
  const benRef = ref(db, `benutzer/${uid}`);
  const snap = await get(benRef);
  if (!snap.exists()) return;

  const userData = snap.val();
  if (userData.lastDailyRegen === heute) return;

  let level   = userData.level || 1;
  let hp      = userData.hp    ?? 100;
  let mp      = userData.mp    ?? 100;
  let maxHP   = 100 + Math.floor((level-1)/10)*100;
  let maxMP   = 100 + Math.floor((level-1)/10)*50;
  let neueHP  = Math.min(maxHP, hp + Math.floor(maxHP * 0.1));
  let neueMP  = Math.min(maxMP, mp + Math.floor(maxMP * 0.1));

  await update(benRef, {
    hp: neueHP,
    mp: neueMP,
    lastDailyRegen: heute
  });
}

/* =============== DASHBOARD-FUNKTIONEN =============== */
async function ladeBenutzerdaten() {
  const user = auth.currentUser;
  if (!user) return;

  const snap = await get(ref(db, `benutzer/${user.uid}`));
  if (!snap.exists()) return;
  const userData = snap.val();

  // Tägliche Aufladung
  await checkeTäglicheRegeneration(user.uid);

  // Familie / Admin anzeigen
  if (userData.familie) {
    const famSnap = await get(ref(db, `familien/${userData.familie}`));
    if (famSnap.exists()) {
      const famData = famSnap.val();
      const famNameElem = document.getElementById("familien-name");
      const adminElem   = document.getElementById("admin-email");
      if (famNameElem) famNameElem.textContent = famData.name;
      if (adminElem)   adminElem.textContent   = famData.admin;
    }
    // Zeige alle Familienmitglieder
    await zeigeFamilienMitglieder(userData.familie);
  } else {
    const famNameElem = document.getElementById("familien-name");
    const adminElem   = document.getElementById("admin-email");
    if (famNameElem) famNameElem.textContent = "Keine";
    if (adminElem)   adminElem.textContent   = userData.isAdmin ? userData.email : "-";
    // Zeige alle Nutzer, falls keine Familie
    await zeigeAlleNutzer();
  }

  // Avatar / Name anzeigen
  const avatarImg = document.getElementById("avatar-anzeige");
  const nameElem  = document.getElementById("benutzer-name");
  if (avatarImg) avatarImg.src = userData.avatarURL || "avatars/avatar1.png";
  if (nameElem)  nameElem.textContent = userData.name || userData.email;

  ladeZauberListe();
  ladeZielListe();
  ladeLogsInTabelle();
  ladeQuests(user.uid);
}

/** Balken-Funktion für HP/MP */
function getBarHTML(current, max, type="hp") {
  const perc = Math.round((current / max) * 100);
  // z. B. "hp" oder "mp"
  return `
    <div class="bar-outer">
      <div class="bar-inner ${type}" style="width: ${perc}%;"></div>
    </div>
    <span class="bar-text">${current} / ${max} ${type.toUpperCase()}</span>
  `;
}

/** Familienmitglieder in Kartenform */
async function zeigeFamilienMitglieder(famID) {
  const famMembersSnap = await get(ref(db, `familien/${famID}/mitglieder`));
  if (!famMembersSnap.exists()) return;
  const memberObj = famMembersSnap.val();

  const container = document.getElementById("player-cards-container");
  if (!container) return;
  container.innerHTML = "";

  for (let uid in memberObj) {
    const benSnap = await get(ref(db, `benutzer/${uid}`));
    if (!benSnap.exists()) continue;
    const benData = benSnap.val();

    let maxHP = 100 + Math.floor((benData.level-1)/10)*100;
    let maxMP = 100 + Math.floor((benData.level-1)/10)*50;

    // Balken
    const hpBar = getBarHTML(benData.hp || 0, maxHP, "hp");
    const mpBar = getBarHTML(benData.mp || 0, maxMP, "mp");

    let card = document.createElement("div");
    card.className = "player-card";
    card.innerHTML = `
      <img src="${benData.avatarURL || 'avatars/avatar1.png'}" alt="Avatar">
      <h3>${benData.name}</h3>
      <div class="player-level">Level: ${benData.level || 1}</div>
      <div>${hpBar}</div>
      <div>${mpBar}</div>
    `;
    container.appendChild(card);
  }
}

async function zeigeAlleNutzer() {
  const snap = await get(ref(db, "benutzer"));
  if (!snap.exists()) return;

  const container = document.getElementById("player-cards-container");
  if (!container) return;
  container.innerHTML = "";

  const users = snap.val();
  for (let uid in users) {
    const benData = users[uid];
    let maxHP = 100 + Math.floor((benData.level-1)/10)*100;
    let maxMP = 100 + Math.floor((benData.level-1)/10)*50;
    
    const hpBar = getBarHTML(benData.hp || 0, maxHP, "hp");
    const mpBar = getBarHTML(benData.mp || 0, maxMP, "mp");

    let card = document.createElement("div");
    card.className = "player-card";
    card.innerHTML = `
      <img src="${benData.avatarURL || 'avatars/avatar1.png'}" alt="Avatar">
      <h3>${benData.name}</h3>
      <div class="player-level">Level: ${benData.level || 1}</div>
      <div>${hpBar}</div>
      <div>${mpBar}</div>
    `;
    container.appendChild(card);
  }
}

/* ZAUBER-LISTE & ANGRIFF */
function ladeZauberListe() {
  const zauberSelect = document.getElementById("zauber-auswahl");
  if (!zauberSelect) return;
  zauberSelect.innerHTML = "";

  const zauber = [
    { id: "z1", name: "Heilzauber",  typ: "heilen", wert: 20 },
    { id: "z2", name: "Feuerball",   typ: "schaden", wert: 30 }
  ];

  zauber.forEach(z => {
    const opt = document.createElement("option");
    opt.value = z.id;
    opt.textContent = z.name;
    zauberSelect.appendChild(opt);
  });
}

async function ladeZielListe() {
  const user = auth.currentUser;
  if (!user) return;
  const userSnap = await get(ref(db, `benutzer/${user.uid}`));
  if (!userSnap.exists()) return;
  const userData = userSnap.val();

  const zielSelect = document.getElementById("zauber-ziel");
  if (!zielSelect) return;
  zielSelect.innerHTML = "";

  if (userData.familie) {
    const famSnap = await get(ref(db, `familien/${userData.familie}/mitglieder`));
    if (!famSnap.exists()) return;
    const memObj = famSnap.val();
    for (let uid in memObj) {
      if (uid === user.uid) continue; // nicht auf sich selbst
      const benSnap = await get(ref(db, `benutzer/${uid}`));
      if (!benSnap.exists()) continue;
      const benData = benSnap.val();
      const opt = document.createElement("option");
      opt.value = uid;
      opt.textContent = benData.name;
      zielSelect.appendChild(opt);
    }
  }
}

window.zauberWirkenHandler = async function() {
  const zielVal   = document.getElementById("zauber-ziel").value;
  const zauberVal = document.getElementById("zauber-auswahl").value;
  if (!zielVal) {
    alert("Kein Ziel ausgewählt!");
    return;
  }
  let zauber = {};
  if (zauberVal === "z1") zauber = { typ:"heilen",  wert:20, name:"Heilzauber" };
  if (zauberVal === "z2") zauber = { typ:"schaden", wert:30, name:"Feuerball" };
  await wirkeZauber(zielVal, zauber);
};

async function wirkeZauber(zielID, zauber) {
  const user = auth.currentUser;
  if (!user) return;

  const zielSnap = await get(ref(db, `benutzer/${zielID}`));
  if (!zielSnap.exists()) {
    alert("Ziel nicht gefunden!");
    return;
  }
  const ziel = zielSnap.val();

  let updates = {};
  if (zauber.typ === "heilen") {
    let maxHP  = 100 + Math.floor((ziel.level-1)/10)*100;
    let neueHP = Math.min(maxHP, (ziel.hp || 100) + zauber.wert);
    updates[`benutzer/${zielID}/hp`] = neueHP;
  } else if (zauber.typ === "schaden") {
    let neueHP = Math.max(0, (ziel.hp || 100) - zauber.wert);
    updates[`benutzer/${zielID}/hp`] = neueHP;
    if (neueHP <= 0) {
      let neuesLevel = Math.max(1, (ziel.level || 1) - 1);
      let respawnHP  = 100 + Math.floor((neuesLevel-1)/10)*100;
      updates[`benutzer/${zielID}/level`] = neuesLevel;
      updates[`benutzer/${zielID}/hp`]    = respawnHP;
    }
  }

  await update(ref(db), updates);

  // In publicLogs protokollieren
  await push(ref(db, "publicLogs"), {
    timestamp: Date.now(),
    caster: user.uid,
    target: zielID,
    zauber: zauber.name,
    typ: zauber.typ,
    wert: zauber.wert
  });
  alert(`Zauber '${zauber.name}' ausgeführt!`);
}

/* =============== LOGS =============== */
function ladeLogsInTabelle() {
  const body = document.getElementById("log-table-body");
  if (!body) return;
  onValue(ref(db, "publicLogs"), (snapshot) => {
    body.innerHTML = "";
    if (!snapshot.exists()) return;

    let logs = snapshot.val();
    let keys = Object.keys(logs).sort((a,b) => logs[b].timestamp - logs[a].timestamp);

    keys.forEach(k => {
      let l = logs[k];
      let tr = document.createElement("tr");
      let tdDatum = document.createElement("td");
      tdDatum.textContent = new Date(l.timestamp).toLocaleString();
      let tdBenutzer = document.createElement("td");
      tdBenutzer.textContent = l.caster;
      let tdZiel = document.createElement("td");
      tdZiel.textContent = l.target;
      let tdFäh = document.createElement("td");
      tdFäh.textContent = `${l.zauber} (Typ: ${l.typ}, Wert: ${l.wert})`;
      tr.appendChild(tdDatum);
      tr.appendChild(tdBenutzer);
      tr.appendChild(tdZiel);
      tr.appendChild(tdFäh);
      body.appendChild(tr);
    });
  });
}

/* =============== QUESTS =============== */
async function ladeQuests(uid) {
  const qContainer = document.getElementById("quest-container");
  if (!qContainer) return;

  const snap = await get(ref(db, "quests"));
  if (!snap.exists()) {
    qContainer.innerHTML = "<p>Keine Quests vorhanden.</p>";
    return;
  }
  let quests = snap.val();
  qContainer.innerHTML = "";

  Object.keys(quests).forEach(qid => {
    let quest = quests[qid];
    let doneCount = quest.doneBy ? Object.keys(quest.doneBy).length : 0;
    let div = document.createElement("div");
    div.className = "quest-box";
    div.innerHTML = `
      <div>
        <strong>${quest.name}</strong>
        <small>(${quest.xpPerUnit} XP pro Einheit)</small><br>
        Erledigt: ${doneCount}/${quest.totalUnits}
      </div>
    `;
    if (doneCount < quest.totalUnits) {
      let btn = document.createElement("button");
      btn.textContent = "Erledigt";
      btn.onclick = () => questErledigen(qid, uid);
      div.appendChild(btn);
    } else {
      let span = document.createElement("span");
      span.style.color = "lime";
      span.textContent = "Bereits abgeschlossen!";
      div.appendChild(span);
    }
    qContainer.appendChild(div);
  });
}

async function questErledigen(qid, uid) {
  const qSnap = await get(ref(db, `quests/${qid}`));
  if (!qSnap.exists()) return;
  let quest = qSnap.val();
  if (quest.doneBy && quest.doneBy[uid]) {
    alert("Schon erledigt!");
    return;
  }

  const userSnap = await get(ref(db, `benutzer/${uid}`));
  if (!userSnap.exists()) return;
  let userData = userSnap.val();

  let newXP = (userData.xp||0) + quest.xpPerUnit;
  let newLevel = userData.level||1;
  // Level-Up-Regel: 1 Level pro 1000 XP
  while (newXP >= 1000) {
    newXP -= 1000;
    newLevel++;
  }

  let updates = {};
  updates[`benutzer/${uid}/xp`] = newXP;
  updates[`benutzer/${uid}/level`] = newLevel;
  updates[`quests/${qid}/doneBy/${uid}`] = 1;

  await update(ref(db), updates);
  alert("Quest erledigt! XP gutgeschrieben.");
  ladeQuests(uid);
}

/* =============== AVATAR & NAME ÄNDERN =============== */
window.zeigeAvatarEinstellungen = async function() {
  const avatarSection = document.getElementById("avatar-section");
  if (!avatarSection) return;
  avatarSection.style.display = "block";

  // Hole aktuellen User
  const user = auth.currentUser;
  if (!user) return;
  const snap = await get(ref(db, `benutzer/${user.uid}`));
  if (!snap.exists()) return;
  const userData = snap.val();

  // Input Felder
  const previewImg = document.getElementById("avatar-preview");
  const nameInput  = document.getElementById("namen-input");
  const selectElem = document.getElementById("avatar-auswahl");
  if (!previewImg || !nameInput || !selectElem) return;

  // Bisheriger Name, Avatar
  nameInput.value = userData.name || "";
  previewImg.src   = userData.avatarURL || "avatars/avatar1.png";

  // Avatare-Liste
  const avatarList = [
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
  selectElem.innerHTML = "";
  avatarList.forEach((url) => {
    let opt = document.createElement("option");
    opt.value = url;
    opt.textContent = url.split("/").pop();
    selectElem.appendChild(opt);
  });
  // Vorauswahl
  selectElem.value = userData.avatarURL || "avatars/avatar1.png";

  // Live-Vorschau
  selectElem.onchange = () => {
    previewImg.src = selectElem.value;
  };
};

window.avatarSpeichern = async function() {
  const user = auth.currentUser;
  if (!user) return;

  const nameInput   = document.getElementById("namen-input");
  const selectElem  = document.getElementById("avatar-auswahl");
  const previewImg  = document.getElementById("avatar-preview");
  const avatarSection = document.getElementById("avatar-section");
  const avatarImg   = document.getElementById("avatar-anzeige");

  if (!nameInput || !selectElem || !previewImg || !avatarSection || !avatarImg) return;

  const newName  = nameInput.value.trim() || "Unbekannt";
  const chosenURL = selectElem.value || "avatars/avatar1.png";

  // DB aktualisieren
  await update(ref(db, `benutzer/${user.uid}`), {
    name: newName,
    avatarURL: chosenURL
  });

  // UI aktualisieren
  avatarImg.src = chosenURL;
  const mainNameElem = document.getElementById("benutzer-name");
  if (mainNameElem) {
    mainNameElem.textContent = newName;
  }

  avatarSection.style.display = "none";
  alert("Profil aktualisiert!");
};

window.avatarAbbrechen = function() {
  const avatarSection = document.getElementById("avatar-section");
  if (avatarSection) avatarSection.style.display = "none";
};
