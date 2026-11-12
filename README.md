# Gipfelsprung

Ein eigenständiges 2D-Jump-and-Run mit originaler Pixelgrafik und synthetisch
erzeugter Musik. Keine externen Assets, Bibliotheken, Konten oder Internetverbindung
nötig. Das Spiel liegt vollständig in `C:\Git\Maurins_App`.

## Start auf Windows

1. `Spiel-starten.cmd` doppelklicken.
2. Der Browser öffnet `http://127.0.0.1:8080`.
3. Spielernamen eingeben und eine der fünf Figuren anklicken. Nach
   **3 – 2 – 1 – Los!** beginnt St. Gallen.

Das Serverfenster geöffnet lassen. Mit **Strg+C** beenden. Ist Port 8080 bereits
belegt, im Projektordner starten:

```powershell
.\Spiel-starten.cmd 8081
```

Der Starter kompiliert den kleinen lokalen Server mit dem in Windows enthaltenen
.NET-Framework-Compiler nach `bin/`. Er benötigt keine Downloads, keine
PowerShell-Skriptfreigabe und keine Administratorrechte. Der Server lauscht nur
auf der Loopback-Adresse dieses Computers. Bei späteren Starts wird der kompilierte
Server wiederverwendet. Nach Änderungen an `Server.cs` den laufenden Server beenden
und `bin/Gipfelsprung.Server.exe` löschen, damit der Starter ihn neu erstellt.
Alternativ lässt sich
`index.html` direkt im aktuellen Edge, Chrome oder Firefox öffnen; das Spiel
funktioniert auch ohne Server, die zentrale Bestenliste jedoch nicht. Ein Browser mit JavaScript und Canvas 2D
ist erforderlich. Ton beginnt erst nach einer Benutzeraktion.

## GitHub und Online-Version

Das vorgesehene Repository ist `Tom-Botsberg/Gipfelsprung` und soll **privat**
bleiben. Persönliche Rekorde (`data/`), kompilierte Serverprogramme (`bin/`)
und erzeugte Pages-Dateien (`_site/`) werden nicht versioniert.

GitHub Pages benötigt für private Repositorys einen passenden GitHub-Tarif.
Keine Tarifänderung ist nötig oder automatisch vorgesehen. Die Pages-Spielseite
ist normalerweise **öffentlich**, auch wenn das Repository privat ist.

Wenn der bestehende Tarif Pages unterstützt:

1. Im Repository unter **Settings → Pages → Build and deployment → Source**
   **GitHub Actions** auswählen.
2. Unter **Actions → Publish game to GitHub Pages → Run workflow** die
   Veröffentlichung für `main` manuell starten.
3. Die veröffentlichte Adresse steht im erfolgreichen Deployment.
   Bei diesem Repository wäre sie normalerweise
   `https://tom-botsberg.github.io/Gipfelsprung/`.

Die Online-Version enthält nur Spielgrafik, Spielregeln und Steuerung, **keine
zentrale Bestenliste**. Namen und Ergebnisse werden nicht an die lokale
Bestenlisten-API gesendet. Der Workflow lädt weder Servercode noch persönliche
Rekorde als Webseiten-Dateien hoch. Die lokale Version bleibt unverändert mit
Bestenliste spielbar. Änderungen werden online erst nach einem erneuten
manuellen Workflowstart sichtbar. GitHub kann bei Seitenbesuchen technische
Verbindungsdaten erfassen; siehe die GitHub-Datenschutzerklärung.

## Spielregeln

- **Welten:** St. Gallen, Zürich, Bern, Luzern und Alpen. Plattformen, Lücken und
  Gegner werden zunehmend anspruchsvoller. Die Schweizer Flagge beendet das Level.
- **Figuren:** Fünf eigene Silhouetten und Outfits, sichtbar in der Auswahl und im Spiel:
  Lina mit Wanderhut, Zopf und Rucksack; Noah mit Hoodie und Kopfhörern;
  Mika mit Bommelmütze, Bergbrille und Schal; Maurin mit Sporttrikot, Stirnband
  und kurzen Hosen; Nici mit Pferdeschwanz, langer Jacke und Umhängetasche.
  Alle behalten dieselben Fähigkeiten, Sprunghöhen und Kollisionsflächen.
- **Leben:** Start mit drei Leben. Jede abgeschlossene Welt gibt sofort **ein Herz
  zurück, maximal drei Leben**, auch die Alpenwelt. Gegnerkontakt kostet ein Leben;
  danach bist du zwei Sekunden unverwundbar und spielst weiter. Ein Sturz kostet
  ein Leben und setzt dich mit Countdown an den Anfang des aktuellen Levels zurück.
  Bereits gesammelte Münzen, Munitionspakete und besiegte Gegner bleiben erhalten.
- **Game over:** Erst bei null Leben. Ein Neustart beginnt in St. Gallen, mit
  drei Leben, ohne Münzen, mit Schneebällen und 20 Schüssen. Ein Figurenwechsel
  setzt ebenfalls alles zurück.
- **Gegner:** Von oben draufspringen oder mit einer freigeschalteten Waffe treffen.
- **Waffen:** Schneebälle sind sofort verfügbar. Alle zehn Münzen eine zusätzliche
  permanente Waffe; die neue Waffe wird sofort ausgerüstet. Die fünf Grundtypen sind Schneeball,
  Tannenzapfen, Bergkristall, Föhnwind und Alpenblitz. Danach folgen stärkere,
  separat auswählbare Varianten, sodass auch weitere zehn Münzen eine neue Waffe geben.
- **Munition:** Zu Beginn des Abenteuers 20 Schüsse, normalerweise höchstens 20 im Vorrat.
  Grüne **+10-Pakete** füllen bis zu zehn Schüsse nach und bleiben bei vollem
  Vorrat liegen. Alle Waffen teilen den Vorrat; auch die drei Föhnwind-Projektile
  kosten zusammen nur einen Schuss. Waffenwechsel, neue Waffen und Levelwechsel
  füllen nicht automatisch nach. Sobald der Bosskampf beginnt, wird der Vorrat
  einmalig auf **35 Schüsse** aufgefüllt. Ab dann gilt bis zum Ende der Alpenwelt
  das Limit von 35, auch für Munitionspakete. Ein Sturz oder das erneute Betreten
  der Arena gibt keine weitere Gratisfüllung. Ein neues Abenteuer startet wieder
  mit dem Limit von 20. Auch ohne Munition bleiben Kopfsprünge möglich.
- **Seltene Bomben:** Über verschiedene erhöhte Plattformen verteilt gibt es in
  St. Gallen **2**, Zürich **3**, Bern **4**, Luzern **4** und den Alpen **5**
  goldumrandete Bomben. Mit **B** wirfst du eine
  gesammelte Bombe in Blickrichtung. Nach 1,1 Sekunden explodiert sie im Radius
  von 140 Pixeln: Normale Gegner werden besiegt, der aktive Boss verliert
  10 Lebenspunkte (auch während seines kurzen Trefferblitzens). Die Explosion
  schadet dir nicht. Jede Bombe ist einmal verbrauchbar und braucht keine
  Schussmunition. B halten wirft nicht automatisch weitere Bomben.
  Gesammelte Bomben bleiben bei Stürzen, Levelwechseln und beim Alpen-Cheat erhalten;
  ein neuer Spielversuch beginnt ohne Bomben. Bereits eingesammelte Bomben erscheinen
  nach einem Sturz nicht erneut. Geworfene Bomben werden beim Sturz oder Weltwechsel entfernt.
- **Endgegner:** Der Nebelwächter in der Alpenwelt hat 60 Lebenspunkte, verfolgt
  dich schneller und springt nach dem ersten Angriff alle 2,2 Sekunden. Seine
  Bodenwellen sind schneller. Kopfattacken und Waffen schaden ihm.
  Vor seinem Sprung erscheint weiterhin ein Ausrufezeichen; seine Bodenwellen können
  übersprungen werden. Erst nach seinem Sieg ist die Zielflagge freigegeben.
- Münzen, Waffen, Munition und verbleibende Leben reisen ins nächste Level mit.
- Keine Speicherung von Spielfortschritt: Ein Neuladen beginnt ein neues Abenteuer.

## Zentrale Top-Scorer-Liste

- Vor Spielbeginn einen eigenen Namen mit 1 bis 24 Zeichen eingeben.
- Nach **Game-over** oder **Gipfelsieg** wird der Spielversuch automatisch mit den
  insgesamt gesammelten Münzen gespeichert. Abgebrochene Versuche werden nicht eingetragen.
- Die Oberfläche zeigt die **Top 10**, nach Münzen absteigend. Bei Gleichstand
  steht der früher gespeicherte Versuch vorne. Mehrere Versuche pro Spieler sind erlaubt.
- Die Datei `data/scores.json` auf dem lokalen Server enthält die Ergebnisse.
  Sie bleibt bei Browser- und Serverneustarts erhalten. Zum Sichern diese Datei kopieren.
  Alle Browser auf demselben Spielserver sehen dieselbe Liste; über **Liste
  aktualisieren** werden neue Ergebnisse anderer Browser geladen.
- Fehlgeschlagene Speicherungen werden sichtbar gemeldet und können erneut versucht
  werden. Ein erneuter Versuch mit derselben Spiel-ID erzeugt keinen doppelten Eintrag.
  Vor dem Schliessen des Browsers fehlgeschlagene Speicherungen erneut versuchen.
- Der Server bleibt nur auf diesem Computer erreichbar. Keine Daten werden ins Internet
  übertragen. Beim direkten Öffnen der HTML-Datei steht die zentrale Liste nicht zur Verfügung.

## Tasten

| Aktion | Taste |
|---|---|
| Laufen | Pfeiltasten links/rechts oder A/D |
| Springen | Leertaste, Pfeil hoch oder W (für hohe Sprünge halten) |
| Schiessen | F halten |
| Gesammelte Bombe werfen | B einmal drücken |
| Freigeschaltete Waffen durchschalten | Q |
| Pause / Fortsetzen | Esc oder P |
| Cheat: direkt zur Alpenwelt (Level 5) | 3 und A gleichzeitig halten |
| Ton | Schaltfläche oben rechts |

Beim Verlassen des Browserfensters pausiert das Spiel automatisch.
Der Alpen-Cheat funktioniert im laufenden Spiel, im Countdown und in der Pause,
auch mit der 3 auf dem Nummernblock. Leben, Münzen, Waffen und Munition bleiben
erhalten; übersprungene Welten geben keine Zusatzherzen. In der Namenseingabe
ist der Cheat inaktiv. Bist du bereits in Level 5, wird die Welt nicht neu gestartet.

## Aufbau und Tests

`js/logic.js` enthält die unabhängig von der Darstellung testbare Spielsimulation,
`js/art.js` die eigene Canvas-Grafik und `js/game.js` Steuerung, Oberfläche und Audio.
Die Simulation läuft mit 120 festen Schritten pro Sekunde.

Für die automatisierten Tests `http://127.0.0.1:8080/tests/` öffnen (oder
`tests/index.html` direkt). Die Tests benötigen ebenfalls keine Installation.

Die persistenten Bestenlisten-Tests lassen sich in PowerShell mit dem vorhandenen
Windows-Compiler ausführen:

```powershell
& "$env:SystemRoot\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /reference:System.Web.Extensions.dll /main:ServerTests /out:bin\Gipfelsprung.ServerTests.exe Server.cs tests\server-tests.cs
if ($LASTEXITCODE -eq 0) { & .\bin\Gipfelsprung.ServerTests.exe }
```

Diese Tests verwenden eigene temporäre Dateien und verändern keine echten Rekorde.
