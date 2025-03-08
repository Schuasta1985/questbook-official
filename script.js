// Globale Variablen für XP, Level und Benutzerstatus
let xp = 0;
let level = 1;
let currentUser = null;
let isAdmin = false;

window.onload = function () {
    console.log("window.onload aufgerufen");

    // Initialisiere Logbuch und verstecke den Button
    erstelleLogbuch();
    const logbuchContainer = document.getElementById("logbuch-container");
    const logbuchButton = document.getElementById("logbuch-button");

    if (logbuchContainer) {
        logbuchContainer.style.display = "none";
    }
    if (logbuchButton) {
        logbuchButton.style.display = "none";
    }

    // Zusätzliche Sicherheit für das Logbuch
    setTimeout(() => steuerungLogbuch(false), 0);

    // Tägliche HP- und MP-Regeneration prüfen
    const heutigesDatum = new Date().toDateString();
    const letzterTag = localStorage.getItem("letzteHPRegeneration");

    if (letzterTag !== heutigesDatum) {
        täglicheHPRegeneration();
        täglicheMPRegeneration();
        localStorage.setItem("letzteHPRegeneration", heutigesDatum);
    }

    // Lade Aktionen und Logbuch direkt beim Start
    ladeAktionenLog();
    ladeLogbuch();
    zeigeStartseite();
};

const spezialFähigkeitenTexte = {
    Thomas: [
        { name: "Massiere mich", kosten: 2 },
        { name: "Ich will gekuschelt werden", kosten: 1 },
        { name: "Mach mir Kaiserschmarren", kosten: 3 },
        { name: "Wunsch frei", kosten: 5 },
        { name: "Ich habe mir eine Auszeit verdient", kosten: 6 }
    ],
    Jamie: [
        { name: "Massiere mich", kosten: 2 },
        { name: "Ich will gekuschelt werden", kosten: 1 },
        { name: "TV gucken mit...", kosten: 3 },
        { name: "30 Min Gaming Zeit", kosten: 2 },
        { name: "Unendliche Spielzeit", kosten: 5 }
    ],
    Elke: [
        { name: "Massiere mich", kosten: 2 },
        { name: "TV gucken mit...", kosten: 1 },
        { name: "Ich will gekuschelt werden", kosten: 1 },
        { name: "Mach mir was zu essen", kosten: 3 },
        { name: "Wunsch frei", kosten: 5 },
        { name: "Ich habe mir eine Auszeit verdient", kosten: 6 }
    ],
    Julian: [
        { name: "Hol mich bitte ab", kosten: 1 },
        { name: "Zug fahren mit ...", kosten: 5 },
        { name: "Einkaufen fahren mit ...", kosten: 2 },
        { name: "Wellnessen fahren mit ...", kosten: 6 }
    ]
};


// Logbuch nur auf der Startseite ausblenden
function steuerungLogbuch(anzeigen) {
    const logbuchButton = document.getElementById("logbuch-button");
    if (logbuchButton) {
        logbuchButton.style.display = anzeigen ? "block" : "none";
    } else {
        console.warn("Logbuch-Button wurde noch nicht erstellt.");
    }
}

function erstelleLogbuch() {
    console.log("Logbuch wird erstellt...");

    // Container für das Logbuch erstellen
    const logbuchContainer = document.createElement("div");
    logbuchContainer.id = "logbuch-container";
    logbuchContainer.innerHTML = "<h3>Logbuch</h3><ul id='logbuch-list'></ul>";
    document.body.appendChild(logbuchContainer);

    // Button für das Öffnen/Schließen des Logbuchs
    const logbuchButton = document.createElement("button");
    logbuchButton.id = "logbuch-button";
    logbuchButton.textContent = "Logbuch";

    logbuchButton.addEventListener("click", () => {
        if (logbuchContainer.style.display === "none") {
            logbuchContainer.style.display = "block";
        } else {
            logbuchContainer.style.display = "none";
        }
    });

    document.body.appendChild(logbuchButton);
    console.log("Logbuch-Button und Container erstellt.");
}

function logbuchEintrag(questBeschreibung, benutzername, xp) {
    console.log("Neuer Logbuch-Eintrag wird erstellt...");
    const logbuchListe = document.getElementById("logbuch-list");

    const datum = new Date();
    const zeitstempel = datum.toLocaleString();

    const eintrag = document.createElement("li");
    eintrag.style.marginBottom = "10px";
    eintrag.innerHTML = `
        <strong>${questBeschreibung}</strong><br>
        Erledigt von: ${benutzername}<br>
        XP: ${xp}<br>
        Am: ${zeitstempel}
    `;

    // Füge den neuen Eintrag oben hinzu (chronologisch absteigend)
    logbuchListe.prepend(eintrag);

    // Optional: Eintrag in Firebase speichern (falls benötigt)
    if (currentUser) {
        firebase.database().ref("logbuch").push({
            quest: questBeschreibung,
            benutzer: benutzername,
            xp: xp,
            zeit: zeitstempel
        }).then(() => {
            console.log("Logbuch-Eintrag erfolgreich gespeichert.");
        }).catch((error) => {
            console.error("Fehler beim Speichern des Logbuch-Eintrags:", error);
        });
    }
}

function ladeLogbuch() {
    firebase.database().ref("logbuch").get().then((snapshot) => {
        if (snapshot.exists()) {
            const daten = snapshot.val();
            const logbuchListe = document.getElementById("logbuch-list");
            logbuchListe.innerHTML = ""; // Liste zurücksetzen

            Object.values(daten).forEach((eintrag) => {
                const listItem = document.createElement("li");
                listItem.style.marginBottom = "10px";
                listItem.innerHTML = `
                    <strong>${eintrag.quest}</strong><br>
                    Erledigt von: ${eintrag.benutzer}<br>
                    XP: ${eintrag.xp}<br>
                    Am: ${eintrag.zeit}
                `;
                logbuchListe.prepend(listItem); // Chronologisch absteigend
            });
        } else {
            console.log("Keine Logbuch-Einträge gefunden.");
        }
    }).catch((error) => {
        console.error("Fehler beim Laden des Logbuchs:", error);
    });
}

function zeigeStartseite() {
    console.log("zeigeStartseite() aufgerufen");

    steuerungLogbuch(false); // Logbuch-Button ausblenden

    const loginSection = document.getElementById("login-section");
    if (loginSection) {
        loginSection.innerHTML = `
            <label for="spielerDropdown">Spieler auswählen:</label>
            <select id="spielerDropdown">
                <option value="">-- Bitte wählen --</option>
                <option value="Thomas">Thomas</option>
                <option value="Elke">Elke</option>
                <option value="Jamie">Jamie</option>
                <option value="Julian">Julian</option>
            </select>
            <input type="password" id="spielerPasswort" placeholder="Passwort eingeben">
            <button id="benutzerLoginButton">Anmelden</button>
        `;
        loginSection.style.display = "block";

        const benutzerLoginButton = document.getElementById("benutzerLoginButton");
        if (benutzerLoginButton) {
            benutzerLoginButton.onclick = benutzerAnmeldung;
        }
    }

    // Verstecke andere Sektionen
    document.getElementById("quests-section").style.display = "none";
    document.getElementById("xp-counter").style.display = "none";
    document.getElementById("logout-button").style.display = "none";
    document.getElementById("npc-login-section").style.display = "block";

    ladeBenutzerdaten();
}

function zeigeQuestbook() {
    document.getElementById("quests-section").style.display = "block";
    document.getElementById("xp-counter").style.display = "block";
    document.getElementById("logout-button").style.display = "block";
    document.getElementById("login-section").style.display = "none";

    const logbuchButton = document.getElementById("logbuch-button");
    if (logbuchButton) {
        logbuchButton.style.display = "block";
    }
}
function benutzerAnmeldung() {
    console.log("benutzerAnmeldung() aufgerufen");

    const npcLoginSection = document.getElementById("npc-login-section");
    const logbuchButton = document.getElementById("logbuch-button");
    const benutzernameInput = document.getElementById("spielerDropdown");
    const passwortInput = document.getElementById("spielerPasswort");
    const benutzerContainer = document.getElementById("benutzer-container");

    if (!benutzernameInput || !passwortInput) {
        console.error("Fehler: Spieler-Dropdown oder Passwortfeld nicht gefunden!");
        alert("Es gab ein Problem beim Laden der Seite. Bitte versuche es später erneut.");
        return;
    }

    const benutzername = benutzernameInput.value.trim();
    const passwort = passwortInput.value.trim();

    const benutzerPasswoerter = {
        Thomas: "12345",
        Elke: "julian0703",
        Jamie: "602060",
        Julian: "julian123"
    };

    if (!benutzername || !benutzerPasswoerter[benutzername]) {
        alert("Bitte wähle einen gültigen Benutzer aus.");
        return;
    }

    if (passwort !== benutzerPasswoerter[benutzername]) {
        alert("Das eingegebene Passwort ist falsch.");
        return;
    }

    // **Benutzer erfolgreich angemeldet**
    currentUser = benutzername;
    isAdmin = false;
    
    // **Benutzerdaten initialisieren, falls noch nicht vorhanden**
    initialisiereBenutzerDaten(currentUser);

    console.log(`${benutzername} erfolgreich angemeldet`);

    if (logbuchButton) {
        logbuchButton.style.display = "block";
    }

    if (npcLoginSection) npcLoginSection.style.display = "none";
    if (benutzerContainer) benutzerContainer.style.display = "none";

    zeigeQuestbook();
    ladeFortschritte(() => {
        täglicheHPRegeneration();
        täglicheMPRegeneration();
    });

    zeigeAvatar();
    ladeGlobaleQuests();

    console.log("Benutzeranmeldung abgeschlossen!");
}


// NPC Login
function npcLogin() {
    console.log("npcLogin() aufgerufen");
    const username = document.getElementById("npcBenutzername")?.value;
    const password = document.getElementById("npcPasswort")?.value;

    if (username === "npc" && password === "1234") {
        console.log("NPC erfolgreich eingeloggt!");
        isAdmin = true;
        currentUser = null;

        document.getElementById("npc-login-section").style.display = "none";
        zeigeQuestbook();
        ladeGlobaleQuests();
        zeigeAdminFunktionen();
    } else {
        alert("Falsche Anmeldedaten!");
    }
}


// Benutzerfortschritte speichern in Firebase
function speichereFortschritte() {
    if (currentUser) {
        firebase.database().ref(`benutzer/${currentUser}/fortschritte`).set({
            xp: xp,
            level: level,
            hp: aktuelleHP || berechneMaxHP(level),
            maxHP: maxHP || berechneMaxHP(level),
            mp: aktuelleMP || berechneMaxMP(level),
            maxMP: maxMP || berechneMaxMP(level)
        })
        .then(() => {
            console.log("Fortschritte erfolgreich gespeichert.");
        })
        .catch((error) => {
            console.error("Fehler beim Speichern der Fortschritte:", error);
        });
    }
}


// Benutzerfortschritte aus Firebase laden
function ladeFortschritte(callback) {
    if (!currentUser) {
        console.warn("Kein Benutzer angemeldet. Fortschritte werden nicht geladen.");
        return;
    }

    firebase.database().ref(`benutzer/${currentUser}/fortschritte`).get()
        .then((snapshot) => {
            if (snapshot.exists()) {
                const daten = snapshot.val();
                
                // Stelle sicher, dass Level nicht fälschlicherweise auf 1 gesetzt wird
                xp = daten.xp || 0;
                level = daten.level !== undefined ? daten.level : level; // Nur überschreiben, wenn vorhanden
                aktuelleHP = daten.hp !== undefined ? daten.hp : berechneMaxHP(level);
                maxHP = berechneMaxHP(level);
                aktuelleMP = daten.mp !== undefined ? daten.mp : berechneMaxMP(level);
                maxMP = berechneMaxMP(level);

                aktualisiereXPAnzeige();
                aktualisiereHPLeiste(aktuelleHP, level);
                aktualisiereMPLeiste(aktuelleMP, level);

                console.log(`Fortschritte geladen: Level ${level}, XP ${xp}`);

                // Letzte Regenerationsdaten aus Firebase abrufen
                firebase.database().ref(`benutzer/${currentUser}/letzteHPRegeneration`).get()
                    .then((snapshot) => {
                        if (snapshot.exists()) {
                            console.log(`Letzte HP-Regeneration: ${snapshot.val()}`);
                        } else {
                            console.log("Keine HP-Regeneration in Firebase gespeichert.");
                        }
                    });

                firebase.database().ref(`benutzer/${currentUser}/letzteMPRegeneration`).get()
                    .then((snapshot) => {
                        if (snapshot.exists()) {
                            console.log(`Letzte MP-Regeneration: ${snapshot.val()}`);
                        } else {
                            console.log("Keine MP-Regeneration in Firebase gespeichert.");
                        }
                    });

                if (typeof callback === "function") {
                    callback();
                }
            } else {
                console.warn(`Keine gespeicherten Fortschritte für ${currentUser} gefunden.`);
            }
        })
        .catch((error) => {
            console.error("Fehler beim Laden der Fortschrittsdaten:", error);
        });
}


function täglicheHPRegeneration() {
    if (!currentUser) {
        console.warn("Kein Benutzer angemeldet. HP-Regeneration übersprungen.");
        return;
    }

    const heutigesDatum = new Date().toDateString();

    // Letzte HP-Regeneration aus Firebase abrufen
    firebase.database().ref(`benutzer/${currentUser}/letzteHPRegeneration`).get()
        .then((snapshot) => {
            const letzterTagHP = snapshot.exists() ? snapshot.val() : null;

            if (letzterTagHP !== heutigesDatum) {
                firebase.database().ref(`benutzer/${currentUser}/fortschritte`).get()
                    .then((snapshot) => {
                        if (snapshot.exists()) {
                            const daten = snapshot.val();
                            const aktuelleHP = daten.hp || berechneMaxHP(daten.level);
                            const maxHP = berechneMaxHP(daten.level);
                            const neueHP = Math.min(aktuelleHP + 100, maxHP); // Maximal auf maxHP

                            console.log(`[${currentUser}] HP regeneriert: ${aktuelleHP} ➝ ${neueHP}`);

                            firebase.database().ref(`benutzer/${currentUser}/fortschritte/hp`).set(neueHP)
                                .then(() => {
                                    firebase.database().ref(`benutzer/${currentUser}/letzteHPRegeneration`).set(heutigesDatum);
                                    aktualisiereHPLeiste(neueHP, daten.level);
                                })
                                .catch((error) => {
                                    console.error("Fehler beim Speichern der regenerierten HP:", error);
                                });
                        }
                    })
                    .catch((error) => {
                        console.error("Fehler beim Abrufen der HP-Daten:", error);
                    });
            } else {
                console.log(`[${currentUser}] HP wurde heute bereits regeneriert.`);
            }
        })
        .catch((error) => {
            console.error("Fehler beim Abrufen der letzten HP-Regeneration aus Firebase:", error);
        });
}

function täglicheMPRegeneration() {
    if (!currentUser) {
        console.warn("Kein Benutzer angemeldet. MP-Regeneration übersprungen.");
        return;
    }

    const heutigesDatum = new Date().toDateString();

    // Letzte MP-Regeneration aus Firebase abrufen
    firebase.database().ref(`benutzer/${currentUser}/letzteMPRegeneration`).get()
        .then((snapshot) => {
            const letzterTagMP = snapshot.exists() ? snapshot.val() : null;

            if (letzterTagMP !== heutigesDatum) {
                firebase.database().ref(`benutzer/${currentUser}/fortschritte`).get()
                    .then((snapshot) => {
                        if (snapshot.exists()) {
                            const daten = snapshot.val();
                            const maxMP = berechneMaxMP(daten.level || 1); // Falls Level fehlt, nehme 1

                            console.log(`[${currentUser}] MP auf Maximum gesetzt: ${maxMP}`);

                            firebase.database().ref(`benutzer/${currentUser}/fortschritte/mp`).set(maxMP)
                                .then(() => {
                                    firebase.database().ref(`benutzer/${currentUser}/letzteMPRegeneration`).set(heutigesDatum);
                                    aktualisiereMPLeiste(maxMP, daten.level || 1);
                                })
                                .catch((error) => {
                                    console.error("Fehler beim Speichern der MP:", error);
                                });
                        }
                    })
                    .catch((error) => {
                        console.error("Fehler beim Abrufen der MP-Daten:", error);
                    });
            } else {
                console.log(`[${currentUser}] MP wurde heute bereits regeneriert.`);
            }
        })
        .catch((error) => {
            console.error("Fehler beim Abrufen der letzten MP-Regeneration aus Firebase:", error);
        });
}
function speichereQuestsInFirebase(quests) {
    if (currentUser) {
        firebase.database().ref(`benutzer/${currentUser}/quests`).set(quests)
        .then(() => {
            console.log("Quests erfolgreich gespeichert.");
        })
        .catch((error) => {
            console.error("Fehler beim Speichern der Quests:", error);
        });
    }
}

function ladeGlobaleQuests() {
    console.log("ladeGlobaleQuests() aufgerufen");
    firebase.database().ref('quests').get()
        .then((snapshot) => {
            if (snapshot.exists()) {
                const gespeicherteQuests = snapshot.val();
                console.log("Globale Quests:", gespeicherteQuests);

                const questList = document.getElementById("quests");
                questList.innerHTML = ""; // Liste der Quests zurücksetzen

                gespeicherteQuests.forEach((quest, index) => {
                    const istErledigt = quest.alleBenutzer
                        ? quest.erledigtVon && quest.erledigtVon[currentUser]
                        : quest.erledigt;

                    const xpAnzeigen = quest.xpProEinheit
                        ? `${quest.xpProEinheit} XP je Einheit`
                        : `${quest.xp || 0} XP`;

                    const verbleibend = quest.maximaleMenge
                        ? ` (${quest.aktuelleMenge || 0}/${quest.maximaleMenge} erledigt)`
                        : "";

                    const listItem = document.createElement("li");
                    listItem.innerHTML = `
                        <span class="quest-text" style="text-decoration: ${istErledigt ? 'line-through' : 'none'};">
                            <strong>Quest ${index + 1}:</strong> ${quest.beschreibung} 
                            <span class="xp-display">( ${xpAnzeigen}${verbleibend} )</span>
                            ${
                                istErledigt
                                    ? `<br><small>Erledigt von: ${
                                        quest.erledigtVon ? Object.keys(quest.erledigtVon).join(", ") : "Unbekannt"
                                    }</small>`
                                    : ""
                            }
                        </span>
                        ${
                            !istErledigt && !isAdmin
                                ? `<button onclick="questErledigt(${index})">Erledigt</button>`
                                : ""
                        }
                    `;

                    listItem.setAttribute("data-xp", quest.xp || 0);
                    questList.appendChild(listItem);
                });

                if (isAdmin) {
                    zeigeAdminFunktionen();
                }
            } else {
                console.log("Keine globalen Quests gefunden.");
            }
        })
        .catch((error) => {
            console.error("Fehler beim Laden der globalen Quests:", error);
        });
}

function aktualisiereXPAnzeige() {
    console.log("aktualisiereXPAnzeige() aufgerufen");
    const levelElement = document.getElementById('level');
    const xpProgressElement = document.getElementById('xp-progress');
    const xpLabelElement = document.getElementById("xp-label");

    if (levelElement) {
        levelElement.textContent = level;
    }

    const xpFürLevelUp = level <= 10 ? 100 : 200 + ((Math.floor((level - 1) / 10)) * 100);

    if (xpProgressElement) {
        const progress = Math.min((xp / xpFürLevelUp) * 100, 100);
        xpProgressElement.style.width = `${progress}%`;
    }

    if (xpLabelElement) {
        xpLabelElement.textContent = `Noch ${xpFürLevelUp - xp} XP bis zum nächsten Level`;
    }

    überprüfeLevelAufstieg();
    speichereFortschritte();
}

function überprüfeLevelAufstieg() {
    console.log("überprüfeLevelAufstieg() aufgerufen");
    const xpFürLevelUp = level <= 10 ? 100 : 200 + ((Math.floor((level - 1) / 10)) * 100);

    while (xp >= xpFürLevelUp) {
        xp -= xpFürLevelUp;
        level++;
        aktualisiereXPAnzeige();
        zeigeLevelUpAnimation();
    }

    // Falls das Level sinkt (z.B. durch Tod)
    firebase.database().ref(`benutzer/${currentUser}/fortschritte`).get()
        .then((snapshot) => {
            if (snapshot.exists()) {
                const daten = snapshot.val();
                const neueMaxHP = berechneMaxHP(level);

                if (daten.hp > neueMaxHP) {
                    firebase.database().ref(`benutzer/${currentUser}/fortschritte/hp`).set(neueMaxHP)
                        .then(() => {
                            console.log(`HP auf neues Max-HP gesenkt: ${neueMaxHP}`);
                            aktualisiereHPLeiste(neueMaxHP, level);
                        })
                        .catch((error) => {
                            console.error("Fehler beim Setzen des neuen Max-HP:", error);
                        });
                }
            }
        });
}


function zeigeLevelUpAnimation() {
    console.log("zeigeLevelUpAnimation() aufgerufen");
    const videoContainer = document.createElement('div');
    videoContainer.id = 'level-up-video-container';
    videoContainer.style.position = 'fixed';
    videoContainer.style.top = '0';
    videoContainer.style.left = '0';
    videoContainer.style.width = '100%';
    videoContainer.style.height = '100%';
    videoContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    videoContainer.style.zIndex = '500';

    const video = document.createElement('video');
    video.src = 'avatars/lvlup.mp4';
    video.autoplay = true;
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';

    videoContainer.appendChild(video);
    document.body.appendChild(videoContainer);

    setTimeout(() => {
        if (videoContainer && document.body.contains(videoContainer)) {
            video.pause();
            document.body.removeChild(videoContainer);
        }
    }, 5000); // Video nach 10 Sekunden entfernen
}

function questErledigt(questNummer) {
    console.log("questErledigt() aufgerufen für QuestNummer:", questNummer);
    firebase.database().ref('quests').get()
        .then((snapshot) => {
            if (snapshot.exists()) {
                let quests = snapshot.val() || [];
                let quest = quests[questNummer];

                if (quest) {
                    const verbleibendeMenge = quest.maximaleMenge - (quest.aktuelleMenge || 0);

                    if (verbleibendeMenge <= 0) {
                        alert("Diese Quest wurde bereits vollständig abgeschlossen.");
                        return;
                    }

                    const erledigteMenge = parseInt(prompt(`Wie viele Einheiten möchtest du erledigen? (Verfügbar: ${verbleibendeMenge})`), 10);

                    if (isNaN(erledigteMenge) || erledigteMenge <= 0 || erledigteMenge > verbleibendeMenge) {
                        alert("Ungültige Eingabe. Bitte gib eine gültige Menge ein.");
                        return;
                    }

                    const xpGutschrift = erledigteMenge * (quest.xpProEinheit || 0);
                    xp += xpGutschrift;

                    quest.aktuelleMenge = (quest.aktuelleMenge || 0) + erledigteMenge;
                    if (!quest.erledigtVon) {
                        quest.erledigtVon = {};
                    }
                    if (!quest.erledigtVon[currentUser]) {
                        quest.erledigtVon[currentUser] = 0;
                    }
                    quest.erledigtVon[currentUser] += erledigteMenge;

                    speichereFortschritte();

                    logbuchEintrag(quest.beschreibung, currentUser, xpGutschrift);

                    firebase.database().ref('quests').set(quests)
                        .then(() => {
                            aktualisiereXPAnzeige();
                            ladeGlobaleQuests();
                            console.log(`Quest ${questNummer} wurde um ${erledigteMenge} Einheiten ergänzt.`);
                        })
                        .catch((error) => {
                            console.error("Fehler beim Speichern der Quest als erledigt:", error);
                        });
                } else {
                    alert("Quest konnte nicht gefunden werden.");
                }
            } else {
                alert("Keine Quests vorhanden.");
            }
        })
        .catch((error) => {
            console.error("Fehler beim Markieren der Quest als erledigt:", error);
        });
}

function aktualisiereQuestImDOM(questNummer, quest) {
    const questList = document.getElementById("quests");
    const questElement = questList.children[questNummer];

    if (questElement) {
        const questText = questElement.querySelector(".quest-text");

        if (questText) {
            questText.style.textDecoration = "line-through";
            const erledigtInfo = quest.alleBenutzer
                ? `<br><small>Erledigt von: ${currentUser}</small>`
                : `<br><small>Erledigt von: ${quest.erledigtVon || 'Unbekannt'}</small>`;
            questText.innerHTML += erledigtInfo;
        }

        const erledigtButton = questElement.querySelector("button");
        if (erledigtButton) {
            erledigtButton.remove();
        }
    }
}

// Neue Quest erstellen
function neueQuestErstellen() {
    console.log("neueQuestErstellen() aufgerufen");
    const neueQuestBeschreibung = prompt("Bitte die Beschreibung für die neue Quest eingeben:");
    const xpProEinheit = parseInt(prompt("Wie viele XP soll jede Einheit dieser Quest geben?"), 10);
    const maximaleMenge = parseInt(prompt("Wie viele Einheiten sind maximal zu erledigen?"), 10);
    const alleBenutzer = confirm("Kann diese Quest von allen Benutzern abgeschlossen werden? (OK = Ja, Abbrechen = Nein)");

    if (neueQuestBeschreibung && !isNaN(xpProEinheit) && !isNaN(maximaleMenge)) {
        const neueQuest = {
            beschreibung: neueQuestBeschreibung,
            xpProEinheit: xpProEinheit,
            maximaleMenge: maximaleMenge,
            aktuelleMenge: 0,
            erledigtVon: {},
            alleBenutzer: alleBenutzer
        };

        firebase.database().ref('quests').once('value')
            .then((snapshot) => {
                let quests = snapshot.exists() ? snapshot.val() : [];

                if (!Array.isArray(quests)) {
                    console.error("Fehler: Erwartete eine Array-Struktur für die Quests.");
                    quests = [];
                }

                quests.push(neueQuest);

                return firebase.database().ref('quests').set(quests);
            })
            .then(() => {
                console.log("Neue Quest erfolgreich erstellt.");
                ladeGlobaleQuests();
            })
            .catch((error) => {
                console.error("Fehler beim Speichern der neuen Quest:", error);
            });
    } else {
        alert("Ungültige Eingabe. Bitte gib eine gültige Beschreibung, XP pro Einheit und maximale Menge ein.");
    }
}

function zeigeAdminFunktionen() {
    console.log("zeigeAdminFunktionen() aufgerufen");

    const levelSetContainer = document.getElementById("level-set-container");
    const adminButtonsContainer = document.getElementById("admin-buttons-container");

    if (isAdmin) {
        console.log("Admin-Modus aktiv, zeige Admin-Funktionen");

        const questItems = document.querySelectorAll("#quests li");
        questItems.forEach((questItem, index) => {
            if (!questItem.querySelector(".edit-button")) {
                const editButton = document.createElement("button");
                editButton.textContent = "Bearbeiten";
                editButton.className = "edit-button";
                editButton.onclick = () => questBearbeiten(index);
                questItem.appendChild(editButton);
                console.log(`Bearbeiten-Button für Quest ${index + 1} hinzugefügt.`);
            }
        });

        if (levelSetContainer) {
            levelSetContainer.style.display = "block";
        }

        if (!adminButtonsContainer) {
            console.log("Admin-Buttons werden erstellt.");
            const questbookContainer = document.getElementById("quests-section");
            const newAdminButtonsContainer = document.createElement("div");
            newAdminButtonsContainer.id = "admin-buttons-container";

            // Button: Neue Quest erstellen
            const createButton = document.createElement("button");
            createButton.textContent = "Neue Quest erstellen";
            createButton.id = "createQuestButton";
            createButton.onclick = neueQuestErstellen;

            // Button: Alle Quests zurücksetzen
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Alle Quests zurücksetzen";
            deleteButton.id = "deleteQuestsButton";
            deleteButton.onclick = questsZuruecksetzen;

            // Button: Fähigkeiten eines Benutzers zurücksetzen
            const resetAbilitiesButton = document.createElement("button");
            resetAbilitiesButton.textContent = "Fähigkeiten eines Benutzers zurücksetzen";
            resetAbilitiesButton.id = "resetAbilitiesButton";
            resetAbilitiesButton.onclick = () => {
                const spieler = prompt("Gib den Namen des Spielers ein, dessen Fähigkeiten zurückgesetzt werden sollen:");
                if (spieler) {
                    setzeFähigkeitenZurück(spieler);
                }
            };

            // Button: Log der Spezialfähigkeiten löschen
            const resetLogButton = document.createElement("button");
            resetLogButton.textContent = "Log der Spezialfähigkeiten löschen";
            resetLogButton.id = "resetLogButton";
            resetLogButton.onclick = löscheSpezialfähigkeitenLog;

            // Buttons hinzufügen
            newAdminButtonsContainer.appendChild(createButton);
            newAdminButtonsContainer.appendChild(deleteButton);
            newAdminButtonsContainer.appendChild(resetAbilitiesButton);
            newAdminButtonsContainer.appendChild(resetLogButton);

            questbookContainer.appendChild(newAdminButtonsContainer);
        }
    } else {
        console.log("Kein Admin-Modus, verstecke Admin-Funktionen");

        if (adminButtonsContainer) {
            adminButtonsContainer.remove();
        }

        if (levelSetContainer) {
            levelSetContainer.style.display = "none";
        }

        const editButtons = document.querySelectorAll(".edit-button");
        editButtons.forEach((editButton) => {
            editButton.remove();
        });
    }
}


function questsZuruecksetzen() {
    console.log("questsZuruecksetzen() aufgerufen");
    if (confirm("Möchtest du wirklich alle Quests zurücksetzen?")) {
        firebase.database().ref('quests').set([])
        .then(() => {
            console.log("Alle Quests wurden zurückgesetzt.");
            ladeGlobaleQuests();
        })
        .catch((error) => {
            console.error("Fehler beim Zurücksetzen der Quests:", error);
        });
    }
}

function questBearbeiten(questNummer) {
    console.log("questBearbeiten() aufgerufen für QuestNummer:", questNummer);
    firebase.database().ref('quests').get()
    .then((snapshot) => {
        if (snapshot.exists()) {
            const quests = snapshot.val();
            if (quests[questNummer]) {
                const neueBeschreibung = prompt("Neue Beschreibung der Quest:", quests[questNummer].beschreibung);
                const neueXP = parseInt(prompt("Neue XP für diese Quest:", quests[questNummer].xp), 10);

                if (neueBeschreibung && !isNaN(neueXP)) {
                    quests[questNummer].beschreibung = neueBeschreibung;
                    quests[questNummer].xp = neueXP;
                    firebase.database().ref('quests').set(quests)
                        .then(() => {
                            console.log("Quest erfolgreich bearbeitet.");
                            ladeGlobaleQuests();
                        })
                        .catch((error) => {
                            console.error("Fehler beim Speichern der bearbeiteten Quest:", error);
                        });
                } else {
                    alert("Ungültige Eingabe. Bitte versuche es erneut.");
                }
            }
        }
    })
    .catch((error) => {
        console.error("Fehler beim Bearbeiten der Quest:", error);
    });
}

function zeigeAvatar() {
    console.log("zeigeAvatar() aufgerufen für Benutzer:", currentUser);

    if (!currentUser) {
        console.error("Kein Benutzer angemeldet. Avatar kann nicht angezeigt werden.");
        return;
    }

    const avatarContainer = document.getElementById("avatar-container");
    if (!avatarContainer) {
        console.error("Avatar-Container nicht gefunden!");
        return;
    }

    const avatarPath = getAvatarForUser(currentUser);
    if (!avatarPath) {
        console.error(`Kein Avatar für ${currentUser} gefunden.`);
        return;
    }

    // Konfiguration für die Größe der Avatare basierend auf dem Benutzer
    const avatarConfig = {
        Thomas: { width: "170px", height: "170px" },
        Elke: { width: "170px", height: "170px" },
        Jamie: { width: "140px", height: "140px" },
        Julian: { width: "140px", height: "140px" } // Julian hat nun auch eine definierte Größe
    };

    // Standardgröße verwenden, falls der Benutzer nicht definiert ist
    const userConfig = avatarConfig[currentUser] || { width: "120px", height: "120px" };

    // HTML für den Avatar abhängig von Video oder Bild
    let avatarHTML = "";
    if (currentUser === "Julian") {
        avatarHTML = `
            <img src="${avatarPath}" alt="Avatar von Julian" 
                 style="border-radius: 50%; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.5); width: ${userConfig.width}; height: ${userConfig.height}; object-fit: cover;">
        `;
    } else {
        avatarHTML = `
            <video autoplay loop muted style="border-radius: 50%; box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.5); width: ${userConfig.width}; height: ${userConfig.height};">
                <source src="${avatarPath}" type="video/mp4">
            </video>
        `;
    }

    // Avatar & Buttons einfügen
    avatarContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
            ${avatarHTML}
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
                <button id="zauber-button" onclick="zeigeZauberMenu()" 
                        style="padding: 5px 10px; background-color: #FFD700; 
                               color: black; font-weight: bold; border: none; border-radius: 5px;
                               box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3); font-size: 14px;">
                    Zauber
                </button>
                <button id="spezial-button" onclick="zeigeSpezialfähigkeitenMenu()"
                        style="padding: 5px 10px; background-color: #FFD700; 
                               color: black; font-weight: bold; border: none; border-radius: 5px;
                               box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.3); font-size: 14px;">
                    Spezialfähigkeiten
                </button>
            </div>
        </div>
    `;

    // Avatar sichtbar machen
    avatarContainer.style.display = "flex";
    avatarContainer.style.flexDirection = "column";
    avatarContainer.style.alignItems = "center";
    avatarContainer.style.marginTop = "20px";
}


function fügeSpezialfähigkeitenButtonHinzu() {
    const avatarContainer = document.getElementById('avatar-container');
    if (!avatarContainer) {
        console.warn('Avatar-Container nicht gefunden!');
        return;
    }

    // Spezialfähigkeiten-Button
    const spezialButton = document.createElement('button');
    spezialButton.textContent = 'Spezialfähigkeiten';
    spezialButton.style.marginLeft = '20px';
    spezialButton.style.padding = '10px 20px';
    spezialButton.style.backgroundColor = '#FFD700';
    spezialButton.style.color = '#000';
    spezialButton.style.border = 'none';
    spezialButton.style.borderRadius = '5px';
    spezialButton.style.cursor = 'pointer';
    spezialButton.style.boxShadow = '0px 4px 10px rgba(0, 0, 0, 0.5)';

    // Event für Button
    spezialButton.onclick = () => zeigeSpezialfähigkeitenMenu();

    avatarContainer.style.display = 'flex';
    avatarContainer.style.flexDirection = 'row'; // Button rechts vom Avatar
    avatarContainer.appendChild(spezialButton);
}


function ausloggen() {
    console.log("ausloggen() aufgerufen");
    
    const logbuchButton = document.getElementById("logbuch-button");
    if (logbuchButton) {
        logbuchButton.style.display = "none";
    }

    const logbuchContainer = document.getElementById("logbuch-container");
    if (logbuchContainer) logbuchContainer.style.display = "none";

    currentUser = null;
    isAdmin = false;

    const avatarContainer = document.getElementById("avatar-container");
    if (avatarContainer) {
        avatarContainer.style.display = "none";
        avatarContainer.innerHTML = "";
    }

    document.getElementById("quests-section").style.display = "none";
    document.getElementById("xp-counter").style.display = "none";
    document.getElementById("logout-button").style.display = "none";

    const npcLoginSection = document.getElementById("npc-login-section");
    if (npcLoginSection) npcLoginSection.style.display = "block";

    const questList = document.getElementById("quests");
    if (questList) {
        questList.innerHTML = "";
    }

    const adminButtonsContainer = document.getElementById("admin-buttons-container");
    if (adminButtonsContainer) {
        adminButtonsContainer.remove();
    }

    const hpContainer = document.getElementById("hp-bar-container");
    if (hpContainer) {
        hpContainer.style.display = "none";
    }

    const mpContainer = document.getElementById("mp-bar-container");
    if (mpContainer) {
        mpContainer.style.display = "none";
    }

    const benutzerContainer = document.getElementById("benutzer-container");
    if (benutzerContainer) {
        benutzerContainer.style.display = "flex";
    }

    zeigeStartseite();
}

let benutzerDaten = [];

function ladeBenutzerdaten() {
    console.log("ladeBenutzerdaten() aufgerufen");

    firebase.database().ref('benutzer').get()
        .then((snapshot) => {
            if (snapshot.exists()) {
                benutzerDaten = snapshot.val();
                
                // Prüfen, ob alle Standardbenutzer existieren
                const erwarteteBenutzer = ["Thomas", "Elke", "Jamie", "Julian"];
                erwarteteBenutzer.forEach(benutzername => {
                    if (!(benutzername in benutzerDaten)) {
                        console.warn(`Benutzer ${benutzername} fehlt – wird erstellt.`);
                        initialisiereBenutzerDaten(benutzername);
                    }
                });

                zeigeBenutzerAufStartseite();
            } else {
                console.log("Keine Benutzerdaten gefunden. Standardbenutzer werden angelegt.");
                ["Thomas", "Elke", "Jamie", "Julian"].forEach(initialisiereBenutzerDaten);
            }
        })
        .catch(error => {
            console.error("Fehler beim Laden der Benutzerdaten:", error);
        });
}

function zeigeBenutzerAufStartseite() {
    console.log("zeigeBenutzerAufStartseite() aufgerufen");
    const benutzerContainer = document.getElementById("benutzer-container");
    benutzerContainer.innerHTML = "";

    for (const [benutzername, daten] of Object.entries(benutzerDaten)) {
        const benutzerElement = document.createElement("div");
        benutzerElement.className = "benutzer-item";

        const avatarPath = getAvatarForUser(benutzername);
        let avatarElement;

        if (benutzername.toLowerCase() === "julian") {
            avatarElement = document.createElement("img");
            avatarElement.src = avatarPath;
            avatarElement.style.width = "100px";
            avatarElement.style.borderRadius = "10px";
        } else {
            avatarElement = document.createElement("video");
            avatarElement.src = avatarPath;
            avatarElement.autoplay = true;
            avatarElement.loop = true;
            avatarElement.muted = true;
            avatarElement.style.width = "100px";
        }

        const nameElement = document.createElement("h3");
        nameElement.textContent = benutzername;

        const levelElement = document.createElement("div");
        levelElement.textContent = `Level: ${daten.fortschritte?.level || 1}`;
        levelElement.style.border = "2px solid gold";
        levelElement.style.padding = "5px";
        levelElement.style.borderRadius = "5px";
        levelElement.style.textAlign = "center";

        // MP-Leiste wieder einfügen
        const mpElement = document.createElement("div");
        mpElement.className = "mp-bar";
        const aktuelleMP = daten.fortschritte?.mp || 0;
        const maxMP = daten.fortschritte?.maxMP || berechneMaxMP(daten.fortschritte?.level || 1);
        const mpProzent = (aktuelleMP / maxMP) * 100;
        mpElement.innerHTML = `
            <div class="progress" style="width: ${mpProzent}%; background-color: blue;"></div>
            <span class="mp-text">${aktuelleMP} / ${maxMP} MP</span>
        `;
        mpElement.title = `${aktuelleMP} / ${maxMP} MP`;

        // HP-Leiste wieder einfügen
        const hpElement = document.createElement("div");
        hpElement.className = "hp-bar";
        const aktuelleHP = daten.fortschritte?.hp || berechneMaxHP(1);
        const maxHP = berechneMaxHP(daten.fortschritte?.level || 1);
        const hpProzent = (aktuelleHP / maxHP) * 100;
        hpElement.innerHTML = `
            <div class="progress" style="width: ${hpProzent}%; background-color: ${berechneHPFarbe(hpProzent)};"></div>
            <span class="hp-text">${aktuelleHP} / ${maxHP} HP</span>
        `;
        hpElement.title = `${aktuelleHP} / ${maxHP} HP`;

        // Elemente hinzufügen
        benutzerElement.appendChild(avatarElement);
        benutzerElement.appendChild(nameElement);
        benutzerElement.appendChild(levelElement);
        benutzerElement.appendChild(hpElement);
        benutzerElement.appendChild(mpElement);

        benutzerContainer.appendChild(benutzerElement);
    }
}

function getAvatarForUser(user) {
    if (user === "Thomas") {
        return "avatars/thomas.mp4";
    } else if (user === "Elke") {
        return "avatars/elke.mp4";
    } else if (user === "Jamie") {
        return "avatars/jamie.mp4";
    } else if (user === "Julian") {
        return "avatars/julian.jpg"; // Julian hat ein Bild statt eines Videos
    }
    return "https://via.placeholder.com/100?text=Avatar"; // Platzhalter für unbekannte Benutzer
}


function berechneMaxHP(level) {
    return 100 + Math.floor((level - 1) / 10) * 200;
}

function aktualisiereHPLeiste(aktuelleHP, level) {
    const maxHP = berechneMaxHP(level);
    const hpProgress = document.getElementById("hp-progress");

    if (hpProgress) {
        const prozent = (aktuelleHP / maxHP) * 100;
        hpProgress.style.width = `${prozent}%`;
        hpProgress.textContent = `${aktuelleHP} / ${maxHP} HP`;

        if (prozent > 75) {
            hpProgress.style.backgroundColor = "green";
        } else if (prozent > 50) {
            hpProgress.style.backgroundColor = "yellow";
        } else if (prozent > 25) {
            hpProgress.style.backgroundColor = "orange";
        } else {
            hpProgress.style.backgroundColor = "red";
        }
    }
}

function berechneMaxMP(level) {
    return 50 + Math.floor((level - 1) / 10) * 50;
}

function aktualisiereMPLeiste(aktuelleMP, level) {
    const maxMP = berechneMaxMP(level);
    const mpProgress = document.getElementById("mp-progress");

    if (mpProgress) {
        const prozent = (aktuelleMP / maxMP) * 100;
        mpProgress.style.width = `${prozent}%`;
        mpProgress.textContent = `${aktuelleMP} / ${maxMP} MP`;
    }
}

function berechneHPFarbe(prozent) {
    if (prozent > 75) return "green";
    if (prozent > 50) return "yellow";
    if (prozent > 25) return "orange";
    return "red";
}

function aktualisiereLayout() {
    const hpContainer = document.getElementById("hp-bar-container");
    const questsSection = document.getElementById("quests-section");

    if (hpContainer && questsSection) {
        questsSection.style.marginTop = "20px";
    }
}

// -------------------------------------------------------------------------------------
// Zauber-Menü
function zeigeZauberMenu() {
    // Vorheriges Menü entfernen, falls vorhanden
    const bestehendesMenu = document.getElementById("zauber-menu");
    if (bestehendesMenu) {
        document.body.removeChild(bestehendesMenu);
    }

    // Container erstellen
    const zauberMenu = document.createElement('div');
    zauberMenu.id = 'zauber-menu';
    zauberMenu.style.position = 'absolute';
    zauberMenu.style.top = '50%';
    zauberMenu.style.left = '50%';
    zauberMenu.style.transform = 'translate(-50%, -50%)';
    zauberMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    zauberMenu.style.border = '2px solid #FFD700';
    zauberMenu.style.borderRadius = '10px';
    zauberMenu.style.padding = '15px';
    zauberMenu.style.zIndex = '1000';
    zauberMenu.style.width = '80%'; // Breite angepasst
    zauberMenu.style.maxWidth = '500px'; // Maximale Breite

    zauberMenu.innerHTML = `<h3 style="color: #FFD700; text-align: center; margin-bottom: 10px;">Zauber</h3>`;

    // Dropdown für Zielspieler erstellen
    const dropdownLabel = document.createElement("label");
    dropdownLabel.textContent = "Zielspieler auswählen:";
    dropdownLabel.style.display = "block";
    dropdownLabel.style.color = "#FFD700";
    dropdownLabel.style.marginBottom = "10px";

    const spielerDropdown = document.createElement("select");
    spielerDropdown.id = "spieler-dropdown";
    spielerDropdown.style.display = "block";
    spielerDropdown.style.margin = "10px auto";
    spielerDropdown.style.width = "100%";
    spielerDropdown.style.padding = "5px";
    spielerDropdown.style.border = "1px solid #FFD700";
    spielerDropdown.style.borderRadius = "5px";

    // Dropdown-Optionen hinzufügen
    const optionDefault = document.createElement("option");
    optionDefault.value = "";
    optionDefault.textContent = "-- Bitte wählen --";
    spielerDropdown.appendChild(optionDefault);

    Object.keys(benutzerDaten).forEach((spieler) => {
        if (spieler !== currentUser) {
            const option = document.createElement("option");
            option.value = spieler;
            option.textContent = spieler;
            spielerDropdown.appendChild(option);
        }
    });

    // Dropdown hinzufügen
    zauberMenu.appendChild(dropdownLabel);
    zauberMenu.appendChild(spielerDropdown);

    // Buttons für die Zauber
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "grid";
    buttonContainer.style.gridTemplateColumns = "repeat(auto-fit, minmax(150px, 1fr))";
    buttonContainer.style.gap = "10px";
    buttonContainer.style.marginTop = "10px";

    const zauber = [
        { name: "Schaden zufügen", action: schadenZufügen },
        { name: "Heilen", action: heilen }
    ];

    zauber.forEach(zauber => {
        const button = document.createElement('button');
        button.textContent = zauber.name;
        button.style.padding = '10px';
        button.style.backgroundColor = '#FFD700';
        button.style.color = '#000';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.style.textAlign = 'center';

        // Einheitliche Button-Größe
        button.style.height = '50px';
        button.style.display = 'flex';
        button.style.justifyContent = 'center';
        button.style.alignItems = 'center';

        // Event-Listener für die Buttons
        button.onclick = zauber.action;

        buttonContainer.appendChild(button);
    });

    // Buttons zum Container hinzufügen
    zauberMenu.appendChild(buttonContainer);

    // Schließen-Button hinzufügen
    const schließenButton = document.createElement('button');
    schließenButton.textContent = 'Schließen';
    schließenButton.style.marginTop = '15px';
    schließenButton.style.padding = '10px';
    schließenButton.style.backgroundColor = '#888';
    schließenButton.style.color = '#FFF';
    schließenButton.style.border = 'none';
    schließenButton.style.borderRadius = '5px';
    schließenButton.style.cursor = 'pointer';
    schließenButton.style.width = '100%';

    schließenButton.onclick = () => document.body.removeChild(zauberMenu);

    zauberMenu.appendChild(schließenButton);
    document.body.appendChild(zauberMenu);
}

// -------------------------------------------------------------------------------------
// GEÄNDERTE FUNKTION: Schaden zufügen + Grund
function schadenZufügen() {
    const zielSpieler = document.getElementById("spieler-dropdown").value;
    const schaden = parseInt(prompt("Wie viel Schaden möchtest du zufügen? (100 MP = 100 Schaden)"), 10);

    // NEU: Grund abfragen
    const grund = prompt("Warum fügst du Schaden zu? (z.B. 'Weil du böse warst')");

    if (!zielSpieler || isNaN(schaden) || schaden <= 0) {
        alert("Ungültige Eingabe.");
        return;
    }

    firebase.database().ref(`benutzer/${currentUser}/fortschritte`).get()
        .then((snapshot) => {
            if (snapshot.exists()) {
                const daten = snapshot.val();
                if (daten.mp < schaden) {
                    alert("Nicht genug MP.");
                    return;
                }

                // MP abziehen
                const neueMP = daten.mp - schaden;
                firebase.database().ref(`benutzer/${currentUser}/fortschritte/mp`).set(neueMP)
                    .then(() => console.log(`MP erfolgreich abgezogen: ${neueMP}`))
                    .catch((error) => console.error("Fehler beim MP-Update:", error));

                // Zielspieler Schaden zufügen
                firebase.database().ref(`benutzer/${zielSpieler}/fortschritte`).get()
                    .then((zielSnapshot) => {
                        if (zielSnapshot.exists()) {
                            const zielDaten = zielSnapshot.val();
                            const neueHP = Math.max(0, zielDaten.hp - schaden); // Verhindert negative HP

                            // Aktion-Objekt inkl. Grund und Ziel
                            const aktion = {
                                typ: "schaden",
                                wert: schaden,
                                grund: grund,          // <--- NEU
                                von: currentUser,
                                ziel: zielSpieler,      // <--- NEU
                                zeitpunkt: new Date().toLocaleString()
                            };

                            // 1) Aktion beim Zielspieler speichern
                            firebase.database().ref(`benutzer/${zielSpieler}/aktionen`).push(aktion)
                                .then(() => console.log("Aktion erfolgreich gespeichert (Ziel)"))
                                .catch((error) => console.error("Fehler beim Speichern der Aktion:", error));

                            // 2) Aktion zusätzlich im globalen Log "aktionen" speichern
                            firebase.database().ref("aktionen").push(aktion)
                                .then(() => console.log("Aktion erfolgreich gespeichert (global)"))
                                .catch((error) => console.error("Fehler beim globalen Speichern:", error));

                            // HP aktualisieren
                            firebase.database().ref(`benutzer/${zielSpieler}/fortschritte/hp`).set(neueHP)
                                .then(() => {
                                    console.log(`HP erfolgreich aktualisiert: ${zielSpieler} hat jetzt ${neueHP} HP`);
                                    if (neueHP <= 0) {
                                        // Spieler stirbt
                                        const neuesLevel = Math.max(1, zielDaten.level - 1);
                                        const maxHP = berechneMaxHP(neuesLevel);

                                        firebase.database().ref(`benutzer/${zielSpieler}/fortschritte`).update({
                                            level: neuesLevel,
                                            hp: maxHP
                                        })
                                            .then(() => alert(`${zielSpieler} ist gestorben und hat ein Level verloren.`))
                                            .catch((error) => console.error("Fehler beim Spieler-Tod-Update:", error));
                                    }
                                })
                                .catch((error) => console.error("Fehler beim HP-Update:", error));
                        } else {
                            console.error("Zielspieler nicht gefunden:", zielSpieler);
                        }
                    })
                    .catch((error) => console.error("Fehler beim Abrufen des Zielspieler-Fortschritts:", error));
            } else {
                console.error("Fehler beim Abrufen der aktuellen Benutzer-Fortschritte.");
            }
        })
        .catch((error) => console.error("Fehler beim Abrufen der MP-Daten:", error));
}

// -------------------------------------------------------------------------------------
// GEÄNDERTE FUNKTION: Heilen + Grund
function heilen() {
    const zielSpieler = document.getElementById("spieler-dropdown").value;
    const heilung = parseInt(prompt("Wie viel möchtest du heilen? (100 MP = 100 HP)"), 10);

    // NEU: Grund abfragen
    const grund = prompt("Warum heilst du? (z.B. 'Weil ich dich lieb habe')");

    if (!zielSpieler || isNaN(heilung) || heilung <= 0) {
        alert("Ungültige Eingabe.");
        return;
    }

    firebase.database().ref(`benutzer/${currentUser}/fortschritte`).get()
        .then((snapshot) => {
            if (snapshot.exists()) {
                const daten = snapshot.val();
                if (daten.mp < heilung) {
                    alert("Nicht genug MP.");
                    return;
                }

                // MP abziehen
                const neueMP = daten.mp - heilung;
                firebase.database().ref(`benutzer/${currentUser}/fortschritte/mp`).set(neueMP);

                // Zielspieler heilen
                firebase.database().ref(`benutzer/${zielSpieler}/fortschritte`).get()
                    .then((zielSnapshot) => {
                        if (zielSnapshot.exists()) {
                            const zielDaten = zielSnapshot.val();
                            const maxHP = berechneMaxHP(zielDaten.level);
                            const neueHP = Math.min(zielDaten.hp + heilung, maxHP);

                            // Aktion-Objekt inkl. Grund und Ziel
                            const aktion = {
                                typ: "heilung",
                                wert: heilung,
                                grund: grund,         // <--- NEU
                                von: currentUser,
                                ziel: zielSpieler,     // <--- NEU
                                zeitpunkt: new Date().toLocaleString()
                            };

                            // 1) Aktion beim Ziel speichern
                            firebase.database().ref(`benutzer/${zielSpieler}/aktionen`).push(aktion);

                            // 2) Aktion zusätzlich im globalen Log "aktionen" speichern
                            firebase.database().ref("aktionen").push(aktion);

                            // HP aktualisieren
                            firebase.database().ref(`benutzer/${zielSpieler}/fortschritte/hp`).set(neueHP);
                        }
                    });
            }
        });
}

// -------------------------------------------------------------------------------------
function ladeAktionen() {
    firebase.database().ref(`benutzer/${currentUser}/aktionen`).get()
        .then((snapshot) => {
            if (snapshot.exists()) {
                const aktionen = snapshot.val();
                const aktionenArray = Object.values(aktionen);

                const aktionenContainer = document.createElement("div");
                aktionenContainer.id = "aktionen-container";
                aktionenContainer.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
                aktionenContainer.style.color = "#FFD700";
                aktionenContainer.style.padding = "10px";
                aktionenContainer.style.borderRadius = "5px";
                aktionenContainer.style.margin = "20px";
                aktionenContainer.style.textAlign = "center";

                aktionenContainer.innerHTML = "<h3>Letzte Aktionen:</h3>";

                aktionenArray.forEach((aktion) => {
                    const aktionElement = document.createElement("p");
                    aktionElement.textContent = `${aktion.typ === "schaden" ? "Schaden" : "Heilung"}: ${aktion.wert} von ${aktion.von} am ${aktion.zeitpunkt}`;
                    aktionenContainer.appendChild(aktionElement);
                });

                const avatarContainer = document.getElementById("avatar-container");
                avatarContainer.appendChild(aktionenContainer);

                // Aktionen nach Anzeige löschen
                firebase.database().ref(`benutzer/${currentUser}/aktionen`).remove();
            } else {
                console.log("Keine Aktionen für den Benutzer vorhanden.");
            }
        })
        .catch((error) => {
            console.error("Fehler beim Laden der Aktionen:", error);
        });
}

function spezialfähigkeitSpeichern(benutzer, ziel, fähigkeit, zeitpunkt) {
    firebase.database().ref("aktionen").push({
        benutzer: benutzer,
        ziel: ziel,
        fähigkeit: fähigkeit,
        zeitpunkt: zeitpunkt,
    }).then(() => {
        console.log("Aktion erfolgreich in Firebase gespeichert.");
        ladeAktionenLog();
    }).catch((error) => {
        console.error("Fehler beim Speichern der Aktion:", error);
    });
}

// -------------------------------------------------------------------------------------
// GEÄNDERT: ladeAktionenLog() zeigt jetzt auch typ=schaden/heilung + grund an
function ladeAktionenLog() {
    const aktionenTabelle = document.getElementById("aktionen-tabelle").querySelector("tbody");

    if (!aktionenTabelle) {
        console.error("Aktionen-Tabelle nicht gefunden!");
        return;
    }

    aktionenTabelle.innerHTML = ""; // Tabelle zurücksetzen

    firebase.database().ref("aktionen").get()
        .then((snapshot) => {
            if (snapshot.exists()) {
                const aktionen = snapshot.val();

                Object.values(aktionen).forEach((aktion) => {
                    const row = document.createElement("tr");

                    // Prüfen, ob es sich um eine "schaden"/"heilung"-Aktion oder um eine Spezialfähigkeit handelt
                    if (aktion.typ === "schaden" || aktion.typ === "heilung") {
                        // Für Schaden/Heilung
                        let text = (aktion.typ === "schaden") ? "Schaden" : "Heilung";
                        text += `: ${aktion.wert}`;
                        if (aktion.grund) {
                            text += ` (Grund: ${aktion.grund})`;
                        }
                        row.innerHTML = `
                            <td>${aktion.zeitpunkt || "Zeit unbekannt"}</td>
                            <td>${aktion.von || "Unbekannt"}</td>
                            <td>${aktion.ziel || "Unbekannt"}</td>
                            <td>${text}</td>
                        `;
                    } else {
                        // Bisherige Logik für Spezialfähigkeiten (fägigkeit + lustigerText/Fehlgeschlagen)
                        const fähigkeitText = aktion.erfolg
                            ? `${aktion.fähigkeit} - ${aktion.lustigerText}`
                            : `${aktion.fähigkeit} - Fehlgeschlagen`;
                        row.innerHTML = `
                            <td>${aktion.zeitpunkt || "Zeit unbekannt"}</td>
                            <td>${aktion.benutzer || aktion.von || "Unbekannt"}</td>
                            <td>${aktion.ziel || "Unbekannt"}</td>
                            <td>${fähigkeitText}</td>
                        `;
                    }

                    aktionenTabelle.appendChild(row);
                });
            } else {
                console.log("Keine Aktionen gefunden.");
            }
        })
        .catch((error) => {
            console.error("Fehler beim Laden der Aktionen:", error);
        });
}

function löscheAlteAktionen() {
    const mitternacht = new Date();
    mitternacht.setHours(0, 0, 0, 0);

    firebase.database().ref("aktionen").get().then((snapshot) => {
        if (snapshot.exists()) {
            const aktionen = snapshot.val();
            Object.keys(aktionen).forEach((key) => {
                const aktion = aktionen[key];
                const zeitpunkt = new Date(aktion.zeitpunkt);

                if (zeitpunkt < mitternacht) {
                    firebase.database().ref(`aktionen/${key}`).remove()
                        .then(() => console.log(`Aktion ${key} erfolgreich gelöscht.`))
                        .catch((error) => console.error("Fehler beim Löschen der Aktion:", error));
                }
            });
        }
    }).catch((error) => {
        console.error("Fehler beim Prüfen der Aktionen:", error);
    });
}

// Löschen jeden Tag um Mitternacht
setInterval(() => {
    löscheAlteAktionen();
}, 24 * 60 * 60 * 1000); // Einmal täglich

function sanitizePath(path) {
    return path
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Entfernt Unicode-Akzentzeichen
        .replace(/[.#$[\]]/g, "_") // Ersetzt verbotene Zeichen
        .replace(/…/g, "...") // Ersetzt „…“ mit normalen drei Punkten
        .replace(/\s+/g, "_"); // Ersetzt Leerzeichen durch "_"
}

function verwendeFähigkeit(fähigkeit, kosten) {
    if (level < kosten) {
        alert("Du hast nicht genug Level, um diese Fähigkeit zu nutzen.");
        return;
    }

    const zielSpieler = document.getElementById("zielspieler-dropdown").value;
    if (!zielSpieler) {
        alert("Bitte wähle einen Spieler aus!");
        return;
    }

    // **Pfad für Firebase bereinigen**
    let bereinigteFähigkeit = sanitizePath(fähigkeit);

    firebase.database().ref(`fähigkeiten/${currentUser}/${bereinigteFähigkeit}`).get()
        .then((snapshot) => {
            const heute = new Date();
            if (snapshot.exists() && heute < new Date(snapshot.val())) {
                alert("Diese Fähigkeit ist noch gesperrt.");
                return;
            }

            // Erfolgswahrscheinlichkeit basierend auf den Kosten
            let erfolgswahrscheinlichkeit;
            if (kosten === 1) {
                erfolgswahrscheinlichkeit = 85;
            } else if (kosten === 2) {
                erfolgswahrscheinlichkeit = 80;
            } else if (kosten === 3) {
                erfolgswahrscheinlichkeit = 75;
            } else {
                erfolgswahrscheinlichkeit = 70;
            }

            // Erfolg oder Misserfolg berechnen
            const randomWert = Math.random() * 100;
            const erfolg = randomWert <= erfolgswahrscheinlichkeit;

            // Level-Kosten abziehen
            console.log(`Fähigkeit: ${fähigkeit}, Kosten: ${kosten}, Level vorher: ${level}`);
            level -= kosten;
            console.log(`Level nachher: ${level}`);

            aktualisiereXPAnzeige();

            let lustigerText = "";
            if (erfolg) {
                // Sperrzeit nur bei Erfolg setzen
                const sperrzeit = kosten > 3 ? 7 : 1;
                const sperrdatum = new Date();
                sperrdatum.setDate(sperrdatum.getDate() + sperrzeit);

                firebase.database().ref(`fähigkeiten/${currentUser}/${bereinigteFähigkeit}`).set(sperrdatum.toISOString());

                // Lustigen Text generieren
                lustigerText = generiereLustigenText(fähigkeit, currentUser, zielSpieler);
            }

            // Animation anzeigen
            zeigeAnimation(erfolg);

            // Logbuch aktualisieren
            const zeitpunkt = new Date().toLocaleString();
            firebase.database().ref("aktionen").push({
                fähigkeit,
                benutzer: currentUser,
                ziel: zielSpieler,
                erfolg,
                zeitpunkt,
                lustigerText
            });

            // Anzeige aktualisieren
            ladeAktionenLog();
        })
        .catch((error) => {
            console.error("Fehler beim Abrufen der Fähigkeit:", error);
        });
}

function generiereLustigenText(fähigkeit, ausführer, ziel) {
    const lustigeTexte = {
        "Massiere mich": `${ziel} zaubert eine Massage, die sogar Steine entspannt. Bravo, ${ausführer}!`,
        "Ich will gekuschelt werden": `${ziel} kuschelt mit ${ausführer}, bis beide wie Teddybären aussehen!`,
        "Mach mir Kaiserschmarren": `${ziel} serviert ${ausführer} den fluffigsten Kaiserschmarren aller Zeiten!`,
        "30 Min Gaming Zeit": `${ziel} schenkt ${ausführer} 30 Minuten pure Gaming-Freude!`,
        "Ich brauche das Auto": `${ziel} überreicht ${ausführer} die Autoschlüssel mit einem strahlenden Lächeln.`,
        "Unendliche Spielzeit": `${ziel} ermöglicht ${ausführer} endloses Spielen – ein Traum wird wahr!`,
        "Ich habe mir eine Auszeit verdient": `${ziel} schickt ${ausführer} auf eine wohlverdiente Pause mit Schokolade!`,
        "Wunsch frei": `${ausführer} erfüllt ${ziel} einen Wunsch mit einer Prise Magie und Liebe!`,
        "TV schauen": `${ausführer} entfaltet den ultimativen "Fernbedienungs-Zauber"! Lass die Serien beginnen!`,
        "TV gucken mit...": `${ziel} und ${ausführer} machen es sich gemütlich und starten einen Serien-Marathon! 🍿🎮`,

        // 🎉 Neue Einträge für Julian
        "Hol mich bitte ab": `${ziel} springt ins Batmobil und rettet ${ausführer} aus dem Alltagstrott! 🦸‍♂️🚗`,
        "Zug fahren mit .....": `${ausführer} und ${ziel} steigen in den Hogwarts Express – doch es geht nur bis zum nächsten Bahnhof. 🚂✨`,
        "Einkaufen fahren mit ....": `${ziel} kutschiert ${ausführer} durch den Supermarkt, während dieser wie ein König auf dem Einkaufswagen thront! 🛒👑`,
        "Wellnessen fahren mit ...": `${ausführer} und ${ziel} entspannen sich königlich im Spa – bis einer im Whirlpool Blubberblasen macht! 💆‍♂️🛀😂`
    };

    return lustigeTexte[fähigkeit] || "Unbekannte Fähigkeit!";
}


function zeigeSpezialfähigkeitenMenu() {
    // Vorheriges Menü entfernen, falls vorhanden
    const bestehendesMenu = document.getElementById("spezial-menu");
    if (bestehendesMenu) {
        document.body.removeChild(bestehendesMenu);
    }

    // Container erstellen
    const spezialMenu = document.createElement('div');
    spezialMenu.id = 'spezial-menu';
    spezialMenu.style.position = 'absolute';
    spezialMenu.style.top = '50%';
    spezialMenu.style.left = '50%';
    spezialMenu.style.transform = 'translate(-50%, -50%)';
    spezialMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    spezialMenu.style.border = '2px solid #FFD700';
    spezialMenu.style.borderRadius = '10px';
    spezialMenu.style.padding = '15px';
    spezialMenu.style.zIndex = '1000';
    spezialMenu.style.width = '80%';
    spezialMenu.style.maxWidth = '500px';
    spezialMenu.style.animation = 'fadeIn 0.5s ease-in-out';

    spezialMenu.innerHTML = `<h3 style="color: #FFD700; text-align: center; margin-bottom: 10px;">Spezialfähigkeiten von ${currentUser}</h3>`;

    // Dropdown für Zielspieler erstellen
    const dropdownLabel = document.createElement("label");
    dropdownLabel.textContent = "Zielspieler auswählen:";
    dropdownLabel.style.display = "block";
    dropdownLabel.style.color = "#FFD700";
    dropdownLabel.style.marginBottom = "10px";

    const spielerDropdown = document.createElement("select");
    spielerDropdown.id = "zielspieler-dropdown";
    spielerDropdown.style.display = "block";
    spielerDropdown.style.margin = "10px auto";
    spielerDropdown.style.width = "100%";
    spielerDropdown.style.padding = "5px";
    spielerDropdown.style.border = "1px solid #FFD700";
    spielerDropdown.style.borderRadius = "5px";

    // Dropdown-Optionen hinzufügen
    const optionDefault = document.createElement("option");
    optionDefault.value = "";
    optionDefault.textContent = "-- Bitte wählen --";
    spielerDropdown.appendChild(optionDefault);

    Object.keys(benutzerDaten).forEach((spieler) => {
        if (spieler !== currentUser) {
            const option = document.createElement("option");
            option.value = spieler;
            option.textContent = spieler;
            spielerDropdown.appendChild(option);
        }
    });

    // Dropdown hinzufügen
    spezialMenu.appendChild(dropdownLabel);
    spezialMenu.appendChild(spielerDropdown);

    // Spezialfähigkeiten anzeigen
    const fähigkeiten = spezialFähigkeitenTexte[currentUser] || [];
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "grid";
    buttonContainer.style.gridTemplateColumns = "repeat(auto-fit, minmax(150px, 1fr))";
    buttonContainer.style.gap = "10px";
    buttonContainer.style.marginTop = "10px";

    fähigkeiten.forEach(fähigkeit => {
        const button = document.createElement('button');
        button.textContent = `${fähigkeit.name} (Kosten: ${fähigkeit.kosten} Level)`;
        button.style.padding = '10px';
        button.style.backgroundColor = '#FFD700';
        button.style.color = '#000';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';
        button.style.textAlign = 'center';
        button.style.height = '50px';
        button.style.display = 'flex';
        button.style.justifyContent = 'center';
        button.style.alignItems = 'center';

        // Event-Listener für die Buttons
        button.onclick = () => {
            verwendeFähigkeit(fähigkeit.name, fähigkeit.kosten);
            if (spezialMenu && spezialMenu.parentNode) {
                spezialMenu.parentNode.removeChild(spezialMenu);
            }
        };

        buttonContainer.appendChild(button);
    });

    // Buttons zum Container hinzufügen
    spezialMenu.appendChild(buttonContainer);

    // Schließen-Button hinzufügen
    const schließenButton = document.createElement('button');
    schließenButton.textContent = 'Schließen';
    schließenButton.style.marginTop = '15px';
    schließenButton.style.padding = '10px';
    schließenButton.style.backgroundColor = '#888';
    schließenButton.style.color = '#FFF';
    schließenButton.style.border = 'none';
    schließenButton.style.borderRadius = '5px';
    schließenButton.style.cursor = 'pointer';
    schließenButton.style.width = '100%';

    schließenButton.onclick = () => {
        if (spezialMenu && spezialMenu.parentNode) {
            spezialMenu.parentNode.removeChild(spezialMenu);
        }
    };

    spezialMenu.appendChild(schließenButton);
    document.body.appendChild(spezialMenu);
}


// Animation (optional)
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
`;
document.head.appendChild(style);

function zeigeAnimation(erfolg) {
    const animationContainer = document.createElement("div");
    animationContainer.style.position = "fixed";
    animationContainer.style.top = "0";
    animationContainer.style.left = "0";
    animationContainer.style.width = "100%";
    animationContainer.style.height = "100%";
    animationContainer.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    animationContainer.style.zIndex = "1000";
    animationContainer.style.display = "flex";
    animationContainer.style.justifyContent = "center";
    animationContainer.style.alignItems = "center";

    const animationImage = document.createElement("img");
    animationImage.src = `avatars/${erfolg ? "Erfolg.gif" : "Misserfolg.gif"}`;
    animationImage.style.maxWidth = "50%";
    animationImage.style.maxHeight = "50%";

    animationContainer.appendChild(animationImage);
    document.body.appendChild(animationContainer);

    setTimeout(() => {
        document.body.removeChild(animationContainer);
    }, 3000); // Animation verschwindet nach 3 Sekunden
}

function setzeFähigkeitenZurück(spieler) {
    if (!spieler) {
        alert("Bitte wähle einen Spieler aus, dessen Fähigkeiten zurückgesetzt werden sollen.");
        return;
    }

    firebase.database().ref(`fähigkeiten/${spieler}`).remove()
        .then(() => {
            alert(`Alle Fähigkeiten von ${spieler} wurden zurückgesetzt und sind jetzt wieder verfügbar.`);
        })
        .catch((error) => {
            console.error("Fehler beim Zurücksetzen der Fähigkeiten:", error);
        });
}

function initialisiereBenutzerDaten(benutzername) {
    firebase.database().ref(`benutzer/${benutzername}/fortschritte`).get()
        .then((snapshot) => {
            if (!snapshot.exists()) {
                const standardWerte = {
                    level: 1,
                    xp: 0,
                    hp: 100,
                    maxHP: 100,
                    mp: 50,
                    maxMP: 50
                };

                firebase.database().ref(`benutzer/${benutzername}/fortschritte`).set(standardWerte)
                    .then(() => console.log(`Benutzerdaten für ${benutzername} neu initialisiert.`))
                    .catch((error) => console.error("Fehler beim Initialisieren der Benutzerdaten:", error));
            } else {
                console.log(`Benutzerdaten für ${benutzername} existieren bereits. Keine Änderungen vorgenommen.`);
            }
        })
        .catch((error) => {
            console.error("Fehler beim Überprüfen der Benutzerdaten:", error);
        });
}

function löscheSpezialfähigkeitenLog() {
    if (confirm("Möchtest du wirklich das gesamte Log der Spezialfähigkeiten löschen?")) {
        firebase.database().ref("aktionen").remove()
            .then(() => {
                alert("Das Log der Spezialfähigkeiten wurde erfolgreich gelöscht.");
                console.log("Log der Spezialfähigkeiten erfolgreich gelöscht.");
                ladeAktionenLog(); // Aktualisiere die Anzeige
            })
            .catch((error) => {
                console.error("Fehler beim Löschen des Logs der Spezialfähigkeiten:", error);
                alert("Ein Fehler ist aufgetreten. Das Log konnte nicht gelöscht werden.");
            });
    }
}

// Zum Schluss Layout aktualisieren
aktualisiereLayout();
