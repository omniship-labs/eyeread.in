/* ============================================================
   eyeread.in · marketing site — developer docs copy (Telugu)
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
      'Packs — eyeread.in కోసం ఇన్‌స్టాల్ చేయదగిన, sandbox లో నడిచే JS ఎక్స్‌టెన్షన్‌లు — మరియు Connected apps, బాహ్య ప్రోగ్రామ్‌ల కోసం లోకల్ API. పర్మిషన్ మోడల్, మరియు ఒకదాన్ని ఎలా తయారు చేయాలో.',
    lead: 'eyeread.in కోడ్‌ను తాకకుండా దాన్ని విస్తరించడానికి రెండు మార్గాలు, రెండూ ఒకే పర్మిషన్ మోడల్‌ను పంచుకుంటాయి: pack లు యాప్ లోపల ఒక sandbox లో నడుస్తాయి; Connected apps అనేవి లోకల్ API ద్వారా యాప్‌తో మాట్లాడే వేరే ప్రోగ్రామ్‌లు.',
    whatHeading: 'pack అంటే ఏమిటి',
    whatBody: [
      'pack అనేది ఒక చిన్న JS ఎక్స్‌టెన్షన్ — ఒక manifest (pack.json) మరియు కొంత కోడ్ — దీన్ని యాప్ ఒక మూసివేసిన sandbox లో నడుపుతుంది: DOM లేదు, ఫైల్ సిస్టమ్ లేదు, సొంత నెట్‌వర్క్ కూడా లేదు. బయటకు వెళ్ళే ఏకైక మార్గం ఒక గ్లోబల్ eyeread ఆబ్జెక్ట్ మాత్రమే, ఇది pack ప్రకటించిన మరియు యూజర్ స్పష్టంగా అనుమతించిన పర్మిషన్‌లకు మాత్రమే పరిమితం.',
      'నెట్‌వర్క్ యాక్సెస్‌ను ప్రకటించే ప్రతి పర్మిషన్ తనదైన ప్రత్యేక, ఐసోలేటెడ్ sandbox లో నడుస్తుంది; నెట్‌వర్క్ లేని పర్మిషన్‌లు ఒకే ఆఫ్‌లైన్ sandbox ను పంచుకుంటాయి. ఒక pack మరో pack యొక్క కోడ్, మెమరీ లేదా నెట్‌వర్క్ ట్రాఫిక్‌ను చూడలేదు.',
    ],
    permissionsHeading: 'పర్మిషన్లు',
    permissionsIntro:
      'ఒక pack (మరియు తన API scope లకు అదే పేర్లను ఉపయోగించే Connected app) తనకు అవసరమైనదాన్ని మాత్రమే ప్రకటిస్తుంది. యూజర్ స్వయంగా, ప్రతి pack కు, ప్రతి పర్మిషన్ కు వేరుగా దాన్ని ఆన్ చేసే వరకు ఏదీ మంజూరు చేయబడదు:',
    permissionCol: 'పర్మిషన్',
    grantsCol: 'ఇచ్చేది',
    permissions: [
      { name: 'scripts:write', grants: 'యూజర్ లైబ్రరీకి ఒక స్క్రిప్ట్‌ను జోడించడం.' },
      {
        name: 'prompter:load',
        grants: 'prompter లో టెక్స్ట్‌ను తెరిచి రీడింగ్ సెషన్‌ను ప్రారంభించడం.',
      },
      {
        name: 'prompter:control',
        grants: 'prompter ను ప్లే, పాజ్, రీస్టార్ట్, సీక్ లేదా క్లోజ్ చేయడం.',
      },
      {
        name: 'prompter:events',
        grants: 'prompter యొక్క లైవ్ స్థితిని చదవడం — సెషన్ యాక్టివ్‌గా ఉన్నప్పుడు మాత్రమే.',
      },
      {
        name: 'files:import',
        grants:
          'యాప్ యొక్క సొంత పికర్ ద్వారా ఒక ఫైల్‌ను ఎంచుకోమని యూజర్‌ను అడగడం; pack కు ఆ ఒక్క ఫైల్ మాత్రమే కనిపిస్తుంది.',
      },
    ],
    permissionsNote:
      'ఒక పర్మిషన్ pack.json లో ఖచ్చితమైన https:// సైట్‌లను ప్రకటించనంత వరకు ఇంటర్నెట్ యాక్సెస్ ఆఫ్‌లోనే ఉంటుంది — వైల్డ్‌కార్డ్‌లు, IP అడ్రస్‌లు లేదా localhost పనిచేయవు. ఒక సైట్‌ను ప్రకటించడం వల్ల యాక్సెస్ దానంతట అదే ఆన్ కాదు: యూజర్ ప్రతి పర్మిషన్‌కు దాన్ని విడిగా ఆన్ చేయాల్సిందే.',
    makeHeading: 'ఒక pack తయారు చేయండి',
    makeIntro:
      'ప్రతిదీ యాప్‌లోనే చేయవచ్చు, Settings → Packs → Developer mode లో: New pack…, సేవ్ చేయగానే live reload, ప్రతి pack కు దాని స్వంత లాగ్, మరియు Validate/Build. యాప్‌ను తెరవాల్సిన అవసరం లేని కమాండ్-లైన్ మార్గం కూడా ఉంది, SDK రిపోజిటరీ నుండి:',
    makeStepsHeading: 'కమాండ్ లైన్ నుండి',
    agentHeading: 'AI ఏజెంట్‌తో ఒకదాన్ని తయారు చేయడం',
    agentBody: [
      'పైన ఉన్న స్కాఫోల్డ్ ప్రతి కొత్త pack లోనూ ఒక AGENTS.md ఫైల్‌ను రాస్తుంది — sandbox నియమాలు, manifest ఫీల్డ్‌లు, ప్రతి పర్మిషన్‌కు eyeread.on(...) హ్యాండ్లర్ ఆకారం, మరియు validate/build వర్క్‌ఫ్లో, ఇవన్నీ ఒకే స్వయంసమృద్ధి ఫైల్‌లో. ఎలాంటి సెటప్ అవసరం లేదు: ప్రాజెక్ట్ ఫైళ్ళను చదివే ఏ కోడింగ్ ఏజెంట్ (Claude Code, Cursor, Codex, Copilot వంటివి) అయినా ఫోల్డర్‌ను తెరిచిన వెంటనే దాన్ని గుర్తిస్తుంది.',
      'Claude Code యూజర్‌లకు pack ఫోల్డర్ ఇంకా ఉనికిలో లేకముందే pack-సంబంధిత రిక్వెస్ట్‌లపై యాక్టివేట్ అయ్యే పూర్తి Skill కూడా లభిస్తుంది, పూర్తి spec రిఫరెన్స్‌గా అందులో చేర్చబడి ఉంటుంది. vercel-labs/skills మద్దతు ఇచ్చే 75+ ఏజెంట్లలో దేనితోనైనా దీన్ని ఇన్‌స్టాల్ చేయవచ్చు, Claude Code మాత్రమే కాదు:',
    ],
    verifiedHeading: 'ధృవీకరించబడిన pack లు',
    verifiedBody:
      'సమీక్ష తర్వాత మెయింటైనర్ ఒక pack పై సంతకం చేసినప్పుడు అది ✓ Verified by eyeread.in బ్యాడ్జ్‌ను పొందుతుంది. అప్పటివరకు — లేదా ఏ సంతకం లేకుండానే ఒక pack విడుదలైతే — అది Community గా, ఒక హెచ్చరికతో ఇన్‌స్టాల్ అవుతుంది. మార్చబడిన లేదా రద్దు చేయబడిన సంతకం ఇన్‌స్టాలేషన్‌ను పూర్తిగా నిరోధిస్తుంది.',
    connectedHeading: 'Connected apps',
    connectedBody: [
      'మీ ఇంటిగ్రేషన్‌ను ఒక వేరే ప్రోగ్రామ్‌గా రాయడం సులభంగా ఉంటే — ఏ భాషలోనైనా — Connected apps దానికి 127.0.0.1 పై ఒక లోకల్ HTTP API ద్వారా అవే సామర్థ్యాలను ఇస్తుంది, యాప్ మీ కోడ్‌ను ఎప్పుడూ నడపదు. ఒక్కసారి వన్-క్లిక్ ప్రాంప్ట్ (Allow/Deny) ద్వారా పెయిర్ చేయండి, తర్వాత bearer token తో scripts:write, prompter:load, prompter:control లేదా prompter:events ను కాల్ చేయండి.',
      'బ్రౌజర్‌లు ఉద్దేశపూర్వకంగానే ఈ API ను చేరుకోలేవు (CORS లేదు, Origin/Sec-Fetch-Site తనిఖీ చేయబడుతుంది) — ఇది నేటివ్ టూల్స్ కోసం: ఒక రైటింగ్ యాప్, Stream Deck లేదా foot-pedal ఇంటిగ్రేషన్, ఒక రికార్డింగ్ టూల్, లేదా ప్రొడ్యూసర్/రెండో స్క్రీన్ కోసం ప్రోగ్రెస్ డిస్‌ప్లే.',
    ],
    moreHeading: 'పూర్తి రిఫరెన్స్',
    moreBody:
      'పూర్తి spec (pack.json స్కీమా, eyeread.* API, ఫైల్ మరియు సైజ్ పరిమితులు, Connected apps యొక్క HTTP ప్రోటోకాల్) eyeread.in-packs-sdk రిపోజిటరీలో మరియు ఈ యాప్ యొక్క స్వంత docs/PACKS.md లో ఉంది.',
    moreLinks: [
      {
        label: 'omniship-labs/eyeread.in-packs-sdk',
        href: 'https://github.com/omniship-labs/eyeread.in-packs-sdk',
        body: 'spec, CLI, మరియు scaffold.',
      },
      {
        label: 'docs/PACKS.md',
        href: 'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md',
        body: 'Connected apps యొక్క పూర్తి HTTP API.',
      },
    ],
  },
};
