/* eyeread.in · marketing site — Chinese, Simplified (zh). Mirrors en.js. */

export default {
  meta: {
    title: 'eyeread.in — 看向镜头。',
    description:
      '开源提词器。将你的讲稿浮于任意屏幕之上，对任何录制软件都不可见。内置语音跟踪。免费。',
  },

  nav: {
    cta: '免费下载',
    githubLabel: 'GitHub',
  },

  hero: {
    eyebrow: '屏幕共享中不可见',
    star: '在 GitHub 上点星',
    headline: ['看向镜头。', { emphasis: '而不是你的讲稿。' }],
    subhead:
      'eyeread.in 将你的讲稿以玻璃般的浮层悬浮在任意屏幕之上。它跟随你的声音——并且永远不会出现在录制画面里。',
    note: '永久免费 · AGPL-3.0 · 无需账号',
    primaryCta: '下载 macOS 和 Windows 版',
    secondaryCta: '在 GitHub 上查看',
  },

  demo: {
    cameraBadge: '摄像头 · eyeread.in 已从录制中隐藏',
    invisibleBadge: '对所有屏幕共享软件隐藏',
    slide: {
      eyebrow: 'Q3 全员大会 · Acme Corp',
      heading: ['为未来十年', '而构建'],
    },
    overlay: {
      timer: '01:24',
      tag: '不可见',
      spoken: '我们拥有一支了不起的团队和清晰的',
      active: '路线图',
      upcoming: '——现在我们需要的是专注，而不只是速度。让结果说话。',
    },
  },

  features: {
    eyebrow: '与众不同之处',
    heading: '为人们真实的演讲方式而打造。',
    items: [
      {
        title: '对每一款录制软件都不可见',
        body: 'eyeread.in 在被捕获的画面之外渲染。Zoom、Loom、OBS、QuickTime——它们都看不到它。你的观众只看到内容本身。',
        tag: '屏幕共享安全',
      },
      {
        title: '语音跟踪',
        body: '开口说话，讲稿便随之滚动。当前词语会发光，已说出的内容会淡出。无需点按，无需脚踏板——只管说。',
        tag: '自动滚动',
      },
      {
        title: '靠近镜头',
        body: '浮层固定在你的摄像头正下方。你的目光自然落在镜头上——而不是屏幕角落。你看起来全神贯注。',
        tag: '眼神交流',
      },
    ],
  },

  how: {
    eyebrow: '工作原理',
    heading: '打开它。粘贴讲稿。开口说。',
    steps: [
      {
        title: '粘贴或输入你的讲稿',
        body: '放入任何内容——主题演讲、YouTube 脚本、谈话要点、面试答案。eyeread.in 支持纯文本。',
      },
      {
        title: '放置浮层',
        body: '把它拖到摄像头旁边。调整字号、不透明度和速度。它会悬浮在所有其他窗口之上。',
      },
      {
        title: '开始说话',
        body: '语音检测接管一切。当前词语被高亮。文字随你说话而滚动。准备好后随时点击录制。',
      },
    ],
    preview: {
      header: '语音跟踪已启用 · 00:42',
      spoken: '感谢大家今天的到来。我想谈谈一件',
      active: '重要',
      upcoming: '的事——它比任何季度数字都更重要：我们服务的人，以及他们对我们的信任。',
      caption: '↑ 浮层——只有你能看到',
    },
  },

  oss: {
    heading: '免费、开源，并对此坦诚。',
    body: 'eyeread.in 完全开源。阅读代码、审计它、复刻它、为它贡献。没有跟踪、没有遥测、没有订阅。如果它帮到了你——请自愿捐助。',
    guarantees: [
      {
        title: '无需账号',
        body: '立即下载使用——无需注册，无需邮箱',
      },
      {
        title: '没有遥测',
        body: '任何数据都不会离开你的设备。你的讲稿始终私密。',
      },
      {
        title: 'macOS 和 Windows · 原生应用',
        body: '在 macOS 和 Windows 上由操作系统保障隐身。Linux 为实验性。',
      },
      {
        title: '由捐助支持',
        body: '如果 eyeread.in 帮到了你，请把善意传递下去——绝无压力',
      },
    ],
  },

  sponsors: {
    eyebrow: '由社区支持',
    heading: '支持者与赞助者',
    subhead: 'eyeread.in 完全由那些相信诚实、开放工具的人资助。正是这些人让它保持免费。',
    ctaLabel: '成为支持者',
    loadingMessage: '正在加载支持者…',
    emptyMessage: '成为第一个支持 eyeread.in 的人 →',
    errorMessage: '暂时无法加载支持者。请在 Open Collective 上查看 →',
    sponsorsLabel: '赞助者',
    backersLabel: '支持者',
  },

  footer: {
    links: ['GitHub', '文档', 'Discord', 'AGPL-3.0'],
    copy: '永久免费',
  },

  switcher: {
    label: '语言',
  },
};
