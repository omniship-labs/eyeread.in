/* ============================================================
   eyeread.in · marketing site — developer docs copy (French)
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
      'Packs — extensions JS installables et isolées (sandbox) pour eyeread.in — et Connected apps, l’API locale pour les programmes externes. Le modèle de permissions, et comment en créer un.',
    lead: 'Deux façons d’étendre eyeread.in sans toucher à son code, avec un seul modèle de permissions : les packs s’exécutent dans l’app, dans une sandbox ; les Connected apps sont des programmes séparés qui lui parlent via une API locale.',
    whatHeading: 'Qu’est-ce qu’un pack',
    whatBody: [
      'Un pack est une petite extension JS — un manifeste (pack.json) plus du code — que l’app exécute dans une sandbox verrouillée, sans DOM, sans système de fichiers et sans réseau propre. La seule sortie est un objet global eyeread, conditionné aux permissions que le pack déclare et que l’utilisateur accorde explicitement.',
      'Chaque permission déclarant un accès réseau s’exécute dans sa propre sandbox isolée ; les permissions sans accès réseau partagent une seule sandbox hors ligne. Les packs ne voient ni le code, ni la mémoire, ni le trafic réseau des autres.',
    ],
    permissionsHeading: 'Permissions',
    permissionsIntro:
      'Un pack (comme une Connected app, qui utilise les mêmes noms pour ses scopes d’API) ne déclare que ce dont il a besoin. Rien n’est accordé tant que l’utilisateur ne l’active pas, pack par pack, permission par permission :',
    permissionCol: 'Permission',
    grantsCol: 'Autorise',
    permissions: [
      {
        name: 'scripts:write',
        grants: 'Ajouter un script à la bibliothèque de l’utilisateur.',
      },
      {
        name: 'prompter:load',
        grants: 'Ouvrir un texte dans le prompteur et démarrer une session de lecture.',
      },
      {
        name: 'prompter:control',
        grants: 'Lecture, pause, redémarrage, saut ou fermeture du prompteur.',
      },
      {
        name: 'prompter:events',
        grants: 'Lire l’état en direct du prompteur — seulement pendant une session active.',
      },
      {
        name: 'files:import',
        grants:
          'Demander à l’utilisateur de choisir un fichier via le sélecteur natif de l’app ; le pack ne voit que ce fichier.',
      },
    ],
    permissionsNote:
      'L’accès réseau est désactivé tant qu’une permission ne déclare pas de sites https:// exacts dans pack.json — aucun joker, IP ou localhost. Déclarer un site ne l’active pas : l’utilisateur doit encore l’activer, permission par permission.',
    makeHeading: 'En créer un',
    makeIntro:
      'Tout peut se faire depuis l’app elle-même, dans Settings → Packs → Developer mode : New pack…, rechargement à chaud à l’enregistrement, un journal par pack, et Validate/Build. Il existe aussi un chemin en ligne de commande qui ne nécessite pas d’ouvrir l’app, depuis le dépôt SDK :',
    makeStepsHeading: 'En ligne de commande',
    agentHeading: 'En créer un avec un agent IA',
    agentBody: [
      'Le générateur ci-dessus écrit un AGENTS.md dans chaque nouveau pack — les règles de la sandbox, les champs du manifeste, la forme du handler eyeread.on(...) pour chaque permission, et le workflow validate/build, le tout dans un seul fichier autonome. Aucune installation requise : n’importe quel agent de code qui lit les fichiers du projet (Claude Code, Cursor, Codex, Copilot…) le prend en compte dès qu’il ouvre le dossier.',
      'Les utilisateurs de Claude Code ont aussi accès à un vrai Skill qui se déclenche sur les demandes liées aux packs, même avant qu’un dossier de pack existe, avec l’ensemble de la spec inclus en référence. Installez-le avec n’importe lequel des 75+ agents pris en charge par vercel-labs/skills, pas seulement Claude Code :',
    ],
    verifiedHeading: 'Packs vérifiés',
    verifiedBody:
      'Un pack obtient le badge ✓ Verified by eyeread.in une fois que son mainteneur l’a signé après relecture. En attendant — ou si un pack est publié sans aucune signature — il s’installe en tant que Community, avec un avertissement. Une signature falsifiée ou révoquée bloque totalement l’installation.',
    connectedHeading: 'Connected apps',
    connectedBody: [
      'Si votre intégration est plus simple à écrire comme un programme à part — dans n’importe quel langage — les Connected apps lui donnent les mêmes capacités via une API HTTP locale sur 127.0.0.1, sans que l’app n’exécute jamais votre code. Un appairage en un clic (Allow/Deny), puis appelez scripts:write, prompter:load, prompter:control ou prompter:events avec un jeton (bearer token).',
      'Les navigateurs ne peuvent pas atteindre cette API, par conception (pas de CORS, vérifications Origin/Sec-Fetch-Site) — elle est réservée aux outils natifs : une app d’écriture, une intégration Stream Deck ou pédale au pied, un outil d’enregistrement, un affichage de progression sur un second écran.',
    ],
    moreHeading: 'Référence complète',
    moreBody:
      'La spec complète (schéma de pack.json, l’API eyeread.*, les limites de fichiers et de taille, le protocole HTTP des Connected apps) se trouve dans le dépôt eyeread.in-packs-sdk et dans le docs/PACKS.md de cette app.',
    moreLinks: [
      {
        label: 'omniship-labs/eyeread.in-packs-sdk',
        href: 'https://github.com/omniship-labs/eyeread.in-packs-sdk',
        body: 'la spec, le CLI et le générateur.',
      },
      {
        label: 'docs/PACKS.md',
        href: 'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md',
        body: 'l’API HTTP des Connected apps, en intégralité.',
      },
    ],
  },
};
