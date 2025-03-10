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

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);
const auth= getAuth();

/* ===========================
   LEVEL/XP-Mechanik
=========================== */
/** 
 * Alle 10 Level steigt das XP-Cap um 100 
 * Level 1-9 => 100 XP, 10-19 => 200 XP, etc.
 */
function xpNeededForLevel(level) {
  let block = Math.floor((level-1)/10)+1; 
  return 100 * block;
}
/** Checken, ob user xp >= xpNeeded => level up */
function checkLevelUp(userData) {
  let xp  = userData.xp    || 0;
  let lvl = userData.level || 1;

  let xpNeed = xpNeededForLevel(lvl);
  let changed = false;
  while (xp >= xpNeed) {
    xp -= xpNeed;
    lvl++;
    xpNeed = xpNeededForLevel(lvl);
    changed = true;
  }
  return { newXP: xp, newLevel: lvl };
}
/** Updatet XP-Balken (#xp-bar-inner,#xp-bar-text) */
function updateXPBar(userData) {
  let xp   = userData.xp    || 0;
  let lvl  = userData.level || 1;
  let xpNeed = xpNeededForLevel(lvl);

  let xpBar  = document.getElementById("xp-bar-inner");
  let xpText = document.getElementById("xp-bar-text");
  if (!xpBar || !xpText) return;

  let perc = Math.round((xp/xpNeed)*100);
  xpBar.style.width = Math.min(100, perc)+"%";
  let rest = xpNeed - xp;
  xpText.textContent = `Noch ${rest} XP bis zum nächsten Level`;
}

/* ===========================
   LOGIN/REGISTRIERUNG
=========================== */
document.addEventListener("DOMContentLoaded", ()=> {
  const loginBtn    = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  if (loginBtn) {
    loginBtn.onclick = ()=> {
      if (document.getElementById("login-form"))  document.getElementById("login-form").style.display = "block";
      if (document.getElementById("register-form")) document.getElementById("register-form").style.display = "none";
    };
  }
  if (registerBtn) {
    registerBtn.onclick = ()=> {
      if (document.getElementById("login-form"))    document.getElementById("login-form").style.display = "none";
      if (document.getElementById("register-form")) document.getElementById("register-form").style.display = "block";
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

window.familieErstellen = async function() {
  const famName    = document.getElementById("family-name").value.trim();
  const adminEmail = document.getElementById("admin-email").value.trim();
  const adminPass  = document.getElementById("admin-password").value.trim();
  if (!adminEmail || !adminPass) {
    alert("E-Mail und Passwort erforderlich!");
    return;
  }
  try {
    // User anlegen
    const userCred = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
    const uid = userCred.user.uid;

    if (!famName) {
      // ohne Familie
      await set(ref(db, "benutzer/"+uid), {
        email: adminEmail,
        familie: null,
        isAdmin: false,
        name: adminEmail.split("@")[0],
        level: 1, xp:0, hp:100, mp:100
      });
      alert("Registrierung erfolgreich (ohne Familie)!");
      window.location.href = "dashboard.html";
      return;
    } else {
      // Familie-Check
      const famQ = query(ref(db, "familien"), orderByChild("name"), equalTo(famName));
      const snap = await get(famQ);
      if (snap.exists()) {
        // familie existiert => user=Mitglied
        const data = snap.val();
        const famKey = Object.keys(data)[0];
        await set(ref(db, "benutzer/"+uid), {
          email: adminEmail,
          familie: famKey,
          isAdmin: false,
          name: adminEmail.split("@")[0],
          level:1, xp:0, hp:100, mp:100
        });
        await update(ref(db, "familien/"+famKey+"/mitglieder"), {[uid]:true});
        alert(`Registrierung erfolgreich! Du bist Mitglied der Familie '${famName}'.`);
        window.location.href = "dashboard.html";
      } else {
        // neu => admin
        const famID = Date.now().toString();
        await set(ref(db, "familien/"+famID), {
          name: famName,
          admin: adminEmail,
          mitglieder: { [uid]: true }
        });
        await set(ref(db, "benutzer/"+uid), {
          email: adminEmail,
          familie: famID,
          isAdmin: true,
          name: adminEmail.split("@")[0],
          level:1, xp:0, hp:100, mp:100
        });
        alert(`Neue Familie '${famName}' erstellt! Du bist Admin.`);
        window.location.href = "dashboard.html";
      }
    }
  } catch(e) {
    alert(e.message);
  }
};

window.ausloggen = async function() {
  try {
    await signOut(auth);
    window.location.href="index.html";
  } catch(e) {
    console.error(e);
  }
};

/* ===========================
   ON AUTH STATE
=========================== */
onAuthStateChanged(auth, (user)=> {
  if (user && window.location.href.includes("dashboard.html")) {
    ladeBenutzerdaten();
  } else if(!user && window.location.href.includes("dashboard.html")){
    window.location.href="index.html";
  }
});

/* ===========================
   TÄGLICHE REGENERATION
=========================== */
async function checkeTäglicheRegen(uid) {
  const today = new Date().toISOString().split("T")[0];
  const snap = await get(ref(db, "benutzer/"+uid));
  if (!snap.exists()) return;
  let uData = snap.val();

  if (uData.lastDailyRegen===today) return;

  let level = uData.level||1;
  let hp    = uData.hp   ||100;
  let mp    = uData.mp   ||100;

  let maxHP = 100 + Math.floor((level-1)/10)*100;
  let maxMP = 100 + Math.floor((level-1)/10)*50;

  let newHP = Math.min(maxHP, hp+ Math.floor(maxHP*0.1));
  let newMP = Math.min(maxMP, mp+ Math.floor(maxMP*0.1));

  await update(ref(db, "benutzer/"+uid), {
    hp: newHP,
    mp: newMP,
    lastDailyRegen: today
  });
}

/* ===========================
   LADE BENUTZERDATEN
=========================== */
async function ladeBenutzerdaten() {
  const user = auth.currentUser;
  if (!user) return;

  const snap = await get(ref(db, "benutzer/"+user.uid));
  if(!snap.exists()) return;
  let userData = snap.val();

  // Tägliche Regeneration
  await checkeTäglicheRegen(user.uid);

  // Check Level
  let result = checkLevelUp(userData);
  if (result.newLevel!== userData.level || result.newXP!== userData.xp) {
    await update(ref(db,"benutzer/"+user.uid), {
      level: result.newLevel,
      xp: result.newXP
    });
    userData.level = result.newLevel;
    userData.xp    = result.newXP;
  }

  // Avatar, Name
  document.getElementById("avatar-anzeige").src = userData.avatarURL || "avatars/avatar1.png";
  document.getElementById("benutzer-name").textContent = userData.name || userData.email;

  // XP-Bar
  updateXPBar(userData);

  // Familie?
  if (userData.familie) {
    const famSnap = await get(ref(db, "familien/"+ userData.familie));
    if(famSnap.exists()) {
      let famData = famSnap.val();
      document.getElementById("familien-name").textContent = famData.name;
      document.getElementById("admin-email").textContent   = famData.admin;
    }
    await zeigeFamilienMitglieder(userData.familie);
  } else {
    document.getElementById("familien-name").textContent = "Keine";
    document.getElementById("admin-email").textContent    = userData.isAdmin?userData.email:"-";
    await zeigeAlleNutzer();
  }

  // Zauber, Ziel, Logs, Quests
  await ladeZauberListe();
  await ladeZielListe();
  ladeLogsInTabelle();
  ladeQuests(user.uid);
}

/* ===========================
   SPIELER-KARTEN
=========================== */
async function zeigeFamilienMitglieder(famID){
  const fSnap = await get(ref(db,"familien/"+famID+"/mitglieder"));
  if(!fSnap.exists()) return;
  let memObj = fSnap.val();
  const container = document.getElementById("player-cards-container");
  if(!container) return;
  container.innerHTML="";

  for(let uid in memObj){
    const uSnap = await get(ref(db,"benutzer/"+uid));
    if(!uSnap.exists()) continue;
    let uData = uSnap.val();

    let maxHP = 100 + Math.floor((uData.level-1)/10)*100;
    let maxMP = 100 + Math.floor((uData.level-1)/10)*50;

    let hpPerc = Math.round((uData.hp||0)/maxHP*100);
    let mpPerc = Math.round((uData.mp||0)/maxMP*100);

    let card = document.createElement("div");
    card.className="player-card";
    card.innerHTML=`
      <img src="${uData.avatarURL||'avatars/avatar1.png'}" alt="Avatar">
      <h3>${uData.name}</h3>
      <div class="player-level">Level: ${uData.level||1}</div>
      <div>
        <div class="bar-outer">
          <div class="bar-inner hp" style="width:${hpPerc}%;"></div>
        </div>
        <span class="bar-text">${uData.hp||0}/${maxHP} HP</span>
      </div>
      <div>
        <div class="bar-outer">
          <div class="bar-inner mp" style="width:${mpPerc}%;"></div>
        </div>
        <span class="bar-text">${uData.mp||0}/${maxMP} MP</span>
      </div>
    `;
    container.appendChild(card);
  }
}

async function zeigeAlleNutzer(){
  const snap = await get(ref(db,"benutzer"));
  if(!snap.exists()) return;
  const container= document.getElementById("player-cards-container");
  if(!container) return;
  container.innerHTML="";

  let allUsers = snap.val();
  for(let uid in allUsers){
    let uData= allUsers[uid];

    let maxHP= 100 + Math.floor((uData.level-1)/10)*100;
    let maxMP= 100 + Math.floor((uData.level-1)/10)*50;

    let hpPerc= Math.round((uData.hp||0)/maxHP*100);
    let mpPerc= Math.round((uData.mp||0)/maxMP*100);

    let card= document.createElement("div");
    card.className="player-card";
    card.innerHTML=`
      <img src="${uData.avatarURL||'avatars/avatar1.png'}" alt="Avatar">
      <h3>${uData.name}</h3>
      <div class="player-level">Level: ${uData.level||1}</div>
      <div>
        <div class="bar-outer">
          <div class="bar-inner hp" style="width:${hpPerc}%;"></div>
        </div>
        <span class="bar-text">${uData.hp||0}/${maxHP} HP</span>
      </div>
      <div>
        <div class="bar-outer">
          <div class="bar-inner mp" style="width:${mpPerc}%;"></div>
        </div>
        <span class="bar-text">${uData.mp||0}/${maxMP} MP</span>
      </div>
    `;
    container.appendChild(card);
  }
}

/* ===========================
   ZAUBER & ANGRIFF
=========================== */
async function ladeZauberListe(){
  // Normales <select id="zauber-auswahl"> existiert
  const sel = document.getElementById("zauber-auswahl");
  if(!sel) return;
  sel.innerHTML="";

  const snap= await get(ref(db,"zauber"));
  if(!snap.exists()) return;
  let zObj= snap.val();
  Object.keys(zObj).forEach(k=>{
    let z= zObj[k];
    let opt= document.createElement("option");
    opt.value= k;
    opt.textContent=`${z.name} (Kosten:${z.kostenMP||0}MP)`;
    sel.appendChild(opt);
  });
}

async function ladeZielListe(){
  const user= auth.currentUser;
  if(!user) return;
  const snap= await get(ref(db,"benutzer/"+user.uid));
  if(!snap.exists()) return;
  let uData= snap.val();

  const sel= document.getElementById("zauber-ziel");
  if(!sel) return;
  sel.innerHTML="";

  if(uData.familie){
    const famSnap= await get(ref(db,"familien/"+uData.familie+"/mitglieder"));
    if(!famSnap.exists()) return;
    let memObj= famSnap.val();
    for(let uid in memObj){
      if(uid===user.uid) continue;
      let bsnap= await get(ref(db,"benutzer/"+uid));
      if(!bsnap.exists()) continue;
      let bd= bsnap.val();

      let opt= document.createElement("option");
      opt.value= uid;
      opt.textContent= bd.name;
      sel.appendChild(opt);
    }
  }
}

window.zauberWirkenHandler= async function(){
  const zielVal= document.getElementById("zauber-ziel").value;
  const zauberKey= document.getElementById("zauber-auswahl").value;
  if(!zielVal) {
    alert("Kein Ziel gewählt!");
    return;
  }
  await wirkeZauber(zielVal, zauberKey);
};

/** wirkeZauber, Log nur => actionType="zauber" */
async function wirkeZauber(zielID, zauberKey){
  const user= auth.currentUser;
  if(!user) return;

  const zSnap= await get(ref(db,"zauber/"+zauberKey));
  if(!zSnap.exists()){
    alert("Zauber existiert nicht!");
    return;
  }
  let zauber= zSnap.val();

  const casterSnap= await get(ref(db,"benutzer/"+user.uid));
  if(!casterSnap.exists()){
    alert("Caster nicht gefunden!");
    return;
  }
  let caster= casterSnap.val();

  if((caster.mp||0)< (zauber.kostenMP||0)){
    alert("Nicht genug MP!");
    return;
  }
  const zielSnap= await get(ref(db,"benutzer/"+zielID));
  if(!zielSnap.exists()){
    alert("Ziel nicht gefunden!");
    return;
  }
  let ziel= zielSnap.val();

  let updates={};
  // MP abziehen
  updates[`benutzer/${user.uid}/mp`] = Math.max(0, (caster.mp||0)- (zauber.kostenMP||0));

  if(zauber.typ==="heilen"){
    let maxHP= 100 + Math.floor((ziel.level-1)/10)*100;
    let newHP= Math.min(maxHP, (ziel.hp||0)+ zauber.wert);
    updates[`benutzer/${zielID}/hp`] = newHP;
  } else if(zauber.typ==="schaden"){
    let newHP= Math.max(0, (ziel.hp||0)- zauber.wert);
    updates[`benutzer/${zielID}/hp`] = newHP;
    if(newHP<=0){
      let newLvl= Math.max(1, (ziel.level||1)-1);
      let respawnHP= 100 + Math.floor((newLvl-1)/10)*100;
      updates[`benutzer/${zielID}/level`] = newLvl;
      updates[`benutzer/${zielID}/hp`]    = respawnHP;
    }
  }
  await update(ref(db), updates);

  // Log => publicLogs mit actionType="zauber"
  await push(ref(db,"publicLogs"), {
    timestamp: Date.now(),
    caster: user.uid,
    target: zielID,
    actionType: "zauber",
    zauber: zauber.name,
    typ: zauber.typ,
    wert: zauber.wert,
    kosten: zauber.kostenMP||0
  });
  alert(`Zauber '${zauber.name}' gewirkt!`);
}

/* ===========================
   LOGS 
   => Nur actionType=="zauber"/"spezial" 
=========================== */
function ladeLogsInTabelle(){
  const tb= document.getElementById("log-table-body");
  if(!tb) return;
  onValue(ref(db,"publicLogs"), (snap)=>{
    tb.innerHTML="";
    if(!snap.exists()) return;
    let logs= snap.val();
    let keys= Object.keys(logs).sort((a,b)=> logs[b].timestamp - logs[a].timestamp);
    keys.forEach(k=>{
      let l= logs[k];
      // "quest" => skip
      if(l.actionType==="quest") return; 
      // Nur zauber/spezial 
      let tr= document.createElement("tr");

      let tdDate= document.createElement("td");
      tdDate.textContent= new Date(l.timestamp).toLocaleString();

      let tdUser= document.createElement("td");
      tdUser.textContent= l.caster|| l.user || "--";

      let tdZiel= document.createElement("td");
      tdZiel.textContent= l.target|| "-";

      let tdFaeh= document.createElement("td");
      tdFaeh.textContent= `${l.zauber|| l.name} (Typ: ${l.typ||'??'}, Wert: ${l.wert||0}, Kosten: ${l.kosten||0})`;

      tr.appendChild(tdDate);
      tr.appendChild(tdUser);
      tr.appendChild(tdZiel);
      tr.appendChild(tdFaeh);

      tb.appendChild(tr);
    });
  });
}

/* ===========================
   QUests 
   => Keine Logs 
   => Prompt nach Einheiten
=========================== */
async function ladeQuests(uid){
  const qC= document.getElementById("quest-container");
  if(!qC) return;
  const snap= await get(ref(db,"quests"));
  if(!snap.exists()){
    qC.innerHTML="<p>Keine Quests vorhanden.</p>";
    return;
  }
  let qObj= snap.val();
  qC.innerHTML="";

  Object.keys(qObj).forEach(qid=>{
    let quest= qObj[qid];
    let doneC= quest.doneCount||0;
    let tot= quest.totalUnits||1;

    let isFertig= (doneC>=tot);
    let questName= isFertig? `<s>${quest.name}</s>`: quest.name;

    let div= document.createElement("div");
    div.className="quest-box";
    div.innerHTML=`
      <div>
        <strong>${questName}</strong><br>
        Fortschritt: ${doneC}/${tot}
        <small>(${quest.xpPerUnit||0} XP pro Einheit)</small>
      </div>
    `;
    if(!isFertig){
      // Button
      let btn= document.createElement("button");
      btn.textContent="Erledigt";
      btn.onclick= ()=> questAbschliessen(qid,uid);
      div.appendChild(btn);
    } else {
      let span= document.createElement("span");
      span.style.color="lime";
      span.textContent="Abgeschlossen!";
      div.appendChild(span);
    }
    qC.appendChild(div);
  });
}

async function questAbschliessen(qid, uid){
  // prompt => wie viele Einheiten?
  const qSnap= await get(ref(db,"quests/"+qid));
  if(!qSnap.exists()) return;
  let quest= qSnap.val();

  let doneC= quest.doneCount||0;
  let tot= quest.totalUnits||1;
  if(doneC>=tot){
    alert("Quest ist schon abgeschlossen.");
    return;
  }
  let rest= tot- doneC;
  let input= prompt(`Wie viele Einheiten von '${quest.name}' möchtest du abschließen?\n(Verbleibend: ${rest})`);
  if(!input) return;
  let anzahl= parseInt(input,10);
  if(isNaN(anzahl)|| anzahl<=0) return alert("Ungültige Eingabe.");

  if(anzahl> rest) anzahl= rest; // max=rest
  // XP
  const userSnap= await get(ref(db,"benutzer/"+uid));
  if(!userSnap.exists()) return;
  let userData= userSnap.val();

  let gainedXP= (quest.xpPerUnit||0)* anzahl;
  let newXP= (userData.xp||0)+ gainedXP;
  let lvl= userData.level||1;

  // level-check
  let xpNeed= xpNeededForLevel(lvl);
  while(newXP>= xpNeed){
    newXP -= xpNeed;
    lvl++;
    xpNeed= xpNeededForLevel(lvl);
  }

  let newDone= doneC+ anzahl;
  let updates={};
  updates[`benutzer/${uid}/xp`]   = newXP;
  updates[`benutzer/${uid}/level`]= lvl;
  updates[`quests/${qid}/doneCount`]= newDone;

  await update(ref(db), updates);

  // XP-Bar 
  updateXPBar({ xp:newXP, level:lvl });

  // Kein Alert (außer invalid)
  // => neu laden
  ladeQuests(uid);
}

/* ===========================
   ADMIN: ALLE Quests löschen
=========================== */
window.adminQuestsAlleLoeschen= async function(){
  if(!confirm("Wirklich ALLE Quests löschen?")) return;
  await update(ref(db, "quests"), null);
  adminQuestListeLaden();
  alert("Alle Quests gelöscht!");
};

/* ===========================
   EINSTELLUNGEN-FENSTER (TABS)
=========================== */
window.oeffneEinstellungen= async function(){
  const s= document.getElementById("einstellungen-section");
  if(!s) return;
  s.style.display="block";
  switchTab("tab-profile");

  const user= auth.currentUser;
  if(!user) return;
  const snap= await get(ref(db,"benutzer/"+user.uid));
  if(!snap.exists()) return;
  let uData= snap.val();

  // Admin-check => show/hide tabs
  const tZ= document.querySelector("[data-tab='tab-zauber']");
  const tQ= document.querySelector("[data-tab='tab-quests']");
  const tS= document.querySelector("[data-tab='tab-spezial']");
  if(uData.isAdmin){
    tZ.style.display="inline-block";
    tQ.style.display="inline-block";
    tS.style.display="inline-block";
    adminZauberListeLaden();
    adminQuestListeLaden();
    adminSpezialListeLaden();
  } else {
    tZ.style.display="none";
    tQ.style.display="none";
    tS.style.display="none";
  }
  await zeigeAvatarEinstellungen();
};

window.schliesseEinstellungen= function(){
  const s= document.getElementById("einstellungen-section");
  if(s) s.style.display="none";
};

function switchTab(tabId){
  document.querySelectorAll(".tab-content").forEach(tc=> tc.style.display="none");
  const target= document.getElementById(tabId);
  if(target) target.style.display="block";
}

document.addEventListener("click",(e)=>{
  if(e.target.classList.contains("tab-btn")){
    let t= e.target.getAttribute("data-tab");
    switchTab(t);
  }
});

/* ===========================
   ADMIN-FUNKTIONEN: ZAUBER
=========================== */
async function adminZauberListeLaden(){
  const ul= document.getElementById("admin-zauber-liste");
  if(!ul) return;
  ul.innerHTML="";

  const snap= await get(ref(db,"zauber"));
  if(!snap.exists()){
    ul.innerHTML="<li>Keine Zauber vorhanden.</li>";
    return;
  }
  let zObj= snap.val();
  Object.keys(zObj).forEach(k=>{
    let z= zObj[k];
    let li= document.createElement("li");
    li.textContent= `${z.name} (Typ:${z.typ}, Wert:${z.wert}, Kosten:${z.kostenMP}MP)`;
    let btn= document.createElement("button");
    btn.textContent="Löschen";
    btn.onclick= ()=> adminZauberLoeschen(k);
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

window.adminZauberAnlegen= async function(){
  const name= document.getElementById("zauber-name").value;
  const typ=  document.getElementById("zauber-typ").value;
  const wert= parseInt(document.getElementById("zauber-wert").value,10);
  const cost= parseInt(document.getElementById("zauber-kosten").value,10);
  if(!name|| isNaN(wert)|| isNaN(cost)){
    alert("Bitte Name, Typ, Wert, Kosten angeben!");
    return;
  }
  const newKey= push(ref(db,"zauber")).key;
  await set(ref(db,"zauber/"+newKey), {
    name:name, typ:typ, wert:wert, kostenMP: cost
  });
  alert("Zauber angelegt!");
  adminZauberListeLaden();
};

async function adminZauberLoeschen(k){
  if(!confirm("Zauber wirklich löschen?")) return;
  await update(ref(db,"zauber/"+k), null);
  adminZauberListeLaden();
}

/* ===========================
   ADMIN-FUNKTIONEN: QUESTS
=========================== */
async function adminQuestListeLaden(){
  const ul= document.getElementById("admin-quests-liste");
  if(!ul) return;
  ul.innerHTML="";

  const snap= await get(ref(db,"quests"));
  if(!snap.exists()){
    ul.innerHTML="<li>Keine Quests vorhanden.</li>";
    return;
  }
  let qObj= snap.val();
  Object.keys(qObj).forEach(qk=>{
    let q= qObj[qk];
    let li= document.createElement("li");
    let dc= q.doneCount||0;
    let tot= q.totalUnits||1;
    li.textContent= `${q.name} (XP:${q.xpPerUnit}, Fortschritt:${dc}/${tot})`;
    let btn= document.createElement("button");
    btn.textContent="Löschen";
    btn.onclick= ()=> adminQuestLoeschen(qk);
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

window.adminQuestAnlegen= async function(){
  const qName=  document.getElementById("quest-name").value;
  const qXP=    parseInt(document.getElementById("quest-xp").value,10);
  const qUnits= parseInt(document.getElementById("quest-totalunits").value,10);
  if(!qName|| isNaN(qXP)|| isNaN(qUnits)){
    alert("Bitte Name, XP und Anzahl angeben!");
    return;
  }
  const newKey= push(ref(db,"quests")).key;
  await set(ref(db,"quests/"+newKey), {
    name: qName,
    xpPerUnit: qXP,
    totalUnits: qUnits,
    doneCount: 0
  });
  alert("Quest angelegt!");
  adminQuestListeLaden();
};

async function adminQuestLoeschen(qKey){
  if(!confirm("Quest wirklich löschen?")) return;
  await update(ref(db,"quests/"+qKey), null);
  adminQuestListeLaden();
}

window.adminQuestsAlleLoeschen= async function(){
  if(!confirm("Wirklich ALLE Quests löschen?")) return;
  await update(ref(db,"quests"), null);
  alert("Alle Quests gelöscht!");
  adminQuestListeLaden();
};

/* ===========================
   ADMIN-FUNKTIONEN: SPEZIAL
=========================== */
async function adminSpezialListeLaden(){
  const ul= document.getElementById("admin-spezial-liste");
  if(!ul) return;
  ul.innerHTML="";

  const snap= await get(ref(db,"spezial"));
  if(!snap.exists()){
    ul.innerHTML="<li>Keine Spezialfähigkeiten vorhanden.</li>";
    return;
  }
  let sObj= snap.val();
  Object.keys(sObj).forEach(sk=>{
    let s= sObj[sk];
    let li= document.createElement("li");
    li.textContent= `${s.name} (Kosten: ${s.kostenLevel||0} Level)`;
    let btn= document.createElement("button");
    btn.textContent="Löschen";
    btn.onclick= ()=> adminSpezialLoeschen(sk);
    li.appendChild(btn);
    ul.appendChild(li);
  });
}

window.adminSpezialAnlegen= async function(){
  const sName=   document.getElementById("spezial-name").value;
  const sKosten= parseInt(document.getElementById("spezial-kosten").value,10);
  if(!sName|| isNaN(sKosten)){
    alert("Bitte Name & Kosten angeben!");
    return;
  }
  const newKey= push(ref(db,"spezial")).key;
  await set(ref(db,"spezial/"+newKey), {
    name: sName,
    kostenLevel: sKosten
  });
  alert("Spezialfähigkeit angelegt!");
  adminSpezialListeLaden();
};

async function adminSpezialLoeschen(sk){
  if(!confirm("Wirklich löschen?")) return;
  await update(ref(db,"spezial/"+sk), null);
  adminSpezialListeLaden();
}

/* ===========================
   AVATAR & NAME ÄNDERN
=========================== */
window.zeigeAvatarEinstellungen= async function(){
  const user= auth.currentUser;
  if(!user) return;
  const snap= await get(ref(db, "benutzer/"+user.uid));
  if(!snap.exists()) return;

  let uData= snap.val();
  const pImg= document.getElementById("avatar-preview");
  const nInput= document.getElementById("namen-input");
  const sel= document.getElementById("avatar-auswahl");
  if(!pImg|| !nInput|| !sel) return;

  nInput.value= uData.name||"";
  pImg.src= uData.avatarURL||"avatars/avatar1.png";

  const avatarList= [
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
  sel.innerHTML="";
  avatarList.forEach(a=>{
    let opt= document.createElement("option");
    opt.value=a;
    opt.textContent= a.split("/").pop();
    sel.appendChild(opt);
  });
  sel.value= uData.avatarURL||"avatars/avatar1.png";
  sel.onchange=()=> { pImg.src= sel.value; };
};

window.avatarSpeichern= async function(){
  const user= auth.currentUser;
  if(!user) return;
  const nInput= document.getElementById("namen-input");
  const sel= document.getElementById("avatar-auswahl");
  const aImg= document.getElementById("avatar-anzeige");

  if(!nInput|| !sel|| !aImg) return;
  let newName= nInput.value.trim()||"Unbekannt";
  let chosenURL= sel.value||"avatars/avatar1.png";

  await update(ref(db,"benutzer/"+user.uid), {
    name: newName,
    avatarURL: chosenURL
  });
  aImg.src= chosenURL;
  document.getElementById("benutzer-name").textContent= newName;

  alert("Profil aktualisiert!");
};

window.schliesseEinstellungen= function(){
  const s= document.getElementById("einstellungen-section");
  if(s) s.style.display="none";
};

/* ===========================
   ZAUBER-POPUP / SPEZIAL-POPUP
=========================== */
window.zeigeZauberPopup= async function(){
  const pop= document.getElementById("popup-zauber");
  if(!pop) return;
  pop.style.display="flex";

  // Ziel-liste
  const user= auth.currentUser;
  if(!user) return;

  let familyID= null;
  const usnap= await get(ref(db,"benutzer/"+user.uid));
  if(usnap.exists()) familyID= usnap.val().familie||null;

  const selTarget= document.getElementById("zauber-ziel-popup");
  const selZauber= document.getElementById("zauber-liste-popup");
  if(!selTarget|| !selZauber) return;
  selTarget.innerHTML="";
  selZauber.innerHTML="";

  // Familie -> mitglieder
  if(familyID){
    const famSnap= await get(ref(db,"familien/"+familyID+"/mitglieder"));
    if(famSnap.exists()){
      let memObj= famSnap.val();
      for(let uid in memObj){
        if(uid===user.uid) continue; 
        const bsn= await get(ref(db,"benutzer/"+uid));
        if(!bsn.exists()) continue;
        let bd= bsn.val();
        let opt= document.createElement("option");
        opt.value= uid;
        opt.textContent= bd.name;
        selTarget.appendChild(opt);
      }
    }
  }
  // Zauber-liste
  const zSnap= await get(ref(db,"zauber"));
  if(zSnap.exists()){
    let zObj= zSnap.val();
    Object.keys(zObj).forEach(k=>{
      let z= zObj[k];
      let opt= document.createElement("option");
      opt.value= k;
      opt.textContent= `${z.name} (Kosten:${z.kostenMP||0}MP)`;
      selZauber.appendChild(opt);
    });
  }
};

window.closeZauberPopup= function(){
  const pop= document.getElementById("popup-zauber");
  if(pop) pop.style.display="none";
};

window.popupZauberWirken= async function(){
  const selTarget= document.getElementById("zauber-ziel-popup");
  const selZauber= document.getElementById("zauber-liste-popup");
  if(!selTarget|| !selZauber) return;
  let zielID= selTarget.value;
  let zauberKey= selZauber.value;
  await wirkeZauber(zielID, zauberKey);
  closeZauberPopup();
};

window.zeigeSpezialPopup= async function(){
  const pop= document.getElementById("popup-spezial");
  if(!pop) return;
  pop.style.display="flex";

  // familie -> ziele
  const user= auth.currentUser;
  if(!user) return;

  const usnap= await get(ref(db,"benutzer/"+user.uid));
  if(!usnap.exists()) return;
  let famID= usnap.val().familie||null;

  const selTarget= document.getElementById("spezial-ziel-popup");
  const selSpec  = document.getElementById("spezial-liste-popup");
  if(!selTarget|| !selSpec) return;

  selTarget.innerHTML="";
  selSpec.innerHTML="";

  if(famID){
    const famSnap= await get(ref(db,"familien/"+famID+"/mitglieder"));
    if(famSnap.exists()){
      let memObj= famSnap.val();
      for(let uid in memObj){
        if(uid===user.uid) continue;
        const bsn= await get(ref(db,"benutzer/"+uid));
        if(!bsn.exists()) continue;
        let bd= bsn.val();
        let opt= document.createElement("option");
        opt.value= uid;
        opt.textContent= bd.name;
        selTarget.appendChild(opt);
      }
    }
  }
  // speziel-liste
  const spSnap= await get(ref(db,"spezial"));
  if(spSnap.exists()){
    let spObj= spSnap.val();
    Object.keys(spObj).forEach(k=>{
      let s= spObj[k];
      let opt= document.createElement("option");
      opt.value= k;
      opt.textContent= `${s.name} (Kosten: ${s.kostenLevel||0} Lvl)`;
      selSpec.appendChild(opt);
    });
  }
};

window.closeSpezialPopup= function(){
  const pop= document.getElementById("popup-spezial");
  if(pop) pop.style.display="none";
};

window.popupSpezialWirken= async function(){
  const selTarget= document.getElementById("spezial-ziel-popup");
  const selSpec  = document.getElementById("spezial-liste-popup");
  if(!selTarget|| !selSpec) return;

  let zielID= selTarget.value;
  let spKey = selSpec.value;

  const user= auth.currentUser;
  if(!user) return;

  // hole caster, special
  const casterSnap= await get(ref(db,"benutzer/"+user.uid));
  if(!casterSnap.exists()) return alert("Deine Daten nicht gefunden!");
  let caster= casterSnap.val();

  const spSnap= await get(ref(db,"spezial/"+spKey));
  if(!spSnap.exists()) return alert("Spezialfähigkeit existiert nicht!");
  let sp= spSnap.val();

  // check Level-Kosten
  if((caster.level||1)<(sp.kostenLevel||0)){
    alert(`Nicht genug Level! Benötigt: ${sp.kostenLevel||0}`);
    return;
  }

  // Ziel
  const zielSnap= await get(ref(db,"benutzer/"+zielID));
  if(!zielSnap.exists()) return alert("Ziel nicht gefunden!");
  let ziel= zielSnap.val();

  // z.B. minus level? => du könntest coder z.B. caster level--
  let newLevel= caster.level;
  for(let i=0; i<(sp.kostenLevel||0); i++){
    newLevel= Math.max(1, newLevel-1);
  }

  let updates={};
  updates[`benutzer/${user.uid}/level`] = newLevel;

  // kannst dem ziel irgendwas +HP geben etc. – oder was du eben willst
  await update(ref(db), updates);

  // log => actionType="spezial"
  await push(ref(db,"publicLogs"),{
    timestamp:Date.now(),
    caster: user.uid,
    target: zielID,
    actionType: "spezial",
    name: sp.name,
    kosten: sp.kostenLevel||0
  });
  alert(`Spezial '${sp.name}' angewendet! Kosten: ${sp.kostenLevel||0} Lvl`);

  closeSpezialPopup();
};
