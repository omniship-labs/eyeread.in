/* ============================================================
   eyeread.in · marketing site — developer docs copy (Spanish)
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
      'Packs — extensiones JS instalables y aisladas en sandbox para eyeread.in — y Connected apps, la API local para programas externos. El modelo de permisos, y cómo crear uno.',
    lead: 'Dos formas de construir sobre eyeread.in sin tocar su código, con un único modelo de permisos: los packs se ejecutan dentro de la app en una sandbox; las Connected apps son programas independientes que le hablan mediante una API local.',
    whatHeading: 'Qué es un pack',
    whatBody: [
      'Un pack es una pequeña extensión JS — un manifiesto (pack.json) más código — que la app ejecuta en una sandbox cerrada, sin DOM, sin sistema de archivos y sin red propia. La única salida es un objeto global eyeread, condicionado a los permisos que el pack declara y que el usuario concede explícitamente.',
      'Cada permiso que declara acceso a internet se ejecuta en su propia sandbox aislada; los permisos sin ello comparten una sola sandbox sin conexión. Los packs no pueden ver el código, la memoria ni el tráfico de red de los demás.',
    ],
    permissionsHeading: 'Permisos',
    permissionsIntro:
      'Un pack (al igual que una Connected app, que usa los mismos nombres para sus scopes de API) declara solo lo que necesita. Nada se concede hasta que el usuario lo activa, pack a pack, permiso a permiso:',
    permissionCol: 'Permiso',
    grantsCol: 'Concede',
    permissions: [
      { name: 'scripts:write', grants: 'Añadir un script a la biblioteca del usuario.' },
      {
        name: 'prompter:load',
        grants: 'Abrir texto en el prompter e iniciar una sesión de lectura.',
      },
      {
        name: 'prompter:control',
        grants: 'Reproducir, pausar, reiniciar, saltar o cerrar el prompter.',
      },
      {
        name: 'prompter:events',
        grants: 'Leer el estado en vivo del prompter — solo mientras hay una sesión activa.',
      },
      {
        name: 'files:import',
        grants:
          'Pedir al usuario que elija un archivo con el propio selector de la app; el pack solo ve ese archivo.',
      },
    ],
    permissionsNote:
      'El acceso a internet está desactivado a menos que un permiso declare sitios https:// exactos en pack.json — sin comodines, IPs ni localhost. Declarar un sitio no lo activa: el usuario sigue teniendo que activarlo, permiso por permiso.',
    makeHeading: 'Crear uno',
    makeIntro:
      'Todo puede hacerse desde la propia app, en Settings → Packs → Developer mode: New pack…, recarga en caliente al guardar, un log por pack, y Validate/Build. También hay un camino por línea de comandos que no necesita abrir la app, desde el repo del SDK:',
    makeStepsHeading: 'Desde la línea de comandos',
    agentHeading: 'Crear uno con un agente de IA',
    agentBody: [
      'El generador de arriba escribe un AGENTS.md en cada pack nuevo — las reglas de la sandbox, los campos del manifiesto, la forma del handler eyeread.on(...) por permiso, y el flujo validate/build, todo en un único archivo autocontenido. No requiere configuración: cualquier agente de código que lea archivos del proyecto (Claude Code, Cursor, Codex, Copilot…) lo detecta en el momento en que abre la carpeta.',
      'Los usuarios de Claude Code también tienen un Skill completo que se activa ante peticiones relacionadas con packs, incluso antes de que exista una carpeta de pack, con toda la spec incluida como referencia. Instálalo con cualquiera de los más de 75 agentes que soporta vercel-labs/skills, no solo Claude Code:',
    ],
    verifiedHeading: 'Packs verificados',
    verifiedBody:
      'Un pack obtiene la insignia ✓ Verified by eyeread.in una vez que su mantenedor lo firma tras la revisión. Hasta entonces — o si un pack se publica sin ninguna firma — se instala como Community, con una advertencia. Una firma manipulada o revocada bloquea la instalación por completo.',
    connectedHeading: 'Connected apps',
    connectedBody: [
      'Si tu integración es más fácil de escribir como un programa aparte — en cualquier lenguaje —, las Connected apps le dan las mismas capacidades mediante una API HTTP local en 127.0.0.1, sin que la app ejecute nunca tu código. Empareja una sola vez con un aviso de un clic (Allow/Deny), y luego llama a scripts:write, prompter:load, prompter:control o prompter:events con un token bearer.',
      'Los navegadores no pueden alcanzar esta API por diseño (sin CORS, con comprobaciones de Origin/Sec-Fetch-Site) — está pensada para herramientas nativas: una app de escritura, una integración con Stream Deck o pedal, una herramienta de grabación, una pantalla de progreso para un productor o una segunda pantalla.',
    ],
    moreHeading: 'Referencia completa',
    moreBody:
      'La spec completa (el esquema de pack.json, la API eyeread.*, los límites de archivos y tamaño, el protocolo HTTP de las Connected apps) vive en el repo eyeread.in-packs-sdk y en el docs/PACKS.md de esta propia app.',
    moreLinks: [
      {
        label: 'omniship-labs/eyeread.in-packs-sdk',
        href: 'https://github.com/omniship-labs/eyeread.in-packs-sdk',
        body: 'la spec, la CLI y el generador.',
      },
      {
        label: 'docs/PACKS.md',
        href: 'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md',
        body: 'la API HTTP de las Connected apps, completa.',
      },
    ],
  },
};
