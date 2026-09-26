/* ============================================================
   eyeread.in · marketing site — developer docs copy (German)
   ------------------------------------------------------------
   Partial docs bundle: only the `packs` page is translated so
   far (see content.en.js's own header comment for the pattern
   to add more). Missing keys fall back to English automatically
   via i18next fallbackLng — nothing else needs to exist here.

   Kept in English on purpose (feature names, UI paths, code):
   Packs, Connected apps, Verified, Community, Developer mode,
   Settings → Packs → Developer mode, permission names
   (scripts:write, …), pack.json, AGENTS.md, eyeread.on(...),
   agent/tool names, repo names, file paths.
   ============================================================ */
export default {
  packs: {
    nav: 'Packs',
    title: 'Packs',
    description:
      'Packs — installierbare, in einer Sandbox laufende JS-Erweiterungen für eyeread.in — und Connected apps, die lokale API für externe Programme. Das Berechtigungsmodell, und wie man selbst eines baut.',
    lead: 'Zwei Wege, eyeread.in zu erweitern, ohne den Code anzufassen, mit einem gemeinsamen Berechtigungsmodell: Packs laufen innerhalb der App in einer Sandbox; Connected apps sind eigenständige Programme, die über eine lokale API mit ihr sprechen.',
    whatHeading: 'Was ein Pack ist',
    whatBody: [
      'Ein Pack ist eine kleine JS-Erweiterung — ein Manifest (pack.json) plus Code —, die die App in einer abgeriegelten Sandbox ausführt: kein DOM, kein Dateisystem, kein eigenes Netzwerk. Der einzige Weg nach außen ist ein globales eyeread-Objekt, gesteuert über die Berechtigungen, die das Pack deklariert und die der Nutzer explizit erteilt.',
      'Jede Berechtigung mit deklariertem Internetzugriff läuft in ihrer eigenen isolierten Sandbox; Berechtigungen ohne Internetzugriff teilen sich eine Offline-Sandbox. Packs können weder Code, Speicher noch Netzwerkverkehr der anderen sehen.',
    ],
    permissionsHeading: 'Berechtigungen',
    permissionsIntro:
      'Ein Pack (wie auch eine Connected app, die dieselben Namen für ihre API-Scopes verwendet) deklariert nur das, was es wirklich braucht. Nichts wird gewährt, bis der Nutzer es einschaltet — pro Pack, pro Berechtigung:',
    permissionCol: 'Berechtigung',
    grantsCol: 'Gewährt',
    permissions: [
      {
        name: 'scripts:write',
        grants: 'Ein Skript zur Bibliothek des Nutzers hinzufügen.',
      },
      {
        name: 'prompter:load',
        grants: 'Text im Prompter öffnen und eine Lesesitzung starten.',
      },
      {
        name: 'prompter:control',
        grants: 'Abspielen, pausieren, neu starten, springen oder den Prompter schließen.',
      },
      {
        name: 'prompter:events',
        grants: 'Den Live-Status des Prompters lesen — nur während einer aktiven Sitzung.',
      },
      {
        name: 'files:import',
        grants:
          'Den Nutzer bitten, mit dem eigenen Dateiauswahldialog der App eine Datei auszuwählen; das Pack sieht nur diese eine Datei.',
      },
    ],
    permissionsNote:
      'Der Internetzugriff ist standardmäßig aus, bis eine Berechtigung exakte https://-Adressen in pack.json deklariert — keine Wildcards, IPs oder localhost. Das Deklarieren einer Adresse schaltet den Zugriff nicht automatisch frei: Der Nutzer aktiviert ihn weiterhin pro Berechtigung selbst.',
    makeHeading: 'Ein Pack bauen',
    makeIntro:
      'Alles lässt sich direkt in der App erledigen, unter Settings → Packs → Developer mode: New pack…, Live-Reload beim Speichern, ein Log pro Pack sowie Validate/Build. Es gibt auch einen Kommandozeilen-Weg, der die App gar nicht erst öffnen muss, aus dem SDK-Repo:',
    makeStepsHeading: 'Über die Kommandozeile',
    agentHeading: 'Mit einem KI-Agenten bauen',
    agentBody: [
      'Das Scaffold oben schreibt eine AGENTS.md in jedes neue Pack — die Sandbox-Regeln, die Manifestfelder, die Form des eyeread.on(...)-Handlers pro Berechtigung und den Validate/Build-Workflow, alles in einer einzigen, eigenständigen Datei. Ohne jede Einrichtung: Jeder Coding-Agent, der Projektdateien liest (Claude Code, Cursor, Codex, Copilot …), erkennt sie, sobald er den Ordner öffnet.',
      'Claude-Code-Nutzer bekommen außerdem einen vollwertigen Skill, der bei Pack-bezogenen Anfragen auslöst — sogar bevor ein Pack-Ordner überhaupt existiert —, mit der kompletten Spezifikation als Referenz gebündelt. Installierbar mit jedem der 75+ Agenten, die vercel-labs/skills unterstützt, nicht nur mit Claude Code:',
    ],
    verifiedHeading: 'Verifizierte Packs',
    verifiedBody:
      'Ein Pack erhält das Badge ✓ Verified by eyeread.in, sobald der Maintainer es nach einer Prüfung signiert hat. Bis dahin — oder wenn ein Pack ganz ohne Signatur ausgeliefert wird — installiert es sich als Community, mit einer Warnung. Eine manipulierte oder widerrufene Signatur blockiert die Installation vollständig.',
    connectedHeading: 'Connected apps',
    connectedBody: [
      'Wenn sich eine Integration leichter als eigenständiges Programm schreiben lässt — in beliebiger Sprache —, geben Connected apps ihr dieselben Fähigkeiten über eine lokale HTTP-API auf 127.0.0.1, ohne dass die App jemals euren Code ausführt. Einmalig per Ein-Klick-Prompt (Allow/Deny) koppeln, dann scripts:write, prompter:load, prompter:control oder prompter:events mit einem Bearer-Token aufrufen.',
      'Browser können diese API absichtlich nicht erreichen (kein CORS, Origin-/Sec-Fetch-Site-Prüfungen) — sie ist für native Tools gedacht: eine Schreib-App, eine Stream-Deck- oder Fußschalter-Integration, ein Aufnahme-Tool, eine Fortschrittsanzeige auf einem zweiten Bildschirm.',
    ],
    moreHeading: 'Vollständige Referenz',
    moreBody:
      'Die vollständige Spezifikation (pack.json-Schema, die eyeread.*-API, Datei- und Größenlimits, das Connected-apps-HTTP-Protokoll) liegt im eyeread.in-packs-sdk-Repo sowie in der docs/PACKS.md dieser App.',
    moreLinks: [
      {
        label: 'omniship-labs/eyeread.in-packs-sdk',
        href: 'https://github.com/omniship-labs/eyeread.in-packs-sdk',
        body: 'die Spezifikation, die CLI und das Scaffold.',
      },
      {
        label: 'docs/PACKS.md',
        href: 'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md',
        body: 'die Connected-apps-HTTP-API, vollständig.',
      },
    ],
  },
};
