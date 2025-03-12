import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-database.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

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
const db = getDatabase(app);
const auth = getAuth();

// Nur Admin darf rein!
onAuthStateChanged(auth, (user) => {
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
        
        tr.innerHTML = `
            <td>${user.name || "Unbekannt"}</td>
            <td>${user.email}</td>
            <td>${user.familie || "Keine"}</td>
            <td>
                <input type="number" value="${user.level || 1}" min="1" id="level-${uid}">
                <button onclick="speichereLevel('${uid}')">Speichern</button>
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

async function speichereLevel(uid) {
    const levelInput = document.getElementById(`level-${uid}`);
    const neuesLevel = parseInt(levelInput.value, 10);
    
    if (isNaN(neuesLevel) || neuesLevel < 1) {
        alert("Ungültiges Level!");
        return;
    }

    await update(ref(db, `benutzer/${uid}`), { level: neuesLevel });
    alert("Level gespeichert!");
}

window.ausloggen = async function() {
    await signOut(auth);
    window.location.href = "index.html";
};

// Fehlermeldung absenden
document.getElementById("fehler-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const beschreibung = document.getElementById("beschreibung").value;
    const screenshot = document.getElementById("screenshot").files[0];

    if (!name || !email || !beschreibung) {
        alert("Bitte alle Felder ausfüllen!");
        return;
    }

    let fehlerData = {
        name: name,
        email: email,
        beschreibung: beschreibung,
        timestamp: new Date().toISOString()
    };

    if (screenshot) {
        const reader = new FileReader();
        reader.onload = async function(event) {
            fehlerData.screenshot = event.target.result;
            await update(ref(db, "fehlerberichte/" + Date.now()), fehlerData);
            alert("Fehlerbericht gesendet!");
        };
        reader.readAsDataURL(screenshot);
    } else {
        await update(ref(db, "fehlerberichte/" + Date.now()), fehlerData);
        alert("Fehlerbericht gesendet!");
    }

    document.getElementById("fehler-form").reset();
});
