/* ============================================================
   eyeread.in · marketing site — developer docs copy (Russian)
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
      'Packs — устанавливаемые JS-расширения для eyeread.in, работающие в песочнице, — и Connected apps, локальный API для внешних программ. Модель разрешений и как создать свой пак.',
    lead: 'Два способа расширить eyeread.in, не трогая её код, с единой моделью разрешений: packs выполняются внутри приложения в песочнице; Connected apps — это отдельные программы, которые общаются с ним через локальный API.',
    whatHeading: 'Что такое pack',
    whatBody: [
      'Pack — это небольшое JS-расширение: манифест (pack.json) плюс код, — которое приложение запускает в изолированной песочнице: без DOM, без файловой системы и без собственной сети. Единственный выход наружу — глобальный объект eyeread, доступ к которому ограничен разрешениями, заявленными паком и явно предоставленными пользователем.',
      'Каждое разрешение с заявленным доступом в интернет выполняется в собственной изолированной песочнице; разрешения без такого доступа работают в одной общей офлайн-песочнице. Packs не видят код, память и сетевой трафик друг друга.',
    ],
    permissionsHeading: 'Разрешения',
    permissionsIntro:
      'Pack (как и Connected app, использующая те же имена для своих scopes API) заявляет только то, что ему действительно нужно. Ничего не предоставляется, пока пользователь сам не включит это — отдельно для каждого пака, отдельно для каждого разрешения:',
    permissionCol: 'Разрешение',
    grantsCol: 'Даёт',
    permissions: [
      { name: 'scripts:write', grants: 'Добавить скрипт в библиотеку пользователя.' },
      {
        name: 'prompter:load',
        grants: 'Открыть текст в суфлёре и начать сеанс чтения.',
      },
      {
        name: 'prompter:control',
        grants: 'Воспроизведение, пауза, перезапуск, перемотка или закрытие суфлёра.',
      },
      {
        name: 'prompter:events',
        grants:
          'Читать состояние суфлёра в реальном времени — только во время активного сеанса.',
      },
      {
        name: 'files:import',
        grants:
          'Попросить пользователя выбрать файл через собственный диалог приложения; pack видит только этот файл.',
      },
    ],
    permissionsNote:
      'Доступ в интернет отключён, пока разрешение не заявит точные адреса https:// в pack.json — никаких шаблонов, IP-адресов или localhost. Заявление адреса само по себе не включает доступ: пользователь всё равно включает его отдельно для каждого разрешения.',
    makeHeading: 'Создать pack',
    makeIntro:
      'Всё можно сделать прямо в приложении, в Settings → Packs → Developer mode: New pack…, горячая перезагрузка при сохранении, лог для каждого пака, и Validate/Build. Есть и путь через командную строку, не требующий открытого приложения, — из репозитория SDK:',
    makeStepsHeading: 'Из командной строки',
    agentHeading: 'Создание с помощью ИИ-агента',
    agentBody: [
      'Генератор выше записывает файл AGENTS.md в каждый новый pack — правила песочницы, поля манифеста, форму обработчика eyeread.on(...) для каждого разрешения и процесс validate/build — всё в одном самодостаточном файле. Никакой настройки не требуется: любой кодовый агент, читающий файлы проекта (Claude Code, Cursor, Codex, Copilot…), подхватывает его сразу же, как только открывает папку.',
      'Пользователи Claude Code также получают полноценный Skill, который срабатывает на запросы, связанные с паками, ещё до того, как папка пака вообще появилась, — с полной спецификацией, включённой как справочный материал. Установите его с любым из 75+ агентов, которые поддерживает vercel-labs/skills, а не только с Claude Code:',
    ],
    verifiedHeading: 'Верифицированные packs',
    verifiedBody:
      'Pack получает значок ✓ Verified by eyeread.in, когда его поддерживающий разработчик подписывает его после проверки. До этого момента — или если pack вообще опубликован без подписи — он устанавливается как Community, с предупреждением. Подделанная или отозванная подпись полностью блокирует установку.',
    connectedHeading: 'Connected apps',
    connectedBody: [
      'Если вашу интеграцию проще написать как отдельную программу — на любом языке, — Connected apps дают ей те же возможности через локальный HTTP API на 127.0.0.1, при этом приложение никогда не выполняет ваш код. Один раз подключитесь через запрос в одно нажатие (Allow/Deny), затем вызывайте scripts:write, prompter:load, prompter:control или prompter:events с bearer-токеном.',
      'Браузеры принципиально не могут достучаться до этого API (нет CORS, проверяются заголовки Origin/Sec-Fetch-Site) — он предназначен для нативных инструментов: приложения для написания текста, интеграции со Stream Deck или ножной педалью, инструмента записи, экрана прогресса для продюсера или второго монитора.',
    ],
    moreHeading: 'Полная документация',
    moreBody:
      'Полная спецификация (схема pack.json, API eyeread.*, лимиты файлов и размеров, HTTP-протокол Connected apps) находится в репозитории eyeread.in-packs-sdk и в файле docs/PACKS.md самого этого приложения.',
    moreLinks: [
      {
        label: 'omniship-labs/eyeread.in-packs-sdk',
        href: 'https://github.com/omniship-labs/eyeread.in-packs-sdk',
        body: 'спецификация, CLI и генератор.',
      },
      {
        label: 'docs/PACKS.md',
        href: 'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md',
        body: 'HTTP API Connected apps, полностью.',
      },
    ],
  },
};
