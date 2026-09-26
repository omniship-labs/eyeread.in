/* ============================================================
   eyeread.in · marketing site — developer docs copy (Tamil)
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
      'Packs — eyeread.in-க்காக நிறுவக்கூடிய, sandbox-இல் இயங்கும் JS எக்ஸ்டென்ஷன்கள் — மற்றும் Connected apps, வெளிப்புற நிரல்களுக்கான லோக்கல் API. அனுமதி மாதிரி, மற்றும் ஒன்றை எப்படி உருவாக்குவது.',
    lead: 'eyeread.in-இன் கோடைத் தொடாமல் அதை விரிவாக்க இரண்டு வழிகள், இரண்டும் ஒரே அனுமதி மாதிரியைப் பகிர்கின்றன: pack-கள் ஆப்பின் உள்ளே ஒரு sandbox-இல் இயங்குகின்றன; Connected apps என்பவை லோக்கல் API வழியாக ஆப்புடன் பேசும் தனி நிரல்கள்.',
    whatHeading: 'pack என்றால் என்ன',
    whatBody: [
      'pack என்பது ஒரு சிறிய JS எக்ஸ்டென்ஷன் — ஒரு manifest (pack.json) மற்றும் கோட் — இதை ஆப் ஒரு பூட்டப்பட்ட sandbox-இல் இயக்குகிறது: DOM இல்லை, கோப்பு அமைப்பு இல்லை, சொந்த நெட்வொர்க்கும் இல்லை. வெளியே செல்ல ஒரே வழி ஒரு global eyeread ஆப்ஜெக்ட் மட்டுமே, இது pack அறிவித்த மற்றும் பயனர் வெளிப்படையாக அனுமதித்த அனுமதிகளுக்கு மட்டுமே வரையறுக்கப்பட்டுள்ளது.',
      'நெட்வொர்க் அணுகலை அறிவிக்கும் ஒவ்வொரு அனுமதியும் தனது சொந்த தனிமைப்படுத்தப்பட்ட sandbox-இல் இயங்குகிறது; நெட்வொர்க் இல்லாத அனுமதிகள் ஒரே ஆஃப்லைன் sandbox-ஐப் பகிர்கின்றன. ஒரு pack மற்றொரு pack-இன் கோட், நினைவகம் அல்லது நெட்வொர்க் போக்குவரத்தைப் பார்க்க முடியாது.',
    ],
    permissionsHeading: 'அனுமதிகள்',
    permissionsIntro:
      'ஒரு pack (மற்றும் அதே பெயர்களைத் தன் API scope-களாகப் பயன்படுத்தும் Connected app) அதற்குத் தேவையானதை மட்டுமே அறிவிக்கும். பயனர் ஒவ்வொரு pack-க்கும், ஒவ்வொரு அனுமதிக்கும் தனியாக அதை இயக்கும் வரை எதுவும் வழங்கப்படாது:',
    permissionCol: 'அனுமதி',
    grantsCol: 'வழங்குவது',
    permissions: [
      { name: 'scripts:write', grants: 'பயனரின் லைப்ரரியில் ஒரு ஸ்கிரிப்டைச் சேர்த்தல்.' },
      {
        name: 'prompter:load',
        grants: 'prompter-இல் உரையைத் திறந்து வாசிப்பு அமர்வைத் தொடங்குதல்.',
      },
      {
        name: 'prompter:control',
        grants: 'prompter-ஐ இயக்குதல், இடைநிறுத்துதல், மறுதொடக்கம், தேடுதல் அல்லது மூடுதல்.',
      },
      {
        name: 'prompter:events',
        grants: 'prompter-இன் நேரடி நிலையைப் படித்தல் — அமர்வு செயலில் இருக்கும்போது மட்டும்.',
      },
      {
        name: 'files:import',
        grants:
          'ஆப்பின் சொந்த தேர்வியில் ஒரு கோப்பைத் தேர்ந்தெடுக்குமாறு பயனரிடம் கேட்டல்; அந்த ஒரு கோப்பை மட்டுமே pack காணும்.',
      },
    ],
    permissionsNote:
      'ஒரு அனுமதி pack.json-இல் துல்லியமான https:// தளங்களை அறிவிக்காத வரை இணைய அணுகல் முடக்கப்பட்டே இருக்கும் — wildcard-கள், IP முகவரிகள் அல்லது localhost கிடையாது. ஒரு தளத்தை அறிவிப்பது அணுகலை தானாக இயக்காது: பயனர் ஒவ்வொரு அனுமதிக்கும் தனியாக அதை இயக்க வேண்டும்.',
    makeHeading: 'ஒன்றை உருவாக்குங்கள்',
    makeIntro:
      'அனைத்தையும் ஆப்பிலேயே செய்யலாம், Settings → Packs → Developer mode-இல்: New pack…, சேமிக்கும்போது live reload, ஒவ்வொரு pack-க்கும் தனி log, மற்றும் Validate/Build. ஆப்பைத் திறக்காமலேயே SDK ரெபோவிலிருந்து ஒரு command-line வழியும் உள்ளது:',
    makeStepsHeading: 'Command line-இலிருந்து',
    agentHeading: 'AI ஏஜென்ட் மூலம் உருவாக்குதல்',
    agentBody: [
      'மேலே உள்ள scaffold ஒவ்வொரு புதிய pack-இலும் ஒரு AGENTS.md-ஐ எழுதுகிறது — sandbox விதிகள், manifest புலங்கள், ஒவ்வொரு அனுமதிக்கான eyeread.on(...) handler வடிவம், மற்றும் validate/build பணிப்பாய்வு, அனைத்தும் ஒரே தன்னிறைவான கோப்பில். எந்த அமைப்பும் தேவையில்லை: திட்டக் கோப்புகளைப் படிக்கும் எந்த coding agent-ம் (Claude Code, Cursor, Codex, Copilot போன்றவை) கோப்புறையைத் திறந்த உடனேயே அதைப் புரிந்துகொள்ளும்.',
      'Claude Code பயனர்களுக்கு, pack கோப்புறை இருப்பதற்கு முன்பே pack தொடர்பான கோரிக்கைகளில் இயங்கும் ஒரு முழுமையான Skill-ம் கிடைக்கும், முழு spec-ம் குறிப்புகளாக உடன் இணைக்கப்பட்டிருக்கும். vercel-labs/skills ஆதரிக்கும் 75+ ஏஜென்ட்களில் எதனுடனும் இதை நிறுவலாம், Claude Code மட்டும் அல்ல:',
    ],
    verifiedHeading: 'சரிபார்க்கப்பட்ட pack-கள்',
    verifiedBody:
      'ஒரு pack-ஐ அதன் maintainer மதிப்பாய்வுக்குப் பின் கையொப்பமிட்டால், அது ✓ Verified by eyeread.in பேட்ஜைப் பெறும். அதுவரை — அல்லது ஒரு pack எந்தக் கையொப்பமும் இல்லாமலேயே வெளியிடப்பட்டால் — அது Community என எச்சரிக்கையுடன் நிறுவப்படும். சிதைக்கப்பட்ட அல்லது ரத்து செய்யப்பட்ட கையொப்பம் நிறுவலை முழுவதுமாகத் தடுக்கும்.',
    connectedHeading: 'Connected apps',
    connectedBody: [
      'உங்கள் இணைப்பை ஒரு தனி நிரலாக எழுதுவது எளிதாக இருந்தால் — எந்த மொழியிலும் — Connected apps 127.0.0.1-இல் உள்ள ஒரு லோக்கல் HTTP API வழியாக அதே திறன்களை வழங்கும், ஆப் உங்கள் கோடை ஒருபோதும் இயக்காது. ஒரே ஒரு கிளிக் prompt (Allow/Deny) மூலம் ஒருமுறை இணைத்துக்கொள்ளுங்கள், பிறகு ஒரு bearer token-உடன் scripts:write, prompter:load, prompter:control அல்லது prompter:events-ஐ அழைக்கவும்.',
      'உலாவிகள் வடிவமைப்பின்படியே இந்த API-ஐ அடைய முடியாது (CORS இல்லை, Origin/Sec-Fetch-Site சரிபார்க்கப்படும்) — இது native கருவிகளுக்காக: ஒரு எழுத்துக் கருவி, Stream Deck அல்லது foot-pedal இணைப்பு, ஒரு பதிவுக் கருவி, அல்லது ஒரு producer/இரண்டாம் திரைக்கான முன்னேற்ற காட்சி.',
    ],
    moreHeading: 'முழுமையான குறிப்பு',
    moreBody:
      'முழு spec-ம் (pack.json schema, eyeread.* API, கோப்பு மற்றும் அளவு வரம்புகள், Connected apps-இன் HTTP நெறிமுறை) eyeread.in-packs-sdk ரெபோவிலும், இந்த ஆப்பின் சொந்த docs/PACKS.md-இலும் உள்ளது.',
    moreLinks: [
      {
        label: 'omniship-labs/eyeread.in-packs-sdk',
        href: 'https://github.com/omniship-labs/eyeread.in-packs-sdk',
        body: 'spec, CLI, மற்றும் scaffold.',
      },
      {
        label: 'docs/PACKS.md',
        href: 'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md',
        body: 'Connected apps-இன் முழுமையான HTTP API.',
      },
    ],
  },
};
