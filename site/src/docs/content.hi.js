/* ============================================================
   eyeread.in · marketing site — developer docs copy (Hindi)
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
      'Packs — eyeread.in के लिए इंस्टॉल किए जा सकने वाले, sandbox में चलने वाले JS एक्सटेंशन — और Connected apps, बाहरी प्रोग्राम्स के लिए लोकल API। परमिशन मॉडल, और अपना खुद का pack कैसे बनाएँ।',
    lead: 'eyeread.in का कोड छुए बिना उसे बढ़ाने के दो तरीके, दोनों एक ही परमिशन मॉडल शेयर करते हैं: pack ऐप के अंदर एक sandbox में चलते हैं; Connected apps अलग प्रोग्राम होते हैं जो लोकल API के ज़रिए ऐप से बात करते हैं।',
    whatHeading: 'pack क्या होता है',
    whatBody: [
      'pack एक छोटा JS एक्सटेंशन है — एक manifest (pack.json) और कुछ कोड — जिसे ऐप एक लॉक्ड-डाउन sandbox में चलाता है: न कोई DOM, न फाइल सिस्टम, न ही अपना कोई नेटवर्क। बाहर निकलने का एकमात्र रास्ता एक ग्लोबल eyeread ऑब्जेक्ट है, जो केवल उन्हीं परमिशन तक सीमित है जो pack ने घोषित की हैं और जिन्हें यूज़र ने साफ़ तौर पर मंज़ूरी दी है।',
      'नेटवर्क एक्सेस घोषित करने वाली हर परमिशन अपने अलग, आइसोलेटेड sandbox में चलती है; बिना नेटवर्क वाली परमिशन एक साझा ऑफ़लाइन sandbox में चलती हैं। एक pack दूसरे pack का कोड, मेमोरी या नेटवर्क ट्रैफ़िक नहीं देख सकता।',
    ],
    permissionsHeading: 'परमिशन',
    permissionsIntro:
      'pack (और Connected app, जो अपने API scope के लिए वही नाम इस्तेमाल करती है) सिर्फ़ उतनी ही परमिशन घोषित करता है जितनी उसे चाहिए। जब तक यूज़र खुद, हर pack और हर परमिशन के लिए अलग से उसे ऑन नहीं करता, तब तक कुछ भी अनुमत नहीं होता:',
    permissionCol: 'परमिशन',
    grantsCol: 'देता है',
    permissions: [
      { name: 'scripts:write', grants: 'यूज़र की लाइब्रेरी में एक स्क्रिप्ट जोड़ना।' },
      {
        name: 'prompter:load',
        grants: 'prompter में टेक्स्ट खोलना और एक रीडिंग सेशन शुरू करना।',
      },
      {
        name: 'prompter:control',
        grants: 'prompter को प्ले, पॉज़, रीस्टार्ट, सीक या बंद करना।',
      },
      {
        name: 'prompter:events',
        grants: 'prompter की लाइव स्थिति पढ़ना — सिर्फ़ तब जब सेशन एक्टिव हो।',
      },
      {
        name: 'files:import',
        grants:
          'यूज़र से ऐप के अपने पिकर से एक फ़ाइल चुनने को कहना; pack को सिर्फ़ वही फ़ाइल दिखती है।',
      },
    ],
    permissionsNote:
      'इंटरनेट एक्सेस तब तक बंद रहता है जब तक कोई परमिशन pack.json में सटीक https:// साइट घोषित न करे — कोई वाइल्डकार्ड, IP या localhost नहीं चलता। कोई साइट घोषित करने से एक्सेस अपने आप ऑन नहीं हो जाता: यूज़र को हर परमिशन के लिए अलग से इसे ऑन करना होता है।',
    makeHeading: 'एक pack बनाएँ',
    makeIntro:
      'सब कुछ सीधे ऐप में, Settings → Packs → Developer mode से किया जा सकता है: New pack…, सेव करते ही लाइव रीलोड, हर pack का अपना लॉग, और Validate/Build। इसके अलावा एक कमांड-लाइन तरीका भी है जिसमें ऐप खोलने की ज़रूरत नहीं, SDK रिपॉज़िटरी से:',
    makeStepsHeading: 'कमांड लाइन से',
    agentHeading: 'AI एजेंट के साथ pack बनाना',
    agentBody: [
      'ऊपर वाला स्कैफ़ोल्ड हर नए pack में एक AGENTS.md फ़ाइल लिखता है — sandbox के नियम, manifest के फ़ील्ड्स, हर परमिशन के लिए eyeread.on(...) हैंडलर का ढाँचा, और validate/build वर्कफ़्लो, सब कुछ एक ही सेल्फ़-कंटेन्ड फ़ाइल में। इसके लिए किसी सेटअप की ज़रूरत नहीं: प्रोजेक्ट फ़ाइलें पढ़ने वाला कोई भी कोडिंग एजेंट (Claude Code, Cursor, Codex, Copilot वगैरह) फ़ोल्डर खोलते ही इसे पहचान लेता है।',
      'Claude Code यूज़र्स को एक पूरा Skill भी मिलता है जो pack से जुड़ी रिक्वेस्ट पर ट्रिगर होता है, भले ही pack फ़ोल्डर अभी बना ही न हो, और इसमें पूरी spec रेफ़रेंस के तौर पर शामिल रहती है। इसे vercel-labs/skills द्वारा सपोर्टेड 75+ एजेंट्स में से किसी में भी इंस्टॉल किया जा सकता है, सिर्फ़ Claude Code में नहीं:',
    ],
    verifiedHeading: 'Verified pack',
    verifiedBody:
      'रिव्यू के बाद जब कोई मेंटेनर किसी pack पर साइन करता है, तो उसे ✓ Verified by eyeread.in बैज मिलता है। तब तक — या अगर कोई pack बिना किसी साइनेचर के ही पब्लिश हो जाए — वह Community के तौर पर, एक चेतावनी के साथ इंस्टॉल होता है। छेड़छाड़ किया गया या रद्द किया गया साइनेचर इंस्टॉल को पूरी तरह रोक देता है।',
    connectedHeading: 'Connected apps',
    connectedBody: [
      'अगर आपका इंटीग्रेशन एक अलग प्रोग्राम के तौर पर लिखना आसान है — किसी भी भाषा में — तो Connected apps उसे 127.0.0.1 पर एक लोकल HTTP API के ज़रिए वही क्षमताएँ देता है, और ऐप कभी भी आपका कोड नहीं चलाता। एक बार वन-क्लिक प्रॉम्प्ट (Allow/Deny) से पेयर करें, फिर bearer token के साथ scripts:write, prompter:load, prompter:control या prompter:events कॉल करें।',
      'ब्राउज़र जानबूझकर इस API तक नहीं पहुँच सकते (कोई CORS नहीं, Origin/Sec-Fetch-Site चेक किए जाते हैं) — यह नेटिव टूल्स के लिए है: कोई राइटिंग ऐप, Stream Deck या फ़ुट-पेडल इंटीग्रेशन, रिकॉर्डिंग टूल, या किसी प्रोड्यूसर/सेकंड स्क्रीन के लिए प्रोग्रेस डिस्प्ले।',
    ],
    moreHeading: 'पूरा रेफ़रेंस',
    moreBody:
      'पूरी spec (pack.json स्कीमा, eyeread.* API, फ़ाइल और साइज़ लिमिट, Connected apps का HTTP प्रोटोकॉल) eyeread.in-packs-sdk रिपॉज़िटरी में और इस ऐप की अपनी docs/PACKS.md में मौजूद है।',
    moreLinks: [
      {
        label: 'omniship-labs/eyeread.in-packs-sdk',
        href: 'https://github.com/omniship-labs/eyeread.in-packs-sdk',
        body: 'spec, CLI, और scaffold।',
      },
      {
        label: 'docs/PACKS.md',
        href: 'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md',
        body: 'Connected apps का पूरा HTTP API।',
      },
    ],
  },
};
