/* ============================================================
   eyeread.in · marketing site — developer docs copy (Marathi)
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
      'Packs — eyeread.in साठी इन्स्टॉल करता येणारे, sandbox मध्ये चालणारे JS एक्स्टेन्शन्स — आणि Connected apps, बाह्य प्रोग्रामसाठी लोकल API. परवानगी मॉडेल, आणि स्वतःचा pack कसा तयार करायचा.',
    lead: 'eyeread.in चा कोड न बदलता तो वाढवण्याचे दोन मार्ग, दोन्ही एकाच परवानगी मॉडेलवर आधारित: pack अॅपच्या आत एका sandbox मध्ये चालतात; Connected apps ही वेगळी प्रोग्राम्स असतात जी लोकल API द्वारे अॅपशी संवाद साधतात.',
    whatHeading: 'pack म्हणजे काय',
    whatBody: [
      'pack हे एक छोटे JS एक्स्टेन्शन आहे — एक manifest (pack.json) आणि काही कोड — जे अॅप एका बंदिस्त sandbox मध्ये चालवते: DOM नाही, फाईल सिस्टम नाही, स्वतःचे नेटवर्कही नाही. बाहेर जाण्याचा एकमेव मार्ग म्हणजे एक ग्लोबल eyeread ऑब्जेक्ट, जो फक्त pack ने जाहीर केलेल्या आणि युजरने स्पष्टपणे मंजूर केलेल्या परवानग्यांपुरता मर्यादित असतो.',
      'नेटवर्क अॅक्सेस जाहीर करणारी प्रत्येक परवानगी स्वतःच्या वेगळ्या, आयसोलेटेड sandbox मध्ये चालते; नेटवर्कशिवाय असलेल्या परवानग्या एकाच ऑफलाइन sandbox मध्ये एकत्र चालतात. एक pack दुसऱ्या pack चा कोड, मेमरी किंवा नेटवर्क ट्रॅफिक पाहू शकत नाही.',
    ],
    permissionsHeading: 'परवानग्या',
    permissionsIntro:
      'pack (आणि तेच नाव API scope साठी वापरणारी Connected app) फक्त त्याला आवश्यक तेवढ्याच परवानग्या जाहीर करते. युजर स्वतः, प्रत्येक pack आणि प्रत्येक परवानगीसाठी वेगळी ती चालू करत नाही तोपर्यंत काहीही दिलं जात नाही:',
    permissionCol: 'परवानगी',
    grantsCol: 'देते',
    permissions: [
      { name: 'scripts:write', grants: 'युजरच्या लायब्ररीत एक स्क्रिप्ट जोडणे.' },
      {
        name: 'prompter:load',
        grants: 'prompter मध्ये मजकूर उघडणे आणि वाचनाचे सेशन सुरू करणे.',
      },
      {
        name: 'prompter:control',
        grants: 'prompter प्ले, पॉज, रीस्टार्ट, सीक किंवा बंद करणे.',
      },
      {
        name: 'prompter:events',
        grants: 'prompter ची लाईव्ह स्थिती वाचणे — फक्त सेशन सुरू असतानाच.',
      },
      {
        name: 'files:import',
        grants: 'युजरला अॅपच्याच पिकरमधून फाईल निवडायला सांगणे; pack ला फक्त तीच फाईल दिसते.',
      },
    ],
    permissionsNote:
      'एखादी परवानगी pack.json मध्ये अचूक https:// साइट जाहीर करत नाही तोपर्यंत इंटरनेट अॅक्सेस बंदच असतो — वाईल्डकार्ड, IP किंवा localhost चालत नाही. साइट जाहीर केल्याने अॅक्सेस आपोआप सुरू होत नाही: युजरला ते प्रत्येक परवानगीसाठी स्वतः चालू करावे लागते.',
    makeHeading: 'pack तयार करा',
    makeIntro:
      'सर्व काही अॅपमध्येच, Settings → Packs → Developer mode मधून करता येते: New pack…, सेव्ह करताच लाईव्ह रीलोड, प्रत्येक pack साठी स्वतंत्र लॉग, आणि Validate/Build. याशिवाय अॅप न उघडताही SDK रिपॉझिटरीमधून कमांड-लाईन मार्ग उपलब्ध आहे:',
    makeStepsHeading: 'कमांड लाईनवरून',
    agentHeading: 'AI एजंटच्या मदतीने pack तयार करणे',
    agentBody: [
      'वरील स्कॅफोल्ड प्रत्येक नव्या pack मध्ये एक AGENTS.md फाईल लिहितो — sandbox चे नियम, manifest चे फील्ड्स, प्रत्येक परवानगीसाठी eyeread.on(...) हँडलरचा आकार, आणि validate/build वर्कफ्लो — सर्व एकाच स्वयंपूर्ण फाईलमध्ये. यासाठी कोणतीही सेटअप गरज नाही: प्रोजेक्ट फाईल्स वाचणारा कोणताही कोडिंग एजंट (Claude Code, Cursor, Codex, Copilot इ.) फोल्डर उघडताच तो ओळखतो.',
      'Claude Code युजर्सना एक पूर्ण Skill देखील मिळतो जो pack-संबंधित विनंत्यांवर सक्रिय होतो, अगदी pack फोल्डर अस्तित्वात येण्याआधीही, आणि त्यात संपूर्ण spec संदर्भ म्हणून समाविष्ट असते. vercel-labs/skills समर्थित 75+ एजंट्सपैकी कोणत्याही सोबत तो इन्स्टॉल करता येतो, फक्त Claude Code नव्हे:',
    ],
    verifiedHeading: 'Verified pack',
    verifiedBody:
      'रिव्ह्यूनंतर मेंटेनरने pack वर सही केली की त्याला ✓ Verified by eyeread.in बॅज मिळतो. तोपर्यंत — किंवा एखादा pack कोणत्याही सहीशिवायच प्रकाशित झाला — तर तो Community म्हणून, इशाऱ्यासह इन्स्टॉल होतो. छेडछाड झालेली किंवा रद्द केलेली सही इन्स्टॉलेशन पूर्णपणे थांबवते.',
    connectedHeading: 'Connected apps',
    connectedBody: [
      'तुमचे इंटिग्रेशन एक वेगळे प्रोग्राम म्हणून लिहिणे सोपे असेल — कोणत्याही भाषेत — तर Connected apps त्याला 127.0.0.1 वरील लोकल HTTP API द्वारे तीच क्षमता देते, आणि अॅप तुमचा कोड कधीही चालवत नाही. एकदाच वन-क्लिक प्रॉम्प्टने (Allow/Deny) जोडणी करा, मग bearer token सह scripts:write, prompter:load, prompter:control किंवा prompter:events कॉल करा.',
      'ब्राउझर मुद्दामच या API पर्यंत पोहोचू शकत नाहीत (CORS नाही, Origin/Sec-Fetch-Site तपासले जाते) — हे नेटिव्ह साधनांसाठी आहे: एखादे लेखन अॅप, Stream Deck किंवा फूट-पेडल इंटिग्रेशन, रेकॉर्डिंग टूल, किंवा प्रोड्युसर/दुसऱ्या स्क्रीनसाठी प्रोग्रेस डिस्प्ले.',
    ],
    moreHeading: 'संपूर्ण संदर्भ',
    moreBody:
      'संपूर्ण spec (pack.json स्कीमा, eyeread.* API, फाईल आणि साइज मर्यादा, Connected apps चा HTTP प्रोटोकॉल) eyeread.in-packs-sdk रिपॉझिटरीत आणि या अॅपच्या स्वतःच्या docs/PACKS.md मध्ये उपलब्ध आहे.',
    moreLinks: [
      {
        label: 'omniship-labs/eyeread.in-packs-sdk',
        href: 'https://github.com/omniship-labs/eyeread.in-packs-sdk',
        body: 'spec, CLI, आणि scaffold.',
      },
      {
        label: 'docs/PACKS.md',
        href: 'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md',
        body: 'Connected apps चा संपूर्ण HTTP API.',
      },
    ],
  },
};
