/* ============================================================
   eyeread.in · marketing site — developer docs copy (Malayalam)
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
      'Packs — eyeread.in-നായി ഇൻസ്റ്റാൾ ചെയ്യാവുന്ന, sandbox-ൽ പ്രവർത്തിക്കുന്ന JS എക്സ്റ്റൻഷനുകൾ — കൂടാതെ Connected apps, ബാഹ്യ പ്രോഗ്രാമുകൾക്കുള്ള ലോക്കൽ API. അനുമതി മോഡൽ, ഒപ്പം ഒന്ന് എങ്ങനെ നിർമ്മിക്കാം എന്നും.',
    lead: 'eyeread.in-ന്റെ കോഡ് തൊടാതെ അതിനെ വിപുലീകരിക്കാൻ രണ്ട് വഴികൾ, രണ്ടും ഒരേ അനുമതി മോഡൽ പങ്കിടുന്നു: pack-കൾ ആപ്പിനുള്ളിൽ ഒരു sandbox-ൽ പ്രവർത്തിക്കുന്നു; Connected apps എന്നത് ലോക്കൽ API വഴി ആപ്പുമായി സംസാരിക്കുന്ന വേറിട്ട പ്രോഗ്രാമുകളാണ്.',
    whatHeading: 'pack എന്നാൽ എന്താണ്',
    whatBody: [
      'pack എന്നത് ഒരു ചെറിയ JS എക്സ്റ്റൻഷനാണ് — ഒരു manifest (pack.json) പിന്നെ കുറച്ച് കോഡും — ഇത് ആപ്പ് അടച്ചുപൂട്ടിയ ഒരു sandbox-ൽ പ്രവർത്തിപ്പിക്കുന്നു: DOM ഇല്ല, ഫയൽ സിസ്റ്റം ഇല്ല, സ്വന്തമായി നെറ്റ്‌വർക്കും ഇല്ല. പുറത്തേക്കുള്ള ഒരേയൊരു വഴി ഒരു ഗ്ലോബൽ eyeread ഒബ്ജക്റ്റ് മാത്രമാണ്, ഇത് pack പ്രഖ്യാപിച്ചതും ഉപയോക്താവ് വ്യക്തമായി അനുവദിച്ചതുമായ അനുമതികളിലേക്ക് മാത്രം പരിമിതപ്പെടുത്തിയിരിക്കുന്നു.',
      'നെറ്റ്‌വർക്ക് ആക്സസ് പ്രഖ്യാപിക്കുന്ന ഓരോ അനുമതിയും അതിന്റേതായ പ്രത്യേക, ഒറ്റപ്പെട്ട sandbox-ൽ പ്രവർത്തിക്കുന്നു; നെറ്റ്‌വർക്ക് ഇല്ലാത്ത അനുമതികൾ ഒരൊറ്റ ഓഫ്‌ലൈൻ sandbox പങ്കിടുന്നു. ഒരു pack-ന് മറ്റൊരു pack-ന്റെ കോഡോ മെമ്മറിയോ നെറ്റ്‌വർക്ക് ട്രാഫിക്കോ കാണാൻ കഴിയില്ല.',
    ],
    permissionsHeading: 'അനുമതികൾ',
    permissionsIntro:
      'ഒരു pack (അതുപോലെ അതേ പേരുകൾ തന്നെ തന്റെ API scope-കളായി ഉപയോഗിക്കുന്ന Connected app-ഉം) ആവശ്യമുള്ളത് മാത്രമേ പ്രഖ്യാപിക്കൂ. ഉപയോക്താവ് സ്വയം, ഓരോ pack-നും ഓരോ അനുമതിക്കും പ്രത്യേകം അത് ഓൺ ചെയ്യുന്നത് വരെ ഒന്നും അനുവദിക്കപ്പെടില്ല:',
    permissionCol: 'അനുമതി',
    grantsCol: 'നൽകുന്നത്',
    permissions: [
      {
        name: 'scripts:write',
        grants: 'ഉപയോക്താവിന്റെ ലൈബ്രറിയിലേക്ക് ഒരു സ്ക്രിപ്റ്റ് ചേർക്കുക.',
      },
      {
        name: 'prompter:load',
        grants: 'prompter-ൽ ടെക്സ്റ്റ് തുറന്ന് ഒരു വായന സെഷൻ ആരംഭിക്കുക.',
      },
      {
        name: 'prompter:control',
        grants: 'prompter പ്ലേ, പോസ്, റീസ്റ്റാർട്ട്, സീക്ക് അല്ലെങ്കിൽ ക്ലോസ് ചെയ്യുക.',
      },
      {
        name: 'prompter:events',
        grants: 'prompter-ന്റെ തത്സമയ അവസ്ഥ വായിക്കുക — സെഷൻ സജീവമായിരിക്കുമ്പോൾ മാത്രം.',
      },
      {
        name: 'files:import',
        grants:
          'ആപ്പിന്റെ സ്വന്തം പിക്കർ വഴി ഒരു ഫയൽ തിരഞ്ഞെടുക്കാൻ ഉപയോക്താവിനോട് ആവശ്യപ്പെടുക; ആ ഒരു ഫയൽ മാത്രമേ pack-ന് കാണാൻ കഴിയൂ.',
      },
    ],
    permissionsNote:
      'ഒരു അനുമതി pack.json-ൽ കൃത്യമായ https:// സൈറ്റുകൾ പ്രഖ്യാപിക്കാത്തിടത്തോളം ഇന്റർനെറ്റ് ആക്സസ് ഓഫ് ആയിരിക്കും — വൈൽഡ്കാർഡുകളോ IP വിലാസങ്ങളോ localhost-ഓ അനുവദനീയമല്ല. ഒരു സൈറ്റ് പ്രഖ്യാപിക്കുന്നത് ആക്സസ് താനേ ഓൺ ആക്കില്ല: ഉപയോക്താവ് ഓരോ അനുമതിക്കും അത് പ്രത്യേകം ഓൺ ചെയ്യണം.',
    makeHeading: 'ഒരു pack ഉണ്ടാക്കുക',
    makeIntro:
      'എല്ലാം ആപ്പിൽ തന്നെ ചെയ്യാം, Settings → Packs → Developer mode-ൽ: New pack…, സേവ് ചെയ്യുമ്പോൾ തന്നെ live reload, ഓരോ pack-നും പ്രത്യേക log, കൂടാതെ Validate/Build. ആപ്പ് തുറക്കേണ്ടതില്ലാത്ത ഒരു കമാൻഡ്-ലൈൻ വഴിയും ഉണ്ട്, SDK റെപ്പോയിൽ നിന്ന്:',
    makeStepsHeading: 'കമാൻഡ് ലൈനിൽ നിന്ന്',
    agentHeading: 'ഒരു AI ഏജന്റുമായി നിർമ്മിക്കൽ',
    agentBody: [
      'മുകളിലുള്ള scaffold ഓരോ പുതിയ pack-ലും ഒരു AGENTS.md ഫയൽ എഴുതുന്നു — sandbox നിയമങ്ങൾ, manifest ഫീൽഡുകൾ, ഓരോ അനുമതിക്കുമുള്ള eyeread.on(...) ഹാൻഡ്ലറിന്റെ രൂപം, കൂടാതെ validate/build വർക്ക്ഫ്ലോയും — എല്ലാം ഒരൊറ്റ സ്വയംപര്യാപ്ത ഫയലിൽ. യാതൊരു സെറ്റപ്പും ആവശ്യമില്ല: പ്രോജക്റ്റ് ഫയലുകൾ വായിക്കുന്ന ഏത് കോഡിംഗ് ഏജന്റും (Claude Code, Cursor, Codex, Copilot തുടങ്ങിയവ) ഫോൾഡർ തുറന്ന ഉടനെ അത് തിരിച്ചറിയും.',
      'Claude Code ഉപയോക്താക്കൾക്ക് pack ഫോൾഡർ ഇനിയും നിലവിൽ വരുന്നതിന് മുമ്പ് തന്നെ pack-സംബന്ധമായ അഭ്യർത്ഥനകളിൽ പ്രവർത്തനക്ഷമമാകുന്ന ഒരു പൂർണ്ണ Skill കൂടി ലഭിക്കും, മുഴുവൻ spec-ഉം റഫറൻസായി അതിനൊപ്പം ഉൾപ്പെടുത്തിയിട്ടുണ്ട്. vercel-labs/skills പിന്തുണയ്ക്കുന്ന 75+ ഏജന്റുകളിൽ ഏതിനൊപ്പവും ഇത് ഇൻസ്റ്റാൾ ചെയ്യാം, Claude Code മാത്രമല്ല:',
    ],
    verifiedHeading: 'സ്ഥിരീകരിച്ച pack-കൾ',
    verifiedBody:
      'അവലോകനത്തിന് ശേഷം മെയിന്റെയ്നർ ഒരു pack-ൽ ഒപ്പിടുമ്പോൾ അതിന് ✓ Verified by eyeread.in ബാഡ്ജ് ലഭിക്കുന്നു. അതുവരെ — അല്ലെങ്കിൽ ഒരു pack ഒരു ഒപ്പും ഇല്ലാതെ പുറത്തിറങ്ങിയാൽ — അത് Community ആയി, ഒരു മുന്നറിയിപ്പോടെ ഇൻസ്റ്റാൾ ആകുന്നു. കൃത്രിമം കാണിച്ചതോ റദ്ദാക്കിയതോ ആയ ഒപ്പ് ഇൻസ്റ്റലേഷനെ പൂർണ്ണമായും തടയുന്നു.',
    connectedHeading: 'Connected apps',
    connectedBody: [
      'നിങ്ങളുടെ ഇന്റഗ്രേഷൻ ഒരു പ്രത്യേക പ്രോഗ്രാമായി എഴുതുന്നതാണ് എളുപ്പമെങ്കിൽ — ഏത് ഭാഷയിലും — Connected apps 127.0.0.1-ൽ ഒരു ലോക്കൽ HTTP API വഴി അതേ കഴിവുകൾ അതിന് നൽകുന്നു, ആപ്പ് നിങ്ങളുടെ കോഡ് ഒരിക്കലും പ്രവർത്തിപ്പിക്കില്ല. ഒറ്റത്തവണ ഒരു ക്ലിക്ക് പ്രോംപ്റ്റിലൂടെ (Allow/Deny) ജോടിയാക്കുക, പിന്നീട് bearer token ഉപയോഗിച്ച് scripts:write, prompter:load, prompter:control അല്ലെങ്കിൽ prompter:events വിളിക്കുക.',
      'ബ്രൗസറുകൾക്ക് രൂപകൽപ്പന പ്രകാരം തന്നെ ഈ API-യിൽ എത്തിച്ചേരാൻ കഴിയില്ല (CORS ഇല്ല, Origin/Sec-Fetch-Site പരിശോധിക്കുന്നു) — ഇത് നേറ്റീവ് ടൂളുകൾക്ക് വേണ്ടിയുള്ളതാണ്: ഒരു എഴുത്ത് ആപ്പ്, Stream Deck അല്ലെങ്കിൽ foot-pedal ഇന്റഗ്രേഷൻ, ഒരു റെക്കോർഡിംഗ് ടൂൾ, അല്ലെങ്കിൽ ഒരു പ്രൊഡ്യൂസർക്കോ രണ്ടാം സ്ക്രീനിനോ വേണ്ടിയുള്ള പുരോഗതി ഡിസ്പ്ലേ.',
    ],
    moreHeading: 'പൂർണ്ണ റഫറൻസ്',
    moreBody:
      'പൂർണ്ണ spec (pack.json സ്കീമ, eyeread.* API, ഫയൽ, വലുപ്പ പരിധികൾ, Connected apps-ന്റെ HTTP പ്രോട്ടോക്കോൾ) eyeread.in-packs-sdk റെപ്പോയിലും ഈ ആപ്പിന്റെ സ്വന്തം docs/PACKS.md-ലും ഉണ്ട്.',
    moreLinks: [
      {
        label: 'omniship-labs/eyeread.in-packs-sdk',
        href: 'https://github.com/omniship-labs/eyeread.in-packs-sdk',
        body: 'spec, CLI, കൂടാതെ scaffold.',
      },
      {
        label: 'docs/PACKS.md',
        href: 'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md',
        body: 'Connected apps-ന്റെ സമ്പൂർണ്ണ HTTP API.',
      },
    ],
  },
};
