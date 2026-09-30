/* ============================================================
   eyeread.in · marketing site — developer docs copy (Kannada)
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
      'Packs — eyeread.in ಗಾಗಿ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಬಹುದಾದ, sandbox ನಲ್ಲಿ ಚಾಲನೆಯಾಗುವ JS ಎಕ್ಸ್‌ಟೆನ್ಶನ್‌ಗಳು — ಮತ್ತು Connected apps, ಬಾಹ್ಯ ಪ್ರೋಗ್ರಾಂಗಳಿಗಾಗಿ ಲೋಕಲ್ API. ಅನುಮತಿ ಮಾದರಿ, ಮತ್ತು ಒಂದನ್ನು ಹೇಗೆ ನಿರ್ಮಿಸುವುದು.',
    lead: 'eyeread.in ನ ಕೋಡ್‌ಅನ್ನು ಮುಟ್ಟದೆ ಅದನ್ನು ವಿಸ್ತರಿಸಲು ಎರಡು ಮಾರ್ಗಗಳು, ಎರಡೂ ಒಂದೇ ಅನುಮತಿ ಮಾದರಿಯನ್ನು ಹಂಚಿಕೊಳ್ಳುತ್ತವೆ: pack ಗಳು ಆ್ಯಪ್‌ನ ಒಳಗೆ ಒಂದು sandbox ನಲ್ಲಿ ಚಾಲನೆಯಾಗುತ್ತವೆ; Connected apps ಎಂಬುದು ಲೋಕಲ್ API ಮೂಲಕ ಆ್ಯಪ್‌ನೊಂದಿಗೆ ಮಾತನಾಡುವ ಪ್ರತ್ಯೇಕ ಪ್ರೋಗ್ರಾಂಗಳು.',
    whatHeading: 'pack ಎಂದರೇನು',
    whatBody: [
      'pack ಎಂಬುದು ಒಂದು ಚಿಕ್ಕ JS ಎಕ್ಸ್‌ಟೆನ್ಶನ್ — ಒಂದು manifest (pack.json) ಮತ್ತು ಸ್ವಲ್ಪ ಕೋಡ್ — ಇದನ್ನು ಆ್ಯಪ್ ಒಂದು ಮುಚ್ಚಿದ sandbox ನಲ್ಲಿ ಚಲಾಯಿಸುತ್ತದೆ: DOM ಇಲ್ಲ, ಫೈಲ್ ಸಿಸ್ಟಂ ಇಲ್ಲ, ಸ್ವಂತ ನೆಟ್‌ವರ್ಕ್ ಕೂಡ ಇಲ್ಲ. ಹೊರಗೆ ಹೋಗಲು ಇರುವ ಏಕೈಕ ದಾರಿ ಎಂದರೆ ಒಂದು global eyeread ಆಬ್ಜೆಕ್ಟ್ ಮಾತ್ರ, ಇದು pack ಘೋಷಿಸಿದ ಮತ್ತು ಬಳಕೆದಾರರು ಸ್ಪಷ್ಟವಾಗಿ ಅನುಮತಿಸಿದ ಅನುಮತಿಗಳಿಗೆ ಮಾತ್ರ ಸೀಮಿತವಾಗಿದೆ.',
      'ನೆಟ್‌ವರ್ಕ್ ಆಕ್ಸೆಸ್‌ಅನ್ನು ಘೋಷಿಸುವ ಪ್ರತಿಯೊಂದು ಅನುಮತಿಯೂ ತನ್ನದೇ ಆದ ಪ್ರತ್ಯೇಕ sandbox ನಲ್ಲಿ ಚಾಲನೆಯಾಗುತ್ತದೆ; ನೆಟ್‌ವರ್ಕ್ ಇಲ್ಲದ ಅನುಮತಿಗಳು ಒಂದೇ ಆಫ್‌ಲೈನ್ sandbox ಅನ್ನು ಹಂಚಿಕೊಳ್ಳುತ್ತವೆ. ಒಂದು pack ಮತ್ತೊಂದು pack ನ ಕೋಡ್, ಮೆಮೊರಿ ಅಥವಾ ನೆಟ್‌ವರ್ಕ್ ಟ್ರಾಫಿಕ್‌ಅನ್ನು ನೋಡಲಾಗುವುದಿಲ್ಲ.',
    ],
    permissionsHeading: 'ಅನುಮತಿಗಳು',
    permissionsIntro:
      'ಒಂದು pack (ಮತ್ತು ಅದೇ ಹೆಸರುಗಳನ್ನು ತನ್ನ API scope ಗಳಾಗಿ ಬಳಸುವ Connected app) ತನಗೆ ಬೇಕಾದುದನ್ನು ಮಾತ್ರ ಘೋಷಿಸುತ್ತದೆ. ಬಳಕೆದಾರರು ಸ್ವತಃ, ಪ್ರತಿ pack ಗೆ, ಪ್ರತಿ ಅನುಮತಿಗೆ ಪ್ರತ್ಯೇಕವಾಗಿ ಅದನ್ನು ಆನ್ ಮಾಡುವವರೆಗೆ ಏನನ್ನೂ ನೀಡಲಾಗುವುದಿಲ್ಲ:',
    permissionCol: 'ಅನುಮತಿ',
    grantsCol: 'ನೀಡುವುದು',
    permissions: [
      { name: 'scripts:write', grants: 'ಬಳಕೆದಾರರ ಲೈಬ್ರರಿಗೆ ಒಂದು ಸ್ಕ್ರಿಪ್ಟ್ ಸೇರಿಸುವುದು.' },
      {
        name: 'prompter:load',
        grants: 'prompter ನಲ್ಲಿ ಪಠ್ಯವನ್ನು ತೆರೆದು ಓದುವ ಸೆಷನ್‌ಅನ್ನು ಪ್ರಾರಂಭಿಸುವುದು.',
      },
      {
        name: 'prompter:control',
        grants: 'prompter ಅನ್ನು ಪ್ಲೇ, ಪಾಸ್, ರೀಸ್ಟಾರ್ಟ್, ಸೀಕ್ ಅಥವಾ ಕ್ಲೋಸ್ ಮಾಡುವುದು.',
      },
      {
        name: 'prompter:events',
        grants: 'prompter ನ ಲೈವ್ ಸ್ಥಿತಿಯನ್ನು ಓದುವುದು — ಸೆಷನ್ ಸಕ್ರಿಯವಾಗಿರುವಾಗ ಮಾತ್ರ.',
      },
      {
        name: 'files:import',
        grants:
          'ಆ್ಯಪ್‌ನ ಸ್ವಂತ ಪಿಕರ್ ಮೂಲಕ ಒಂದು ಫೈಲ್ ಆಯ್ಕೆಮಾಡಲು ಬಳಕೆದಾರರನ್ನು ಕೇಳುವುದು; pack ಗೆ ಆ ಒಂದೇ ಫೈಲ್ ಮಾತ್ರ ಕಾಣಿಸುತ್ತದೆ.',
      },
    ],
    permissionsNote:
      'ಒಂದು ಅನುಮತಿ pack.json ನಲ್ಲಿ ನಿಖರವಾದ https:// ಸೈಟ್‌ಗಳನ್ನು ಘೋಷಿಸದ ಹೊರತು ಇಂಟರ್ನೆಟ್ ಆಕ್ಸೆಸ್ ಆಫ್ ಆಗಿಯೇ ಇರುತ್ತದೆ — ವೈಲ್ಡ್‌ಕಾರ್ಡ್‌ಗಳು, IP ವಿಳಾಸಗಳು ಅಥವಾ localhost ಕೆಲಸ ಮಾಡುವುದಿಲ್ಲ. ಒಂದು ಸೈಟ್ ಘೋಷಿಸುವುದರಿಂದ ಆಕ್ಸೆಸ್ ತಾನಾಗಿಯೇ ಆನ್ ಆಗುವುದಿಲ್ಲ: ಬಳಕೆದಾರರು ಪ್ರತಿ ಅನುಮತಿಗೆ ಅದನ್ನು ಪ್ರತ್ಯೇಕವಾಗಿ ಆನ್ ಮಾಡಬೇಕು.',
    makeHeading: 'ಒಂದು pack ರಚಿಸಿ',
    makeIntro:
      'ಎಲ್ಲವನ್ನೂ ಆ್ಯಪ್‌ನಲ್ಲಿಯೇ ಮಾಡಬಹುದು, Settings → Packs → Developer mode ನಲ್ಲಿ: New pack…, ಸೇವ್ ಮಾಡಿದ ಕೂಡಲೇ live reload, ಪ್ರತಿ pack ಗೆ ಪ್ರತ್ಯೇಕ log, ಮತ್ತು Validate/Build. ಆ್ಯಪ್ ತೆರೆಯುವ ಅಗತ್ಯವಿಲ್ಲದ command-line ಮಾರ್ಗವೂ ಇದೆ, SDK ರೆಪೊಸಿಟರಿಯಿಂದ:',
    makeStepsHeading: 'Command line ಇಂದ',
    agentHeading: 'AI ಏಜೆಂಟ್‌ನೊಂದಿಗೆ ಒಂದನ್ನು ನಿರ್ಮಿಸುವುದು',
    agentBody: [
      'ಮೇಲಿನ scaffold ಪ್ರತಿ ಹೊಸ pack ನಲ್ಲಿ ಒಂದು AGENTS.md ಫೈಲ್‌ಅನ್ನು ಬರೆಯುತ್ತದೆ — sandbox ನಿಯಮಗಳು, manifest ಫೀಲ್ಡ್‌ಗಳು, ಪ್ರತಿ ಅನುಮತಿಗೆ eyeread.on(...) ಹ್ಯಾಂಡ್ಲರ್‌ನ ಆಕಾರ, ಮತ್ತು validate/build ವರ್ಕ್‌ಫ್ಲೋ — ಎಲ್ಲವೂ ಒಂದೇ ಸ್ವಯಂಪೂರ್ಣ ಫೈಲ್‌ನಲ್ಲಿ. ಯಾವುದೇ ಸೆಟಪ್ ಬೇಕಾಗಿಲ್ಲ: ಪ್ರಾಜೆಕ್ಟ್ ಫೈಲ್‌ಗಳನ್ನು ಓದುವ ಯಾವುದೇ coding agent (Claude Code, Cursor, Codex, Copilot ಮುಂತಾದವು) ಫೋಲ್ಡರ್ ತೆರೆದ ಕೂಡಲೇ ಅದನ್ನು ಗುರುತಿಸುತ್ತದೆ.',
      'Claude Code ಬಳಕೆದಾರರಿಗೆ pack ಫೋಲ್ಡರ್ ಇನ್ನೂ ಅಸ್ತಿತ್ವದಲ್ಲಿಲ್ಲದಿದ್ದರೂ pack-ಸಂಬಂಧಿತ ವಿನಂತಿಗಳ ಮೇಲೆ ಸಕ್ರಿಯಗೊಳ್ಳುವ ಸಂಪೂರ್ಣ Skill ಕೂಡ ಸಿಗುತ್ತದೆ, ಪೂರ್ಣ spec ಅನ್ನು ಉಲ್ಲೇಖವಾಗಿ ಒಳಗೊಂಡಿರುತ್ತದೆ. vercel-labs/skills ಬೆಂಬಲಿಸುವ 75+ ಏಜೆಂಟ್‌ಗಳಲ್ಲಿ ಯಾವುದರೊಂದಿಗಾದರೂ ಇದನ್ನು ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಬಹುದು, ಕೇವಲ Claude Code ಮಾತ್ರವಲ್ಲ:',
    ],
    verifiedHeading: 'ಪರಿಶೀಲಿಸಲಾದ pack ಗಳು',
    verifiedBody:
      'ಪರಿಶೀಲನೆಯ ನಂತರ ನಿರ್ವಾಹಕರು ಒಂದು pack ಗೆ ಸಹಿ ಮಾಡಿದಾಗ ಅದು ✓ Verified by eyeread.in ಬ್ಯಾಡ್ಜ್ ಪಡೆಯುತ್ತದೆ. ಅಲ್ಲಿಯವರೆಗೆ — ಅಥವಾ ಒಂದು pack ಯಾವುದೇ ಸಹಿ ಇಲ್ಲದೆ ಬಿಡುಗಡೆಯಾದರೆ — ಅದು Community ಎಂದು, ಎಚ್ಚರಿಕೆಯೊಂದಿಗೆ ಇನ್‌ಸ್ಟಾಲ್ ಆಗುತ್ತದೆ. ತಿದ್ದಲ್ಪಟ್ಟ ಅಥವಾ ರದ್ದುಗೊಳಿಸಲಾದ ಸಹಿ ಇನ್‌ಸ್ಟಾಲೇಶನ್‌ಅನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ತಡೆಯುತ್ತದೆ.',
    connectedHeading: 'Connected apps',
    connectedBody: [
      'ನಿಮ್ಮ ಇಂಟಿಗ್ರೇಶನ್‌ಅನ್ನು ಪ್ರತ್ಯೇಕ ಪ್ರೋಗ್ರಾಂ ಆಗಿ ಬರೆಯುವುದು ಸುಲಭವಾಗಿದ್ದರೆ — ಯಾವುದೇ ಭಾಷೆಯಲ್ಲಿ — Connected apps ಅದಕ್ಕೆ 127.0.0.1 ನಲ್ಲಿ ಒಂದು local HTTP API ಮೂಲಕ ಅದೇ ಸಾಮರ್ಥ್ಯಗಳನ್ನು ನೀಡುತ್ತದೆ, ಆ್ಯಪ್ ನಿಮ್ಮ ಕೋಡ್‌ಅನ್ನು ಎಂದಿಗೂ ಚಲಾಯಿಸುವುದಿಲ್ಲ. ಒಮ್ಮೆ ಒಂದು ಕ್ಲಿಕ್ ಪ್ರಾಂಪ್ಟ್ (Allow/Deny) ಮೂಲಕ ಜೋಡಿಸಿ, ನಂತರ bearer token ನೊಂದಿಗೆ scripts:write, prompter:load, prompter:control ಅಥವಾ prompter:events ಅನ್ನು ಕರೆಯಿರಿ.',
      'ಬ್ರೌಸರ್‌ಗಳು ಉದ್ದೇಶಪೂರ್ವಕವಾಗಿಯೇ ಈ API ಅನ್ನು ತಲುಪಲು ಸಾಧ್ಯವಿಲ್ಲ (CORS ಇಲ್ಲ, Origin/Sec-Fetch-Site ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ) — ಇದು ನೇಟಿವ್ ಟೂಲ್‌ಗಳಿಗಾಗಿ: ಒಂದು ಬರವಣಿಗೆ ಆ್ಯಪ್, Stream Deck ಅಥವಾ foot-pedal ಇಂಟಿಗ್ರೇಶನ್, ಒಂದು ರೆಕಾರ್ಡಿಂಗ್ ಟೂಲ್, ಅಥವಾ ಪ್ರೊಡ್ಯೂಸರ್/ಎರಡನೇ ಪರದೆಗಾಗಿ ಪ್ರೋಗ್ರೆಸ್ ಡಿಸ್‌ಪ್ಲೇ.',
    ],
    moreHeading: 'ಸಂಪೂರ್ಣ ಉಲ್ಲೇಖ',
    moreBody:
      'ಸಂಪೂರ್ಣ spec (pack.json ಸ್ಕೀಮಾ, eyeread.* API, ಫೈಲ್ ಮತ್ತು ಗಾತ್ರದ ಮಿತಿಗಳು, Connected apps ನ HTTP ಪ್ರೋಟೋಕಾಲ್) eyeread.in-packs-sdk ರೆಪೊಸಿಟರಿಯಲ್ಲಿ ಮತ್ತು ಈ ಆ್ಯಪ್‌ನ ಸ್ವಂತ docs/PACKS.md ನಲ್ಲಿ ಇದೆ.',
    moreLinks: [
      {
        label: 'omniship-labs/eyeread.in-packs-sdk',
        href: 'https://github.com/omniship-labs/eyeread.in-packs-sdk',
        body: 'spec, CLI, ಮತ್ತು scaffold.',
      },
      {
        label: 'docs/PACKS.md',
        href: 'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md',
        body: 'Connected apps ನ ಸಂಪೂರ್ಣ HTTP API.',
      },
    ],
  },
};
