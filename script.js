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

// 🔑 Firebase-Konfiguration
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

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);
const auth= getAuth();

// ----------------------------------------
// Admin-Login & allgemeine UI-Funktionen
// ----------------------------------------

window.adminLogin = function() {
  const email = document.getElementById("admin-email-input").value;
  const password = document.getElementById("admin-password-input").value;

  if (email !== "thomas.schuster-vb@eclipso.at") {
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

window.zeigeVideoPopup = function() {
  document.getElementById("video-popup").style.display = "block";
};

window.schließeVideoPopup = function() {
  document.getElementById("video-popup").style.display = "none";
};

window.zeigeAdminLogin = function() {
  const popup = document.getElementById("admin-login-popup");
  if (popup) popup.style.display = "block";
};

window.schließeAdminLogin = function() {
  const popup = document.getElementById("admin-login-popup");
  if (popup) popup.style.display = "none";
};

// ----------------------------------------
// Helper-Funktionen (XP, Level, Regen, etc.)
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
// Auth & Login/Logout Funktionen
// ----------------------------------------

onAuthStateChanged(auth, (user) => {
  if (user && window.location.href.includes("dashboard.html")) {
    ladeBenutzerdaten();
  } else if (!user && window.location.href.includes("dashboard.html")) {
    window.location.href = "index.html";
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const lBtn = document.getElementById("login-btn");
  const rBtn = document.getElementById("register-btn");

  if (lBtn) {
    lBtn.onclick = () => {
      document.getElementById("login-form").style.display = "block";
      if (document.getElementById("register-form")) {
        document.getElementById("register-form").style.display = "none";
      }
    };
  }
  if (rBtn) {
    rBtn.onclick = () => {
      document.getElementById("login-form").style.display = "none";
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
    console.log(e.code, e.message);
    alert(e.message);
  }
};

window.googleLogin = async function() {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
    window.location.href = "dashboard.html";
  } catch(e) {
    console.log(e.code, e.message);
    alert(e.message);
  }
};

// ----------------------------------------
// Familie erstellen + (Captcha, DS) [optional]
// ----------------------------------------

let captchaA=0, captchaB=0;
document.addEventListener("DOMContentLoaded", () => {
  const capDiv = document.getElementById("captcha-section");
  if (capDiv) {
    captchaA = Math.floor(Math.random()*10)+1;
    captchaB = Math.floor(Math.random()*10)+1;
    const frageEl = document.getElementById("captcha-frage");
    if (frageEl) {
      frageEl.textContent = `Wieviel ist ${captchaA} + ${captchaB}?`;
    }
  }
});

window.familieErstellen = async function() {
  const famName    = document.getElementById("family-name").value.trim();
  const adminEmail = document.getElementById("admin-email").value.trim();
  const adminPass  = document.getElementById("admin-password").value.trim();

  // Captcha + DS
  if (document.getElementById("captcha-section")) {
    const userAnswer = parseInt(document.getElementById("captcha-input")?.value, 10);
    if (isNaN(userAnswer) || userAnswer !== (captchaA + captchaB)) {
      alert("Bitte das richtige Ergebnis der Rechenaufgabe eingeben!");
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

    if (!famName) {
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
      // Prüfen, ob Familie existiert
      const famQ = query(ref(db, "familien"), orderByChild("name"), equalTo(famName));
      const snap = await get(famQ);
      if (snap.exists()) {
        // exist => nachfragen
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
          // user will neue Familie anlegen
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

window.ausloggen = async function() {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch(e) {
    console.error(e);
  }
};

// ----------------------------------------
// Laden der Benutzerdaten und UI-Aktualisierung
// ----------------------------------------

async function ladeBenutzerdaten() {
  const user = auth.currentUser;
  if (!user) return;
  const snap = await get(ref(db, "benutzer/" + user.uid));
  if (!snap.exists()) return;

  let userData = snap.val();

  await checkeTäglicheRegen(user.uid);

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

  const av = document.getElementById("avatar-anzeige");
  if (av) av.src = userData.avatarURL || "avatars/avatar1.png";
  const bn = document.getElementById("benutzer-name");
  if (bn) bn.textContent = userData.name || userData.email;

  updateXPBar(userData);

  if (userData.familie) {
    const famSnap = await get(ref(db, "familien/" + userData.familie));
    if (famSnap.exists()) {
      let fD = famSnap.val();
      document.getElementById("familien-name").textContent = fD.name;
      document.getElementById("admin-email").textContent   = fD.admin;
    }
    await zeigeFamilienMitglieder(userData.familie);
  } else {
    document.getElementById("familien-name").textContent = "Keine";
    document.getElementById("admin-email").textContent    = userData.isAdmin ? userData.email : "-";
    await zeigeAlleNutzer();
  }

  // Lade & zeige => zauber, logs, quests, etc
  await ladeZauberListe();
  await ladeZielListe();
  ladeLogsInTabelle();
  ladeQuests(user.uid);

  if (userData.isAdmin) {
    const logClearBtn = document.getElementById("btn-log-clear");
    if (logClearBtn) logClearBtn.style.display = "inline-block";
  }
}

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
// Zauber (FAMILIENBASIERT) – Dropdown-Liste
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
  if (!uData.familie) return; // Keine Familie => keine Zauber

  // "familien/<famID>/zauber"
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

// WirkeZauber => "familien/<famID>/zauber/<zauberKey>"
async function wirkeZauber(zielID, zauberKey) {
  const user = auth.currentUser;
  if (!user) return;

  const cSnap = await get(ref(db, "benutzer/" + user.uid));
  if (!cSnap.exists()) return;
  let caster = cSnap.val();
  if (!caster.familie) {
    alert("Keine Familie => keine Zauber!");
    return;
  }

  const zSnap = await get(ref(db, `familien/${caster.familie}/zauber/${zauberKey}`));
  if (!zSnap.exists()) {
    alert("Zauber existiert nicht (familienbasiert)!");
    return;
  }
  let z = zSnap.val();

  const tSnap = await get(ref(db, "benutzer/" + zielID));
  if (!tSnap.exists()) {
    alert("Ziel nicht gefunden!");
    return;
  }
  let ziel = tSnap.val();

  if ((caster.mp || 0) < (z.kostenMP || 0)) {
    alert("Nicht genug MP!");
    return;
  }

  let newCasterMP = (caster.mp || 0) - (z.kostenMP || 0);
  let newZielHP   = (ziel.hp || 0);

  if (z.typ === "heilen") {
    newZielHP += (z.wert || 0);
    let maxHP = 100 + Math.floor(((ziel.level || 1) - 1) / 10) * 100;
    if (newZielHP > maxHP) newZielHP = maxHP;
  } else if (z.typ === "schaden") {
    newZielHP -= (z.wert || 0);
    if (newZielHP < 0) newZielHP = 0;
  }

  let updates = {};
  updates[`benutzer/${user.uid}/mp`] = newCasterMP;
  updates[`benutzer/${zielID}/hp`]   = newZielHP;

  await update(ref(db), updates);

  let casterName = caster.name || caster.email;
  let zielName   = ziel.name  || ziel.email;

  await push(ref(db, "publicLogs"), {
    timestamp: Date.now(),
    actionType: "zauber",
    casterID:   user.uid,
    targetID:   zielID,
    casterName: casterName,
    targetName: zielName,
    zauber:     z.name,
    typ:        z.typ,
    wert:       z.wert,
    kosten:     z.kostenMP
  });

  await ladeBenutzerdaten();
  alert(`Zauber erfolgreich gewirkt: ${z.name} auf ${zielName}`);
}

// Zauber-Popup
window.zeigeZauberPopup = async function() {
  const pop = document.getElementById("popup-zauber");
  if (!pop) return;
  pop.style.display = "flex";

  const user = auth.currentUser;
  if (!user) return;

  const selTarget = document.getElementById("zauber-ziel-popup");
  const selZauber = document.getElementById("zauber-liste-popup");
  if (!selTarget || !selZauber) return;

  selTarget.innerHTML = "";
  selZauber.innerHTML = "";

  const bSnap = await get(ref(db, "benutzer/" + user.uid));
  if (!bSnap.exists()) return;
  let bD = bSnap.val();

  // Ziel-liste
  if (bD.familie) {
    const famSnap = await get(ref(db, "familien/" + bD.familie + "/mitglieder"));
    if (famSnap.exists()) {
      let mem = famSnap.val();
      for (let uid in mem) {
        if (uid === user.uid) continue;
        const bn = await get(ref(db, "benutzer/" + uid));
        if (!bn.exists()) continue;
        let d = bn.val();
        let opt = document.createElement("option");
        opt.value = uid;
        opt.textContent = d.name;
        selTarget.appendChild(opt);
      }
    }
  }

  // Zauber-liste => "familien/<famID>/zauber"
  if (!bD.familie) return;
  const zSnap = await get(ref(db, `familien/${bD.familie}/zauber`));
  if (!zSnap.exists()) return;
  let zObj = zSnap.val();
  Object.keys(zObj).forEach(k => {
    let z = zObj[k];
    let opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${z.name} (Kosten:${z.kostenMP || 0}MP)`;
    selZauber.appendChild(opt);
  });
};

window.closeZauberPopup = function() {
  const pop = document.getElementById("popup-zauber");
  if (pop) pop.style.display = "none";
};

window.popupZauberWirken = async function() {
  const selT = document.getElementById("zauber-ziel-popup");
  const selZ = document.getElementById("zauber-liste-popup");
  if (!selT || !selZ) return;

  let tVal = selT.value;
  let zVal = selZ.value;

  await wirkeZauber(tVal, zVal);
  closeZauberPopup();
};

// ----------------------------------------
// Spezial-Popup & Spezialfähigkeit (familienbasiert)
// ----------------------------------------

window.zeigeSpezialPopup = async function() {
  const pop = document.getElementById("popup-spezial");
  if (!pop) return;
  pop.style.display = "flex";

  const user = auth.currentUser;
  if (!user) return;

  const bSnap = await get(ref(db, "benutzer/" + user.uid));
  if (!bSnap.exists()) return;
  let bD = bSnap.val();

  const selTarget = document.getElementById("spezial-ziel-popup");
  const selSpec   = document.getElementById("spezial-liste-popup");
  if (!selTarget || !selSpec) return;

  selTarget.innerHTML = "";
  selSpec.innerHTML   = "";

  if (bD.familie) {
    const famSnap = await get(ref(db, "familien/" + bD.familie + "/mitglieder"));
    if (famSnap.exists()) {
      let mem = famSnap.val();
      for (let uid in mem) {
        if (uid === user.uid) continue;
        const bn = await get(ref(db, "benutzer/" + uid));
        if (!bn.exists()) continue;
        let d = bn.val();
        let opt = document.createElement("option");
        opt.value = uid;
        opt.textContent = d.name;
        selTarget.appendChild(opt);
      }
    }
  }

  if (!bD.familie) return;
  const spSnap = await get(ref(db, `familien/${bD.familie}/spezial`));
  if (!spSnap.exists()) return;
  let spObj = spSnap.val();
  Object.keys(spObj).forEach(k => {
    let s = spObj[k];
    let opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `${s.name} (Kosten:${s.kostenLevel || 0},Chance:${s.chance || 100}%)`;
    selSpec.appendChild(opt);
  });
};

window.closeSpezialPopup = function() {
  const pop = document.getElementById("popup-spezial");
  if (pop) pop.style.display = "none";
};

window.popupSpezialWirken = async function() {
  const selT       = document.getElementById("spezial-ziel-popup");
  const selS       = document.getElementById("spezial-liste-popup");
  const extraInput = document.getElementById("spezial-extra-text");

  if (!selT || !selS || !extraInput) return;

  let tVal    = selT.value;
  let sVal    = selS.value;
  let extraVal= extraInput.value.trim();

  await wirkeSpezial(tVal, sVal, extraVal);
  closeSpezialPopup();
};

async function wirkeSpezial(zielID, spKey, extraVal) {
  const user = auth.currentUser;
  if (!user) return;

  const cSnap = await get(ref(db, "benutzer/" + user.uid));
  if (!cSnap.exists()) return;
  let caster = cSnap.val();
  if (!caster.familie) {
    alert("Keine Familie => keine Spezialfähigkeiten!");
    return;
  }

  const spSnap = await get(ref(db, `familien/${caster.familie}/spezial/${spKey}`));
  if (!spSnap.exists()) return alert("Spezialfähigkeit existiert nicht!");
  let sp = spSnap.val();

  const zSnap = await get(ref(db, "benutzer/" + zielID));
  if (!zSnap.exists()) return alert("Ziel nicht gefunden!");
  let ziel = zSnap.val();

  if ((caster.level || 1) < (sp.kostenLevel || 0)) {
    alert(`Nicht genug Level! Benötigt: ${sp.kostenLevel || 0}`);
    return;
  }

  let now = new Date();
  let casterSpecUsed = caster.spezialUsed || {};
  if (casterSpecUsed[spKey]) {
    let lastUsedMs = casterSpecUsed[spKey];
    let diffDays   = (now.getTime() - lastUsedMs) / (1000 * 60 * 60 * 24);
    if (diffDays < (sp.cooldown || 0)) {
      let left = (sp.cooldown || 0) - diffDays;
      alert(`Fähigkeit gesperrt! Noch ~${left.toFixed(1)} Tage warten.`);
      return;
    }
  }

  let newLvl = caster.level;
  for (let i = 0; i < (sp.kostenLevel || 0); i++) {
    if (newLvl > 1) newLvl--;
  }

  let chance = (sp.chance || 100);
  let rolled = Math.random() * 100;
  let success = (rolled < chance);

  let updates = {};
  updates[`benutzer/${user.uid}/level`] = newLvl;

  if (success) {
    casterSpecUsed[spKey] = now.getTime();
    updates[`benutzer/${user.uid}/spezialUsed`] = casterSpecUsed;
  }

  await update(ref(db), updates);
  await ladeBenutzerdaten();

  let casterName = caster.name || caster.email;
  let zielName   = ziel.name  || ziel.email;

  if (!success) {
    alert(`Fähigkeit fehlgeschlagen! Du verlierst trotzdem ${sp.kostenLevel || 0} Level.`);
  } else {
    let msg = `${casterName} wünscht sich "${extraVal}" von ${zielName}.`;
    alert(`Fähigkeit erfolgreich! ${msg}`);
  }

  await push(ref(db, "publicLogs"), {
    timestamp: Date.now(),
    actionType: "spezial",
    casterID: user.uid,
    targetID: zielID,
    casterName: casterName,
    targetName: zielName,
    name: sp.name,
    kosten: sp.kostenLevel || 0,
    chance: sp.chance || 100,
    kommentar: extraVal,
    success: success
  });
}

// ----------------------------------------
// Logs in Tabelle laden
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
      if (l.actionType === "quest") return;

      let tr = document.createElement("tr");

      let tdD = document.createElement("td");
      tdD.textContent = new Date(l.timestamp).toLocaleString();

      let tdU = document.createElement("td");
      tdU.textContent = l.casterName || l.caster || l.user || "--";

      let tdZ = document.createElement("td");
      tdZ.textContent = l.targetName || l.target || l.targetID || "--";

      let tdF = document.createElement("td");
      if (l.actionType === "zauber") {
        tdF.textContent = `${l.zauber} (Typ:${l.typ}, Wert:${l.wert}, Kosten:${l.kosten || 0})`;
      } else if (l.actionType === "spezial") {
        let succ = l.success ? "erfolgreich" : "fehlgeschlagen";
        tdF.textContent = `${l.name} [${succ}] (Kosten:${l.kosten || 0}, Chance:${l.chance || 100}%, Kommentar:'${l.kommentar || ""}')`;
      } else {
        tdF.textContent = `(??)`;
      }

      tr.appendChild(tdD);
      tr.appendChild(tdU);
      tr.appendChild(tdZ);
      tr.appendChild(tdF);
      body.appendChild(tr);
    });
  });
}

window.adminLogsClear = async function() {
  if (!confirm("Wirklich ALLE Logs löschen?")) return;
  await remove(ref(db, "publicLogs"));
  alert("Alle Logs gelöscht!");
};

// ----------------------------------------
// Quests (familienbasiert)
// ----------------------------------------

async function ladeQuests(uid) {
  const qc = document.getElementById("quest-container");
  if (!qc) return;

  // 1) Hole user => familie
  const snapUser = await get(ref(db, "benutzer/" + uid));
  if (!snapUser.exists()) {
    qc.innerHTML = "<p>Benutzer nicht gefunden.</p>";
    return;
  }
  let uData = snapUser.val();
  if (!uData.familie) {
    qc.innerHTML = "<p>Keine Familie vorhanden.</p>";
    return;
  }

  // 2) Lade Quests => "familien/<famID>/quests"
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
  // Hole user => familie
  const userSnap = await get(ref(db, "benutzer/" + uid));
  if (!userSnap.exists()) return;
  let uData = userSnap.val();
  if (!uData.familie) {
    alert("Keine Familie => keine Quests!");
    return;
  }

  // Quests => "familien/<famID>/quests/<qid>"
  const qSnap = await get(ref(db, `familien/${uData.familie}/quests/${qid}`));
  if (!qSnap.exists()) return;
  let quest = qSnap.val();

  let doneC = quest.doneCount || 0;
  let tot   = quest.totalUnits || 1;
  if (doneC >= tot) {
    alert("Quest ist bereits abgeschlossen.");
    return;
  }

  let rest = tot - doneC;
  let howManyStr = prompt(`Wie viele Einheiten von '${quest.name}' möchtest du abschließen?\n(Verbleibend: ${rest})`);
  if (!howManyStr) return;
  let howMany = parseInt(howManyStr, 10);
  if (isNaN(howMany) || howMany <= 0) return alert("Ungültige Eingabe.");

  if (howMany > rest) howMany = rest;

  let gainedXP = (quest.xpPerUnit || 0) * howMany;
  let newXP    = (uData.xp || 0) + gainedXP;
  let level    = uData.level || 1;

  let xpNeed   = xpNeededForLevel(level);
  let leveledUp= false;
  while (newXP >= xpNeed) {
    newXP -= xpNeed;
    level++;
    xpNeed = xpNeededForLevel(level);
    leveledUp = true;
  }

  let newDone = doneC + howMany;

  let updates = {};
  updates[`familien/${uData.familie}/quests/${qid}/doneCount`] = newDone;
  updates[`benutzer/${uid}/xp`]      = newXP;
  updates[`benutzer/${uid}/level`]   = level;

  await update(ref(db), updates);

  updateXPBar({ xp:newXP, level:level });
  if (leveledUp) {
    playLevelUpAnimation();
  }

  await ladeBenutzerdaten();
}

// =============== ADMIN: QUESTS (familienbasiert) ===============
window.adminQuestAnlegen = async function() {
  const qName = document.getElementById("quest-name").value;
  const qXP   = parseInt(document.getElementById("quest-xp").value, 10);
  const qTot  = parseInt(document.getElementById("quest-totalunits").value, 10);

  if (!qName || isNaN(qXP) || isNaN(qTot)) {
    alert("Bitte Name, XP und Anzahl angeben!");
    return;
  }

  const user = auth.currentUser;
  if (!user) return;
  const snap = await get(ref(db, "benutzer/" + user.uid));
  if (!snap.exists()) return;
  let uData = snap.val();
  if (!uData.isAdmin) {
    alert("Nur Admin darf Quests anlegen!");
    return;
  }
  if (!uData.familie) {
    alert("Keine Familie => keine Quests!");
    return;
  }

  const newK = push(ref(db, `familien/${uData.familie}/quests`)).key;
  await set(ref(db, `familien/${uData.familie}/quests/${newK}`), {
    name: qName,
    xpPerUnit: qXP,
    totalUnits: qTot,
    doneCount: 0
  });

  alert("Quest angelegt!");
  adminQuestListeLaden();

  if (user) {
    ladeQuests(user.uid);
  }
};

async function adminQuestListeLaden() {
  const ul= document.getElementById("admin-quests-liste");
  if (!ul) return;
  ul.innerHTML="";

  const user = auth.currentUser;
  if (!user) return;
  const snapU= await get(ref(db, "benutzer/" + user.uid));
  if (!snapU.exists()) return;
  let uData = snapU.val();
  if (!uData.familie) {
    ul.innerHTML="<li>Keine Familie => keine Quests.</li>";
    return;
  }

  const snap= await get(ref(db, `familien/${uData.familie}/quests`));
  if(!snap.exists()){
    ul.innerHTML="<li>Keine Quests in dieser Familie.</li>";
    return;
  }
  let qObj= snap.val();
  Object.keys(qObj).forEach(qKey => {
    let q= qObj[qKey];
    let dc= q.doneCount || 0;
    let tot= q.totalUnits || 1;

    let li= document.createElement("li");
    li.textContent = `${q.name} (XP:${q.xpPerUnit}, Fortschritt:${dc}/${tot})`;

    let btn= document.createElement("button");
    btn.textContent="Löschen";
    btn.onclick= ()=> adminQuestLoeschen(qKey);

    li.appendChild(btn);
    ul.appendChild(li);
  });
}

async function adminQuestLoeschen(qKey) {
  if(!confirm("Quest wirklich löschen?")) return;

  const user = auth.currentUser;
  if (!user) return;
  const snapU= await get(ref(db, "benutzer/" + user.uid));
  if (!snapU.exists()) return;
  let uData = snapU.val();
  if (!uData.familie) {
    alert("Keine Familie => keine Quests!");
    return;
  }

  await remove(ref(db, `familien/${uData.familie}/quests/${qKey}`));
  alert("Quest gelöscht!");
  adminQuestListeLaden();
}

window.adminQuestsAlleLoeschen = async function() {
  if(!confirm("Wirklich ALLE Quests löschen?")) return;

  const user = auth.currentUser;
  if (!user) return;
  const snapU= await get(ref(db, "benutzer/"+user.uid));
  if(!snapU.exists()) return;
  let uData= snapU.val();
  if(!uData.familie) return;

  await remove(ref(db, `familien/${uData.familie}/quests`));
  alert("Alle Quests in dieser Familie gelöscht!");
  adminQuestListeLaden();
};

// ----------------------------------------
// ADMIN: ZAUBER (familienbasiert)
// ----------------------------------------

async function adminZauberListeLaden() {
  const ul= document.getElementById("admin-zauber-liste");
  if (!ul) return;
  ul.innerHTML="";

  const user= auth.currentUser;
  if(!user) return;
  const snapU= await get(ref(db, "benutzer/"+user.uid));
  if(!snapU.exists()) return;
  let uData= snapU.val();
  if(!uData.familie) {
    ul.innerHTML="<li>Keine Familie => keine Zauber.</li>";
    return;
  }

  const snap= await get(ref(db, `familien/${uData.familie}/zauber`));
  if(!snap.exists()){
    ul.innerHTML="<li>Keine Zauber in dieser Familie.</li>";
    return;
  }
  let zObj= snap.val();
  Object.keys(zObj).forEach(k => {
    let z = zObj[k];
    let li= document.createElement("li");
    li.textContent= `${z.name} (Typ:${z.typ}, Wert:${z.wert}, Kosten:${z.kostenMP} MP)`;

    let btn= document.createElement("button");
    btn.textContent="Löschen";
    btn.onclick= ()=> adminZauberLoeschen(k);

    li.appendChild(btn);
    ul.appendChild(li);
  });
}

window.adminZauberAnlegen = async function() {
  const zName= document.getElementById("zauber-name").value;
  const zTyp=  document.getElementById("zauber-typ").value;
  const zWert= parseInt(document.getElementById("zauber-wert").value,10);
  const zCost= parseInt(document.getElementById("zauber-kosten").value,10);

  if (!zName || isNaN(zWert) || isNaN(zCost)) {
    alert("Bitte Name, Typ, Wert, Kosten angeben!");
    return;
  }

  const user= auth.currentUser;
  if(!user) return;
  const snapU= await get(ref(db, "benutzer/"+user.uid));
  if(!snapU.exists()) return;
  let uData= snapU.val();
  if(!uData.isAdmin) {
    alert("Nur Admin darf Zauber anlegen!");
    return;
  }
  if(!uData.familie) {
    alert("Keine Familie => keine Zauber!");
    return;
  }

  const newKey= push(ref(db, `familien/${uData.familie}/zauber`)).key;
  await set(ref(db, `familien/${uData.familie}/zauber/${newKey}`), {
    name: zName,
    typ: zTyp,
    wert: zWert,
    kostenMP: zCost
  });

  alert("Zauber angelegt!");
  adminZauberListeLaden();
};

async function adminZauberLoeschen(k) {
  if (!confirm("Zauber wirklich löschen?")) return;

  const user= auth.currentUser;
  if(!user) return;
  const snapU= await get(ref(db, "benutzer/"+user.uid));
  if(!snapU.exists()) return;
  let uData= snapU.val();
  if(!uData.familie) return;

  await remove(ref(db, `familien/${uData.familie}/zauber/${k}`));
  alert("Zauber gelöscht!");
  adminZauberListeLaden();
}

// ----------------------------------------
// ADMIN: SPEZIAL (familienbasiert)
// ----------------------------------------

async function adminSpezialListeLaden() {
  const ul= document.getElementById("admin-spezial-liste");
  if(!ul) return;
  ul.innerHTML="";

  const user= auth.currentUser;
  if(!user) return;
  const snapU= await get(ref(db, "benutzer/"+user.uid));
  if(!snapU.exists()) return;
  let uData= snapU.val();
  if(!uData.familie) {
    ul.innerHTML="<li>Keine Familie => keine Spezialfähigkeiten.</li>";
    return;
  }

  const snap= await get(ref(db, `familien/${uData.familie}/spezial`));
  if(!snap.exists()){
    ul.innerHTML="<li>Keine Spezialfähigkeiten in dieser Familie.</li>";
    return;
  }
  let sObj= snap.val();
  Object.keys(sObj).forEach(sk=>{
    let s= sObj[sk];
    let li= document.createElement("li");
    li.textContent=`${s.name} (Kosten:${s.kostenLevel||0} Lvl, Chance:${s.chance||100}%, Cooldown:${s.cooldown||0}d)`;

    let btn= document.createElement("button");
    btn.textContent="Löschen";
    btn.onclick= ()=> adminSpezialLoeschen(sk);

    li.appendChild(btn);
    ul.appendChild(li);
  });
}

window.adminSpezialAnlegen= async function() {
  const sName  = document.getElementById("spezial-name").value.trim();
  const sKosten= parseInt(document.getElementById("spezial-kosten").value,10);
  const sChance= parseInt(document.getElementById("spezial-chance").value,10);
  const sCd    = parseInt(document.getElementById("spezial-cooldown").value,10);

  if (!sName || isNaN(sKosten) || isNaN(sChance) || isNaN(sCd)) {
    alert("Bitte Name, Kosten, Chance, Cooldown angeben!");
    return;
  }

  const user= auth.currentUser;
  if(!user) return;
  const snapU= await get(ref(db, "benutzer/"+user.uid));
  if(!snapU.exists()) return;
  let uData= snapU.val();
  if(!uData.isAdmin) {
    alert("Nur Admin darf Spezialfähigkeiten anlegen!");
    return;
  }
  if(!uData.familie) {
    alert("Keine Familie => keine Spezialfähigkeiten!");
    return;
  }

  const newKey= push(ref(db, `familien/${uData.familie}/spezial`)).key;
  await set(ref(db, `familien/${uData.familie}/spezial/${newKey}`), {
    name: sName,
    kostenLevel: sKosten,
    chance: sChance,
    cooldown: sCd
  });

  alert("Spezialfähigkeit angelegt!");
  adminSpezialListeLaden();
};

async function adminSpezialLoeschen(sk) {
  if(!confirm("Wirklich löschen?")) return;

  const user= auth.currentUser;
  if(!user) return;
  const snapU= await get(ref(db, "benutzer/"+user.uid));
  if(!snapU.exists()) return;
  let uData= snapU.val();
  if(!uData.familie) return;

  await remove(ref(db, `familien/${uData.familie}/spezial/${sk}`));
  alert("Spezialfähigkeit gelöscht!");
  adminSpezialListeLaden();
}

// ----------------------------------------
// AVATAR & NAME
// ----------------------------------------

window.zeigeAvatarEinstellungen= async function() {
  const user= auth.currentUser;
  if (!user) return;
  const snap= await get(ref(db, "benutzer/"+user.uid));
  if (!snap.exists()) return;

  let ud= snap.val();

  const pImg= document.getElementById("avatar-preview");
  const nInp= document.getElementById("namen-input");
  const sel= document.getElementById("avatar-auswahl");
  if (!pImg|| !nInp|| !sel) return;

  nInp.value= ud.name || "";
  pImg.src= ud.avatarURL || "avatars/avatar1.png";

  const avList= [
    "avatars/avatar1.png","avatars/avatar2.png","avatars/avatar3.png",
    "avatars/avatar4.png","avatars/avatar5.png","avatars/avatar6.png",
    "avatars/avatar7.png","avatars/avatar8.png","avatars/avatar9.png",
    "avatars/avatar10.png"
  ];
  sel.innerHTML="";
  avList.forEach(a => {
    let opt= document.createElement("option");
    opt.value=a;
    opt.textContent= a.split("/").pop();
    sel.appendChild(opt);
  });
  sel.value= ud.avatarURL||"avatars/avatar1.png";
  sel.onchange= ()=> pImg.src= sel.value;
};

window.avatarSpeichern= async function() {
  const user= auth.currentUser;
  if(!user) return;

  const nInp= document.getElementById("namen-input");
  const sel= document.getElementById("avatar-auswahl");
  const aImg= document.getElementById("avatar-anzeige");
  if(!nInp|| !sel|| !aImg) return;

  let newN= nInp.value.trim()|| "Unbekannt";
  let chURL= sel.value|| "avatars/avatar1.png";

  await update(ref(db, "benutzer/"+user.uid), {
    name:newN,
    avatarURL: chURL
  });

  aImg.src= chURL;
  document.getElementById("benutzer-name").textContent= newN;
  alert("Profil aktualisiert!");
};

// ----------------------------------------
// Weitere UI-Funktionen (Video, Admin-Login, Fehlermeldung)
// ----------------------------------------

window.zeigeVideoPopup = function() {
  document.getElementById("video-popup").style.display = "flex";
};

window.schließeVideoPopup = function() {
  document.getElementById("video-popup").style.display = "none";
};

window.zeigeAdminLogin = function() {
  document.getElementById("admin-login-popup").style.display = "flex";
};

window.schließeAdminLogin = function() {
  document.getElementById("admin-login-popup").style.display = "none";
};

window.zeigeFehlerPopup = function() {
  document.getElementById("error-popup").style.display = "flex";
};

window.schließeFehlerPopup = function() {
  document.getElementById("error-popup").style.display = "none";
};

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

// ----------------------------------------
// Tabs (Einstellungen)
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
    adminZauberListeLaden();  // FAMILIENBASIERT
    adminQuestListeLaden();   // FAMILIENBASIERT
    adminSpezialListeLaden(); // FAMILIENBASIERT
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
