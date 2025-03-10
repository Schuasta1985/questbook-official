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

    // 2) Falls kein famName => Keine Familie
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

    // 3) Check ob Familie existiert
    const familiesRef = ref(db, "familien");
    const qRef = query(familiesRef, orderByChild("name"), equalTo(famName));
    const snap = await get(qRef);

    if (snap.exists()) {
      // Familie existiert => Neuer User = Mitglied
      const familiesData = snap.val();
      const famKey = Object.keys(familiesData)[0];
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
      // Familie-Mitgliederliste updaten
      await update(ref(db, `familien/${famKey}/mitglieder`), {
        [uid]: true
      });
      alert(`Registrierung erfolgreich! Du bist Mitglied der Familie '${famName}'.`);
      window.location.href = "dashboard.html";
    } else {
      // Neue Familie => user = Admin
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
      alert(`Neue Familie '${famName}' erstellt! Du bist Admin.`);
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

  // Familie / Admin
  if (userData.familie) {
    const famSnap = await get(ref(db, `familien/${userData.familie}`));
    if (famSnap.exists()) {
      const famData = famSnap.val();
      const famNameElem = document.getElementById("familien-name");
      const adminElem   = document.getElementById("admin-email");
      if (famNameElem) famNameElem.textContent = famData.name;
      if (adminElem)   adminElem.textContent   = famData.admin;
    }
    await zeigeFamilienMitglieder(userData.familie);
  } else {
    const famNameElem = document.getElementById("familien-name");
    const adminElem   = document.getElementById("admin-email");
    if (famNameElem) famNameElem.textContent = "Keine";
    if (adminElem)   adminElem.textContent   = userData.isAdmin ? userData.email : "-";
    await zeigeAlleNutzer();
  }

  // Avatar / Name
  const avatarImg = document.getElementById("avatar-anzeige");
  const nameElem  = document.getElementById("benutzer-name");
  if (avatarImg) avatarImg.src = userData.avatarURL || "avatars/avatar1.png";
  if (nameElem)  nameElem.textContent = userData.name || userData.email;

  // Zauber & Ziele laden
  await ladeZauberListe();
  await ladeZielListe();
  // Logs
  ladeLogsInTabelle();
  // Quests (im Hauptbereich)
  ladeQuests(user.uid);
}

/** Balken-Funktion für HP/MP */
function getBarHTML(current, max, type="hp") {
  const perc = Math.round((current / max) * 100);
  return `
    <div class="bar-outer">
      <div class="bar-inner ${type}" style="width: ${perc}%;"></div>
    </div>
    <span class="bar-text">${current} / ${max} ${type.toUpperCase()}</span>
  `;
}

/** Familienmitglieder */
async function zeigeFamilienMitglieder(famID) {
  const famSnap = await get(ref(db, `familien/${famID}/mitglieder`));
  if (!famSnap.exists()) return;
  const memberObj = famSnap.val();

  const container = document.getElementById("player-cards-container");
  if (!container) return;
  container.innerHTML = "";

  for (let uid in memberObj) {
    const benSnap = await get(ref(db, `benutzer/${uid}`));
    if (!benSnap.exists()) continue;
    const benData = benSnap.val();

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

/* ZAUBER & ANGRIFF */
async function ladeZauberListe() {
  const zauberSelect = document.getElementById("zauber-auswahl");
  if (!zauberSelect) return;
  zauberSelect.innerHTML = "";

  const snap = await get(ref(db, "zauber"));
  if (!snap.exists()) {
    console.log("Keine Zauber definiert.");
    return;
  }
  const zauberObj = snap.val();

  Object.keys(zauberObj).forEach(zKey => {
    let zData = zauberObj[zKey];
    const opt = document.createElement("option");
    opt.value = zKey;
    opt.textContent = `${zData.name} (Kosten: ${zData.kostenMP || 0} MP)`;
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
  const zauberKey = document.getElementById("zauber-auswahl").value;
  if (!zielVal) {
    alert("Kein Ziel ausgewählt!");
    return;
  }
  await wirkeZauber(zielVal, zauberKey);
};

async function wirkeZauber(zielID, zauberKey) {
  const user = auth.currentUser;
  if (!user) return;

  const zauberSnap = await get(ref(db, `zauber/${zauberKey}`));
  if (!zauberSnap.exists()) {
    alert("Zauber existiert nicht!");
    return;
  }
  const zauber = zauberSnap.val();

  const casterSnap = await get(ref(db, `benutzer/${user.uid}`));
  if (!casterSnap.exists()) {
    alert("Fehler: Deine Daten nicht gefunden!");
    return;
  }
  const caster = casterSnap.val();

  // MP check
  if (zauber.kostenMP && (caster.mp || 0) < zauber.kostenMP) {
    alert("Nicht genug MP!");
    return;
  }

  // Ziel
  const zielSnap = await get(ref(db, `benutzer/${zielID}`));
  if (!zielSnap.exists()) {
    alert("Ziel nicht gefunden!");
    return;
  }
  const ziel = zielSnap.val();

  let updates = {};
  // MP abziehen
  if (zauber.kostenMP) {
    updates[`benutzer/${user.uid}/mp`] = Math.max(0, (caster.mp||0) - zauber.kostenMP);
  }

  if (zauber.typ === "heilen") {
    let maxHP  = 100 + Math.floor((ziel.level-1)/10)*100;
    let neueHP = Math.min(maxHP, (ziel.hp||100) + zauber.wert);
    updates[`benutzer/${zielID}/hp`] = neueHP;
  } else if (zauber.typ === "schaden") {
    let neueHP = Math.max(0, (ziel.hp||100) - zauber.wert);
    updates[`benutzer/${zielID}/hp`] = neueHP;
    if (neueHP <= 0) {
      let neuesLevel = Math.max(1, (ziel.level||1) - 1);
      let respawnHP  = 100 + Math.floor((neuesLevel-1)/10)*100;
      updates[`benutzer/${zielID}/level`] = neuesLevel;
      updates[`benutzer/${zielID}/hp`]    = respawnHP;
    }
  }

  await update(ref(db), updates);

  // Log
  await push(ref(db, "publicLogs"), {
    timestamp: Date.now(),
    caster: user.uid,
    target: zielID,
    zauber: zauber.name,
    typ: zauber.typ,
    wert: zauber.wert,
    kosten: zauber.kostenMP || 0
  });
  alert(`Zauber '${zauber.name}' ausgeführt! (Kosten: ${zauber.kostenMP||0} MP)`);
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
      tdFäh.textContent = `${l.zauber} (Typ: ${l.typ}, Wert: ${l.wert}, Kosten: ${l.kosten||0} MP)`;
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

  // Für jede Quest: falls doneCount < totalUnits => "Erledigen"-Button
  // sonst "Abgeschlossen" (durchstreichen)
  Object.keys(quests).forEach(qid => {
    let quest = quests[qid];
    let doneCount = quest.doneCount || 0; // wie oft schon abgeschlossen
    let div = document.createElement("div");
    div.className = "quest-box";

    // Prüfen ob fertig
    let isFertig = (doneCount >= (quest.totalUnits||1));

    // Name mit optionalem Durchstreichen
    let questNameHTML = quest.name;
    if (isFertig) {
      questNameHTML = `<s>${quest.name}</s>`;
    }

    div.innerHTML = `
      <div>
        <strong>${questNameHTML}</strong><br>
        Fortschritt: ${doneCount}/${quest.totalUnits || 1} 
        <small>(${quest.xpPerUnit || 0} XP pro Einheit)</small>
      </div>
    `;

    if (!isFertig) {
      // Erledigen-Button
      let btn = document.createElement("button");
      btn.textContent = "Erledigt";
      btn.onclick = () => questErledigen(qid, uid);
      div.appendChild(btn);
    } else {
      // Abgeschlossen => kein Button
      let span = document.createElement("span");
      span.style.color = "lime";
      span.textContent = "Abgeschlossen!";
      div.appendChild(span);
    }
    qContainer.appendChild(div);
  });
}

async function questErledigen(qid, uid) {
  const qSnap = await get(ref(db, `quests/${qid}`));
  if (!qSnap.exists()) return alert("Quest nicht gefunden!");
  let quest = qSnap.val();

  let doneCount = quest.doneCount || 0;
  let totalUnits = quest.totalUnits || 1;

  // Wenn doneCount >= totalUnits => fertig
  if (doneCount >= totalUnits) {
    alert("Quest ist bereits abgeschlossen.");
    return;
  }

  // XP an den User geben
  const userSnap = await get(ref(db, `benutzer/${uid}`));
  if (!userSnap.exists()) return;
  let userData = userSnap.val();

  let newXP = (userData.xp||0) + (quest.xpPerUnit||0);
  let newLevel = userData.level||1;
  // level up pro 1000 xp
  while (newXP >= 1000) {
    newXP -= 1000;
    newLevel++;
  }

  let updates = {};
  // user xp/level
  updates[`benutzer/${uid}/xp`] = newXP;
  updates[`benutzer/${uid}/level`] = newLevel;

  // quest doneCount +1
  let newDoneCount = doneCount + 1;
  updates[`quests/${qid}/doneCount`] = newDoneCount;

  // log
  let logEntry = {
    timestamp: Date.now(),
    user: uid,
    actionType: "quest",
    questName: quest.name,
    xpGained: quest.xpPerUnit||0,
    message: `User ${uid} hat '${quest.name}' erledigt.`
  };
  const logRef = push(ref(db, "publicLogs"));

  await update(ref(db), updates);
  await set(logRef, logEntry);

  alert(`Quest '${quest.name}' erledigt! +${quest.xpPerUnit||0} XP`);
  ladeQuests(uid);
}

/* =============== EINSTELLUNGEN-FENSTER (TABS) =============== */
window.oeffneEinstellungen = async function() {
  const einstellungenSec = document.getElementById("einstellungen-section");
  if (!einstellungenSec) return;
  einstellungenSec.style.display = "block";

  // Standard: "tab-profile"
  switchTab("tab-profile");

  // Check Admin => Tabs
  const user = auth.currentUser;
  if (!user) return;
  const snap = await get(ref(db, `benutzer/${user.uid}`));
  if (!snap.exists()) return;
  const userData = snap.val();

  // Wenn Admin => Tabs einblenden
  const tabZauberBtn  = document.querySelector("[data-tab='tab-zauber']");
  const tabQuestsBtn  = document.querySelector("[data-tab='tab-quests']");
  const tabSpezialBtn = document.querySelector("[data-tab='tab-spezial']");

  if (userData.isAdmin) {
    tabZauberBtn.style.display  = "inline-block";
    tabQuestsBtn.style.display  = "inline-block";
    tabSpezialBtn.style.display = "inline-block";

    // Listen laden
    adminZauberListeLaden();
    adminQuestListeLaden();
    adminSpezialListeLaden();
  } else {
    tabZauberBtn.style.display  = "none";
    tabQuestsBtn.style.display  = "none";
    tabSpezialBtn.style.display = "none";
  }

  // Profil laden
  await zeigeAvatarEinstellungen();
};

window.schliesseEinstellungen = function() {
  const einstellungenSec = document.getElementById("einstellungen-section");
  if (einstellungenSec) einstellungenSec.style.display = "none";
};

function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.style.display = "none";
  });
  const target = document.getElementById(tabId);
  if (target) target.style.display = "block";
}

// Tab-Buttons
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("tab-btn")) {
    let target = e.target.getAttribute("data-tab");
    switchTab(target);
  }
});

/* =============== ADMIN-FUNKTIONEN: ZAUBER =============== */
async function adminZauberListeLaden() {
  const ul = document.getElementById("admin-zauber-liste");
  if (!ul) return;
  ul.innerHTML = "";

  const snap = await get(ref(db, "zauber"));
  if (!snap.exists()) {
    ul.innerHTML = "<li>Keine Zauber vorhanden.</li>";
    return;
  }
  const zauberObj = snap.val();
  Object.keys(zauberObj).forEach(zKey => {
    let z = zauberObj[zKey];
    let li = document.createElement("li");
    li.textContent = `${z.name} (Typ:${z.typ}, Wert:${z.wert}, Kosten:${z.kostenMP} MP)`;

    let delBtn = document.createElement("button");
    delBtn.textContent = "Löschen";
    delBtn.onclick = () => adminZauberLoeschen(zKey);
    li.appendChild(delBtn);

    ul.appendChild(li);
  });
}

window.adminZauberAnlegen = async function() {
  const zName   = document.getElementById("zauber-name").value;
  const zTyp    = document.getElementById("zauber-typ").value;
  const zWert   = parseInt(document.getElementById("zauber-wert").value, 10);
  const zKosten = parseInt(document.getElementById("zauber-kosten").value, 10);
  if (!zName || isNaN(zWert) || isNaN(zKosten)) {
    alert("Bitte Name, Typ, Wert, Kosten angeben!");
    return;
  }
  const newKey = push(ref(db, "zauber")).key;
  await set(ref(db, "zauber/"+newKey), {
    name: zName,
    typ: zTyp,
    wert: zWert,
    kostenMP: zKosten
  });
  alert("Zauber angelegt!");
  adminZauberListeLaden();
};

async function adminZauberLoeschen(zKey) {
  if (!confirm("Zauber wirklich löschen?")) return;
  await update(ref(db, "zauber/"+zKey), null);
  adminZauberListeLaden();
}

/* =============== ADMIN-FUNKTIONEN: QUESTS =============== */
async function adminQuestListeLaden() {
  const ul = document.getElementById("admin-quests-liste");
  if (!ul) return;
  ul.innerHTML = "";

  const snap = await get(ref(db, "quests"));
  if (!snap.exists()) {
    ul.innerHTML = "<li>Keine Quests vorhanden.</li>";
    return;
  }
  const questObj = snap.val();
  Object.keys(questObj).forEach(qKey => {
    let q = questObj[qKey];
    let li = document.createElement("li");

    // z. B. "Garten gießen (XP:20, doneCount:2/5)"
    let dc = q.doneCount||0;
    let tot = q.totalUnits||1;
    li.textContent = `${q.name} (XP:${q.xpPerUnit||0}, Fortschritt:${dc}/${tot})`;

    let delBtn = document.createElement("button");
    delBtn.textContent = "Löschen";
    delBtn.onclick = () => adminQuestLoeschen(qKey);
    li.appendChild(delBtn);

    ul.appendChild(li);
  });
}

window.adminQuestAnlegen = async function() {
  const qName  = document.getElementById("quest-name").value;
  const qXP    = parseInt(document.getElementById("quest-xp").value, 10);
  const qUnits = parseInt(document.getElementById("quest-totalunits").value, 10);
  if (!qName || isNaN(qXP) || isNaN(qUnits)) {
    alert("Bitte Name, XP und Anzahl angeben!");
    return;
  }
  const newKey = push(ref(db, "quests")).key;
  await set(ref(db, "quests/"+newKey), {
    name: qName,
    xpPerUnit: qXP,
    totalUnits: qUnits,
    doneCount: 0  // zu Beginn 0
  });
  alert("Quest angelegt!");
  adminQuestListeLaden();
};

async function adminQuestLoeschen(qKey) {
  if (!confirm("Quest wirklich löschen?")) return;
  await update(ref(db, "quests/"+qKey), null);
  adminQuestListeLaden();
}

/* =============== ADMIN-FUNKTIONEN: SPEZIAL =============== */
async function adminSpezialListeLaden() {
  const ul = document.getElementById("admin-spezial-liste");
  if (!ul) return;
  ul.innerHTML = "";

  const snap = await get(ref(db, "spezial"));
  if (!snap.exists()) {
    ul.innerHTML = "<li>Keine Spezialfähigkeiten vorhanden.</li>";
    return;
  }
  const spObj = snap.val();
  Object.keys(spObj).forEach(spKey => {
    let s = spObj[spKey];
    let li = document.createElement("li");
    li.textContent = `${s.name} (Kosten: ${s.kostenLevel||0} Level)`;

    let delBtn = document.createElement("button");
    delBtn.textContent = "Löschen";
    delBtn.onclick = () => adminSpezialLoeschen(spKey);
    li.appendChild(delBtn);

    ul.appendChild(li);
  });
}

window.adminSpezialAnlegen = async function() {
  const sName   = document.getElementById("spezial-name").value;
  const sKosten = parseInt(document.getElementById("spezial-kosten").value, 10);
  if (!sName || isNaN(sKosten)) {
    alert("Bitte Name & Kosten angeben!");
    return;
  }
  const newKey = push(ref(db, "spezial")).key;
  await set(ref(db, "spezial/"+newKey), {
    name: sName,
    kostenLevel: sKosten
  });
  alert("Spezialfähigkeit angelegt!");
  adminSpezialListeLaden();
};

async function adminSpezialLoeschen(spKey) {
  if (!confirm("Wirklich löschen?")) return;
  await update(ref(db, "spezial/"+spKey), null);
  adminSpezialListeLaden();
}

/* =============== AVATAR & NAME ÄNDERN =============== */
function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(tc => tc.style.display = "none");
  const target = document.getElementById(tabId);
  if (target) target.style.display = "block";
}

window.oeffneEinstellungen = async function() {
  const einstellungenSec = document.getElementById("einstellungen-section");
  if (!einstellungenSec) return;
  einstellungenSec.style.display = "block";

  // Standard Tab "tab-profile"
  switchTab("tab-profile");

  // Check Admin
  const user = auth.currentUser;
  if (!user) return;
  const snap = await get(ref(db, `benutzer/${user.uid}`));
  if (!snap.exists()) return;
  const userData = snap.val();

  // Tabs
  const tabZauberBtn  = document.querySelector("[data-tab='tab-zauber']");
  const tabQuestsBtn  = document.querySelector("[data-tab='tab-quests']");
  const tabSpezialBtn = document.querySelector("[data-tab='tab-spezial']");
  if (userData.isAdmin) {
    tabZauberBtn.style.display  = "inline-block";
    tabQuestsBtn.style.display  = "inline-block";
    tabSpezialBtn.style.display = "inline-block";
    // Listen laden
    adminZauberListeLaden();
    adminQuestListeLaden();
    adminSpezialListeLaden();
  } else {
    tabZauberBtn.style.display  = "none";
    tabQuestsBtn.style.display  = "none";
    tabSpezialBtn.style.display = "none";
  }
  await zeigeAvatarEinstellungen();
};

window.schliesseEinstellungen = function() {
  const einstellungenSec = document.getElementById("einstellungen-section");
  if (einstellungenSec) einstellungenSec.style.display = "none";
};

// Profile (Avatar, Name)
window.zeigeAvatarEinstellungen = async function() {
  const user = auth.currentUser;
  if (!user) return;

  const snap = await get(ref(db, `benutzer/${user.uid}`));
  if (!snap.exists()) return;
  const userData = snap.val();

  const previewImg = document.getElementById("avatar-preview");
  const nameInput  = document.getElementById("namen-input");
  const selectElem = document.getElementById("avatar-auswahl");

  if (!previewImg || !nameInput || !selectElem) return;

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
  avatarList.forEach(url => {
    let opt = document.createElement("option");
    opt.value = url;
    opt.textContent = url.split("/").pop();
    selectElem.appendChild(opt);
  });
  selectElem.value = userData.avatarURL || "avatars/avatar1.png";

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
  const avatarImg   = document.getElementById("avatar-anzeige");
  if (!nameInput || !selectElem || !previewImg || !avatarImg) return;

  const newName   = nameInput.value.trim() || "Unbekannt";
  const chosenURL = selectElem.value || "avatars/avatar1.png";

  await update(ref(db, `benutzer/${user.uid}`), {
    name: newName,
    avatarURL: chosenURL
  });

  avatarImg.src = chosenURL;
  const mainNameElem = document.getElementById("benutzer-name");
  if (mainNameElem) mainNameElem.textContent = newName;

  alert("Profil aktualisiert!");
};

