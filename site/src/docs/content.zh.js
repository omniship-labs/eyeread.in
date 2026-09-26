/* ============================================================
   eyeread.in · marketing site — developer docs copy (Chinese)
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
      'Packs —— 面向 eyeread.in 的可安装、沙盒化 JS 扩展 —— 以及 Connected apps，供外部程序使用的本地 API。权限模型，以及如何自己制作一个。',
    lead: '在不改动 eyeread.in 代码的前提下进行扩展的两种方式，共用同一套权限模型：packs 在应用内部的沙盒中运行；Connected apps 则是通过本地 API 与应用通信的独立程序。',
    whatHeading: 'pack 是什么',
    whatBody: [
      'pack 是一个小型 JS 扩展 —— 一份清单（pack.json）加上代码 —— 应用会在一个封闭的沙盒中运行它：没有 DOM、没有文件系统、也没有自己的网络访问权限。唯一的出口是一个全局的 eyeread 对象，其可用范围由 pack 声明、并经用户明确授权的权限决定。',
      '每个声明了联网权限的权限都在各自独立的沙盒中运行；未声明联网的权限则共用一个离线沙盒。不同 pack 之间彼此看不到对方的代码、内存或网络流量。',
    ],
    permissionsHeading: '权限',
    permissionsIntro:
      'pack（以及使用相同名称作为 API scope 的 Connected app）只会声明它实际需要的权限。在用户逐个 pack、逐条权限亲自开启之前，任何权限都不会被授予：',
    permissionCol: '权限',
    grantsCol: '授予',
    permissions: [
      { name: 'scripts:write', grants: '向用户的脚本库中添加一个脚本。' },
      {
        name: 'prompter:load',
        grants: '在提词器中打开文本并开始一次阅读会话。',
      },
      {
        name: 'prompter:control',
        grants: '播放、暂停、重新开始、跳转或关闭提词器。',
      },
      {
        name: 'prompter:events',
        grants: '读取提词器的实时状态 —— 仅在会话进行中有效。',
      },
      {
        name: 'files:import',
        grants: '请用户通过应用自带的选择器挑选一个文件；pack 只能看到这一个文件。',
      },
    ],
    permissionsNote:
      '除非某项权限在 pack.json 中声明了精确的 https:// 地址（不支持通配符、IP 地址或 localhost），否则联网功能默认关闭。声明地址并不代表联网已开启：用户仍需逐条权限亲自开启。',
    makeHeading: '动手制作一个',
    makeIntro:
      '所有操作都可以在应用内完成：Settings → Packs → Developer mode 中的 New pack…、保存即热重载、每个 pack 独立的日志，以及 Validate/Build。此外也有无需打开应用的命令行方式，来自 SDK 仓库：',
    makeStepsHeading: '通过命令行',
    agentHeading: '借助 AI 智能体来制作',
    agentBody: [
      '上面的生成器会在每个新 pack 中写入一份 AGENTS.md —— 沙盒规则、清单字段、各权限对应的 eyeread.on(...) 处理函数形态，以及 validate/build 工作流，全部整合在一个自包含文件中。无需任何配置：任何能读取项目文件的编码智能体（Claude Code、Cursor、Codex、Copilot 等）在打开该文件夹的那一刻起就能读懂它。',
      'Claude Code 用户还可以使用一个正式的 Skill，它会在涉及 pack 的请求上被触发 —— 即使此时 pack 文件夹还不存在 —— 并内置完整的规范作为参考资料。用 vercel-labs/skills 支持的 75 多个智能体中的任意一个来安装它，不局限于 Claude Code：',
    ],
    verifiedHeading: '已验证的 packs',
    verifiedBody:
      '当维护者在审核后对某个 pack 进行签名，它就会获得 ✓ Verified by eyeread.in 徽章。在此之前 —— 或者如果一个 pack 完全没有签名地发布 —— 它会以 Community 身份安装，并附带一条警告。被篡改或已吊销的签名会完全阻止安装。',
    connectedHeading: 'Connected apps',
    connectedBody: [
      '如果你的集成更适合写成一个独立程序 —— 使用任意语言均可 —— Connected apps 会通过 127.0.0.1 上的本地 HTTP API 赋予它同样的能力，且应用永远不会执行你的代码。只需一次通过一键式提示（Allow/Deny）完成配对，之后即可携带 bearer token 调用 scripts:write、prompter:load、prompter:control 或 prompter:events。',
      '出于设计考虑，浏览器无法访问这个 API（没有 CORS，会校验 Origin/Sec-Fetch-Site）—— 它专为原生工具而设计：写作类应用、Stream Deck 或脚踏板集成、录制工具，或是为制作人 / 第二块屏幕准备的进度显示面板。',
    ],
    moreHeading: '完整参考文档',
    moreBody:
      '完整规范（pack.json 模式、eyeread.* API、文件与大小限制、Connected apps 的 HTTP 协议）位于 eyeread.in-packs-sdk 仓库，以及本应用自身的 docs/PACKS.md 中。',
    moreLinks: [
      {
        label: 'omniship-labs/eyeread.in-packs-sdk',
        href: 'https://github.com/omniship-labs/eyeread.in-packs-sdk',
        body: '规范、CLI 与脚手架。',
      },
      {
        label: 'docs/PACKS.md',
        href: 'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md',
        body: 'Connected apps 的完整 HTTP API。',
      },
    ],
  },
};
