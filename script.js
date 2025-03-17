// 🔥 ALLE Import-Anweisungen:
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import {
  getDatabase, ref, set, get, update, push, onValue,
  query, orderByChild, equalTo, remove
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

// 🔑 Firebase-Konfiguration (DUMMY-Werte ersetzen!)
const firebaseConfig = {
  apiKey: "XXX-REPLACE-ME-XXX",
  authDomain: "questbook-138c8.firebaseapp.com",
  databaseURL: "https://questbook-138c8-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "questbook-138c8",
  storageBucket: "questbook-138c8.firebasestorage.app",
  messagingSenderId: "625259298286",
  appId: "1:625259298286:web:bf60483c258cd311bea2ff",
  measurementId: "G-H6F2TB6PY7"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);
const auth= getAuth();

/** Captcha-Variablen */
let captchaA = 0, captchaB = 0;

// ----------------------------------------
// Captcha & Datenschutz => Registrieren
// ----------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  const capDiv = document.getElementById("captcha-section");
  if (capDiv) {
    captchaA = Math.floor(Math.random() * 10) + 1;
    captchaB = Math.floor(Math.random() * 10) + 1;
    const frageEl = document.getElementById("captcha-frage");
    if (frageEl) {
      frageEl.textContent = `Wieviel ist ${captchaA} + ${captchaB}??`;
    }
  }
});

// ----------------------------------------
// Familie erstellen
// ----------------------------------------
window.familieErstellen = async function() {
  const famName    = document.getElementById("family-name").value.trim();
  const adminEmail = document.getElementById("admin-email").value.trim();
  const adminPass  = document.getElementById("admin-password").value.trim();

  // Captcha + Datenschutz
  if (document.getElementById("captcha-section")) {
    const userAnswer = parseInt(document.getElementById("captcha-input")?.value, 10);
    if (isNaN(userAnswer) || userAnswer !== (captchaA + captchaB)) {
      alert("Bitte das richtige Ergebnis eingeben!");
      return;
    }
    const dsCb = document.getElementById("datenschutz-checkbox");
    if (dsCb && !dsCb.checked) {
      alert("Bitte Datenschutzrichtlinie akzeptieren!");
      return;
    }
  }

  if (!adminEmail || !adminPass) {
    alert("E-Mail und Passwort erforderlich!");
    return;
  }
  try {
    const userCred = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
    const uid = userCred.user.uid;

    // Wenn du WILLST, dass famName Pflicht ist, kannst du das if(!famName) wegmachen:
    if (!famName) {
      // Falls user keine Familie angibt => Familie=null
      await set(ref(db, "benutzer/" + uid), {
        email: adminEmail,
        familie: null,
        isAdmin: false,
        name: adminEmail.split("@")[0],
        level: 1, xp: 0, hp: 100, mp: 100
      });
      alert("Registrierung erfolgreich (ohne Familie)!");
      window.location.href = "dashboard.html";
      return;
    } else {
      // Check, ob Fam existiert => beitreten oder neue anlegen
      const famQ = query(ref(db, "familien"), orderByChild("name"), equalTo(famName));
      const snap = await get(famQ);
      if (snap.exists()) {
        const yesJoin = confirm(
          `Familie '${famName}' existiert schon.\n\n` +
          `OK = dieser Familie beitreten\n` +
          `Abbrechen = neue Familie anlegen (z.B. ${famName}_XYZ)`
        );
        if (yesJoin) {
          // beitreten
          const data = snap.val();
          const famKey = Object.keys(data)[0];
          await set(ref(db, "benutzer/" + uid), {
            email: adminEmail,
            familie: famKey,
            isAdmin: false,
            name: adminEmail.split("@")[0],
            level: 1, xp: 0, hp: 100, mp: 100
          });
          await update(ref(db, "familien/" + famKey + "/mitglieder"), { [uid]: true });
          alert(`Registrierung erfolgreich! Du bist Mitglied der Familie '${famName}'.`);
          window.location.href = "dashboard.html";
        } else {
          // neue Fam => Name + suffix
          const newFamID = Date.now().toString();
          const newFamName = famName + "_" + Math.floor(Math.random()*10000);
          await set(ref(db, "familien/" + newFamID), {
            name: newFamName,
            admin: adminEmail,
            mitglieder: { [uid]: true }
          });
          await set(ref(db, "benutzer/" + uid), {
            email: adminEmail,
            familie: newFamID,
            isAdmin: true,
            name: adminEmail.split("@")[0],
            level: 1, xp: 0, hp: 100, mp: 100
          });
          alert(`Neue Familie '${newFamName}' erstellt! Du bist Admin.`);
          window.location.href = "dashboard.html";
        }
      } else {
        // neu => admin
        const famID = Date.now().toString();
        await set(ref(db, "familien/" + famID), {
          name: famName,
          admin: adminEmail,
          mitglieder: { [uid]: true }
        });
        await set(ref(db, "benutzer/" + uid), {
          email: adminEmail,
          familie: famID,
          isAdmin: true,
          name: adminEmail.split("@")[0],
          level: 1, xp: 0, hp: 100, mp: 100
        });
        alert(`Neue Familie '${famName}' erstellt! Du bist Admin.`);
        window.location.href = "dashboard.html";
      }
    }
  } catch(e) {
    console.log(e.code, e.message);
    alert(e.message);
  }
};

// ----------------------------------------
// Auth & Login/Logout
// ----------------------------------------
window.adminLogin = function() {
  const email = document.getElementById("admin-email-input").value;
  const password = document.getElementById("admin-password-input").value;

  if (email.toLowerCase() !== "thomas.schuster-vb@eclipso.at") {
    alert("Kein Admin-Zugang!");
    return;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      window.location.href = "admin.html";
    })
    .catch(error => {
      console.log(error.code, error.message);
      alert(error.message);
    });
};

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

window.ausloggen = async function() {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch(e) {
    console.error(e);
  }
};

// ----------------------------------------
// onAuthStateChanged => Dashboard
// ----------------------------------------
onAuthStateChanged(auth, (user) => {
  // Dashboard => ladeBenutzerdaten
  if (user && window.location.href.includes("dashboard.html")) {
    ladeBenutzerdaten();
  } else if (!user && window.location.href.includes("dashboard.html")) {
    window.location.href = "index.html";
  }
});

// ----------------------------------------
// Helper-Funktionen => XP, Regen
// ----------------------------------------
function xpNeededForLevel(level) {
  let block = Math.floor((level - 1) / 10) + 1;
  return 100 * block;
}

function checkLevelUp(userData) {
  let xp  = userData.xp    || 0;
  let lvl = userData.level || 1;
  let xpNeed = xpNeededForLevel(lvl);
  let leveledUp = false;
  while (xp >= xpNeed) {
    xp -= xpNeed;
    lvl++;
    xpNeed = xpNeededForLevel(lvl);
    leveledUp = true;
  }
  return { newXP: xp, newLevel: lvl, leveledUp };
}

async function checkeTäglicheRegen(uid) {
  const today = new Date().toISOString().split("T")[0];
  const snap  = await get(ref(db, "benutzer/" + uid));
  if (!snap.exists()) return;

  let uData = snap.val();
  if (uData.lastDailyRegen === today) return;

  let level = uData.level || 1;
  let hp    = uData.hp    || 100;
  let mp    = uData.mp    || 100;

  let maxHP = 100 + Math.floor((level - 1) / 10) * 100;
  let maxMP = 100 + Math.floor((level - 1) / 10) * 50;

  let newHP = Math.min(maxHP, hp + Math.floor(maxHP * 0.1));
  let newMP = Math.min(maxMP, mp + Math.floor(maxMP * 0.1));

  await update(ref(db, "benutzer/" + uid), {
    hp: newHP,
    mp: newMP,
    lastDailyRegen: today
  });
}

function updateXPBar(userData) {
  let xp    = userData.xp    || 0;
  let lvl   = userData.level || 1;
  let xpNeed= xpNeededForLevel(lvl);

  const bar = document.getElementById("xp-bar-inner");
  const txt = document.getElementById("xp-bar-text");
  if (!bar || !txt) return;

  let perc = Math.round((xp / xpNeed) * 100);
  bar.style.width = Math.min(100, perc) + "%";
  let rest = xpNeed - xp;
  txt.textContent = `Noch ${rest} XP bis zum nächsten Level`;
}

function playLevelUpAnimation() {
  const elem = document.getElementById("levelup-animation");
  if (!elem) return;
  elem.style.transform = "translate(-50%,-50%) scale(0)";
  elem.style.opacity   = "1";

  setTimeout(() => {
    elem.style.transform = "translate(-50%,-50%) scale(1)";
  }, 50);

  setTimeout(() => {
    elem.style.opacity = "0";
  }, 1500);
}

// ----------------------------------------
// Hauptfunktion => Dashboard
// ----------------------------------------
async function ladeBenutzerdaten() {
  const user = auth.currentUser;
  if (!user) return;
  const snap = await get(ref(db, "benutzer/" + user.uid));
  if (!snap.exists()) return;

  let userData = snap.val();

  // Tägliche Regen
  await checkeTäglicheRegen(user.uid);

  // Level Up check
  let { newXP, newLevel, leveledUp } = checkLevelUp(userData);
  if (newLevel !== userData.level || newXP !== userData.xp) {
    userData.level = newLevel;
    userData.xp    = newXP;
    await update(ref(db, "benutzer/" + user.uid), {
      level: newLevel,
      xp: newXP
    });
  }
  if (leveledUp) {
    playLevelUpAnimation();
  }

  // Avatar & Name
  const av = document.getElementById("avatar-anzeige");
  if (av) av.src = userData.avatarURL || "avatars/avatar1.png";
  const bn = document.getElementById("benutzer-name");
  if (bn) bn.textContent = userData.name || userData.email;

  // XP-Bar
  updateXPBar(userData);

  // Familie
  if (userData.familie) {
    const famSnap = await get(ref(db, "familien/" + userData.familie));
    if (famSnap.exists()) {
      let fD = famSnap.val();
      const fnEl = document.getElementById("familien-name");
      const adEl = document.getElementById("admin-email");
      if (fnEl) fnEl.textContent = fD.name;
      if (adEl) adEl.textContent = fD.admin;
    }
    await zeigeFamilienMitglieder(userData.familie);
  } else {
    const fnEl = document.getElementById("familien-name");
    const adEl = document.getElementById("admin-email");
    if (fnEl) fnEl.textContent = "Keine";
    if (adEl) adEl.textContent = userData.isAdmin ? userData.email : "-";
    await zeigeAlleNutzer();
  }

  // Lade => Zauber, Ziele, Logs, Quests
  await ladeZauberListe();
  await ladeZielListe();
  ladeLogsInTabelle();
  ladeQuests(user.uid);

  // Admin => Alle Logs löschen?
  if (userData.isAdmin) {
    const logClearBtn = document.getElementById("btn-log-clear");
    if (logClearBtn) logClearBtn.style.display = "inline-block";
  }
}

// ----------------------------------------
// Familie anzeigen => player-cards
// ----------------------------------------
async function zeigeFamilienMitglieder(famID) {
  const fSnap = await get(ref(db, "familien/" + famID + "/mitglieder"));
  if (!fSnap.exists()) return;
  let memObj = fSnap.val();

  const container = document.getElementById("player-cards-container");
  if (!container) return;
  container.innerHTML = "";

  for (let uid in memObj) {
    const bsnap = await get(ref(db, "benutzer/" + uid));
    if (!bsnap.exists()) continue;
    let bD = bsnap.val();

    let maxHP = 100 + Math.floor((bD.level - 1) / 10) * 100;
    let maxMP = 100 + Math.floor((bD.level - 1) / 10) * 50;

    let hpPerc = Math.round(((bD.hp || 0) / maxHP) * 100);
    let mpPerc = Math.round(((bD.mp || 0) / maxMP) * 100);

    let card = document.createElement("div");
    card.className = "player-card";
    card.innerHTML = `
      <img src="${bD.avatarURL || 'avatars/avatar1.png'}" alt="Avatar">
      <h3>${bD.name}</h3>
      <div class="player-level">Level: ${bD.level || 1}</div>
      <div>
        <div class="bar-outer">
          <div class="bar-inner hp" style="width:${hpPerc}%;"></div>
        </div>
        <span class="bar-text">${bD.hp || 0}/${maxHP} HP</span>
      </div>
      <div>
        <div class="bar-outer">
          <div class="bar-inner mp" style="width:${mpPerc}%;"></div>
        </div>
        <span class="bar-text">${bD.mp || 0}/${maxMP} MP</span>
      </div>
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

  let uObj = snap.val();
  for (let uid in uObj) {
    let ud = uObj[uid];

    let maxHP = 100 + Math.floor((ud.level - 1) / 10) * 100;
    let maxMP = 100 + Math.floor((ud.level - 1) / 10) * 50;

    let hpPerc = Math.round(((ud.hp || 0) / maxHP) * 100);
    let mpPerc = Math.round(((ud.mp || 0) / maxMP) * 100);

    let card = document.createElement("div");
    card.className = "player-card";
    card.innerHTML = `
      <img src="${ud.avatarURL || 'avatars/avatar1.png'}" alt="Avatar">
      <h3>${ud.name}</h3>
      <div class="player-level">Level: ${ud.level || 1}</div>
      <div>
        <div class="bar-outer">
          <div class="bar-inner hp" style="width:${hpPerc}%;"></div>
        </div>
        <span class="bar-text">${ud.hp || 0}/${maxHP} HP</span>
      </div>
      <div>
        <div class="bar-outer">
          <div class="bar-inner mp" style="width:${mpPerc}%;"></div>
        </div>
        <span class="bar-text">${ud.mp || 0}/${maxMP} MP</span>
      </div>
    `;
    container.appendChild(card);
  }
}

// ----------------------------------------
// Zauber & Spezial & Quests (familienbasiert)
// ----------------------------------------
async function ladeZauberListe() {
  const sel = document.getElementById("zauber-auswahl");
  if (!sel) return;
  sel.innerHTML = "";

  const user = auth.currentUser;
  if (!user) return;
  const snapU = await get(ref(db, "benutzer/" + user.uid));
  if (!snapU.exists()) return;
  let uData = snapU.val();
  if (!uData.familie) return;

  const snap = await get(ref(db, `familien/${uData.familie}/zauber`));
  if (!snap.exists()) return;
  let zObj = snap.val();

  Object.keys(zObj).forEach(k => {
    let z = zObj[k];
    let opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${z.name} (kosten: ${z.kostenMP || 0} MP)`;
    sel.appendChild(opt);
  });
}

async function ladeZielListe() {
  const user = auth.currentUser;
  if (!user) return;
  const snapU = await get(ref(db, "benutzer/" + user.uid));
  if (!snapU.exists()) return;
  let bD = snapU.val();
  const sel = document.getElementById("zauber-ziel");
  if (!sel) return;
  sel.innerHTML = "";

  if (bD.familie) {
    const famSnap = await get(ref(db, `familien/${bD.familie}/mitglieder`));
    if (famSnap.exists()) {
      let mem = famSnap.val();
      for (let uid in mem) {
        if (uid === user.uid) continue;
        const xSnap = await get(ref(db, "benutzer/" + uid));
        if (!xSnap.exists()) continue;
        let xd = xSnap.val();
        let opt = document.createElement("option");
        opt.value = uid;
        opt.textContent = xd.name;
        sel.appendChild(opt);
      }
    }
  }
}

window.zauberWirkenHandler = async function() {
  const zSel = document.getElementById("zauber-auswahl");
  const tSel = document.getElementById("zauber-ziel");
  if (!zSel || !tSel) return;

  let zKey   = zSel.value;
  let target = tSel.value;
  if (!target) {
    alert("Kein Ziel gewählt");
    return;
  }
  await wirkeZauber(target, zKey);
};

// => wirkeZauber(...) in Fam-Struktur
async function wirkeZauber(zielID, zauberKey) {
  // ... (siehe Code oben in deinem Beispiel)
  // ...
}

// ----------------------------------------
// Quests (familienbasiert)
// ----------------------------------------
async function ladeQuests(uid) {
  const qc = document.getElementById("quest-container");
  if (!qc) return;

  // Hole user => familie
  const snapU = await get(ref(db, "benutzer/" + uid));
  if (!snapU.exists()) {
    qc.innerHTML = "<p>Benutzer nicht gefunden.</p>";
    return;
  }
  let uData = snapU.val();
  if (!uData.familie) {
    qc.innerHTML = "<p>Keine Familie vorhanden.</p>";
    return;
  }

  // "familien/<famID>/quests"
  const snapQ = await get(ref(db, `familien/${uData.familie}/quests`));
  if (!snapQ.exists()) {
    qc.innerHTML = "<p>Keine Quests in dieser Familie.</p>";
    return;
  }

  let qObj = snapQ.val();
  qc.innerHTML = "";

  Object.keys(qObj).forEach(qid => {
    let quest = qObj[qid];
    let doneCount = quest.doneCount || 0;
    let tot = quest.totalUnits || 1;
    let isFertig = (doneCount >= tot);
    let questName = isFertig ? `<s>${quest.name}</s>` : quest.name;

    let div = document.createElement("div");
    div.className = "quest-box";
    div.innerHTML = `
      <div>
        <strong>${questName}</strong><br>
        Fortschritt: ${doneCount}/${tot}
        <small>(${quest.xpPerUnit || 0} XP pro Einheit)</small>
      </div>
    `;
    if (!isFertig) {
      let btn = document.createElement("button");
      btn.textContent = "Erledigt";
      btn.onclick = () => questAbschliessen(qid, uid);
      div.appendChild(btn);
    } else {
      let sp = document.createElement("span");
      sp.style.color = "lime";
      sp.textContent = "Abgeschlossen!";
      div.appendChild(sp);
    }
    qc.appendChild(div);
  });
}

async function questAbschliessen(qid, uid) {
  // (Siehe dein Code: "familien/<famID>/quests/<qid>")
  // ...
}

// ----------------------------------------
// LOGS => publicLogs
// ----------------------------------------
function ladeLogsInTabelle() {
  const body = document.getElementById("log-table-body");
  if (!body) return;

  onValue(ref(db, "publicLogs"), (snap) => {
    body.innerHTML = "";
    if (!snap.exists()) return;

    let logs = snap.val();
    let keys = Object.keys(logs).sort((a, b) => logs[b].timestamp - logs[a].timestamp);

    keys.forEach(k => {
      let l = logs[k];
      // ...
      // generiere <tr>
    });
  });
}

window.adminLogsClear = async function() {
  if (!confirm("Wirklich ALLE Logs löschen?")) return;
  await remove(ref(db, "publicLogs"));
  alert("Alle Logs gelöscht!");
};

// ----------------------------------------
// Admin => Quests, Zauber, Spezial anlegen (familienbasiert)
// => z.B. window.adminQuestAnlegen, window.adminZauberAnlegen, ...
// ----------------------------------------
async function adminZauberListeLaden() {
  // ...
}
async function adminQuestListeLaden() {
  // ...
}
async function adminSpezialListeLaden() {
  // ...
}
// ... etc. Du kopierst einfach deine bestehenden Admin-Funktionen rein.

// ----------------------------------------
// Einstellungen => Tabs
// ----------------------------------------
window.oeffneEinstellungen = async function() {
  const s = document.getElementById("einstellungen-section");
  if (!s) return;
  s.style.display = "block";
  switchTab("tab-profile");

  const user= auth.currentUser;
  if(!user) return;

  const uSnap= await get(ref(db, "benutzer/"+user.uid));
  if(!uSnap.exists()) return;
  let uData= uSnap.val();

  const tz = document.querySelector("[data-tab='tab-zauber']");
  const tq = document.querySelector("[data-tab='tab-quests']");
  const ts = document.querySelector("[data-tab='tab-spezial']");

  if (uData.isAdmin) {
    tz.style.display = "inline-block";
    tq.style.display = "inline-block";
    ts.style.display = "inline-block";
    adminZauberListeLaden();
    adminQuestListeLaden();
    adminSpezialListeLaden();
  } else {
    tz.style.display = "none";
    tq.style.display = "none";
    ts.style.display = "none";
  }

  await zeigeAvatarEinstellungen();
};

window.schliesseEinstellungen = function() {
  const s = document.getElementById("einstellungen-section");
  if (s) s.style.display = "none";
};

function switchTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(tc => tc.style.display = "none");
  const t = document.getElementById(tabId);
  if (t) t.style.display = "block";
}

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("tab-btn")) {
    let tb = e.target.getAttribute("data-tab");
    switchTab(tb);
  }
});

// ----------------------------------------
// Avatar & Name
// ----------------------------------------
window.zeigeAvatarEinstellungen= async function() {
  // ...
};
window.avatarSpeichern= async function() {
  // ...
};

// ----------------------------------------
// Fehlermeldung => E-Mail
// ----------------------------------------
window.sendeFehlermeldung = function() {
  const name    = document.getElementById("error-name").value;
  const email   = document.getElementById("error-email").value;
  const message = document.getElementById("error-message").value;

  if (!name || !email || !message) {
    alert("Bitte alle Felder ausfüllen!");
    return;
  }

  const mailtoLink = `mailto:thomas.schuster-vb@eclipso.at?subject=Fehlermeldung von ${name}&body=${message}%0D%0A%0D%0AVon: ${email}`;
  window.location.href = mailtoLink;
  alert("Fehlermeldung wurde vorbereitet. Bitte prüfe dein E-Mail-Programm.");
  schließeFehlerPopup();
};
