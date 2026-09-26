/* ============================================================
   eyeread.in · marketing site — developer docs copy (Japanese)
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
      'Packs —— eyeread.in 向けの、インストール可能でサンドボックス化された JS 拡張機能 —— と、外部プログラム向けのローカル API である Connected apps。その権限モデルと、自分で作る方法。',
    lead: 'eyeread.in のコードに手を加えずに拡張する 2 つの方法。どちらも同じ権限モデルを共有します：pack はアプリ内のサンドボックスで動作し、Connected apps はローカル API 経由でアプリと通信する独立したプログラムです。',
    whatHeading: 'pack とは何か',
    whatBody: [
      'pack はマニフェスト（pack.json）とコードからなる小さな JS 拡張機能で、アプリはこれを閉じたサンドボックス内で実行します —— DOM もファイルシステムも、独自のネットワークもありません。外部への唯一の出口はグローバルな eyeread オブジェクトで、pack が宣言し、ユーザーが明示的に許可した権限にのみ制限されています。',
      'ネットワークアクセスを宣言した権限は、それぞれ独自の隔離されたサンドボックスで実行されます。宣言していない権限は、1 つのオフラインサンドボックスを共有します。pack 同士は互いのコード、メモリ、通信内容を見ることができません。',
    ],
    permissionsHeading: '権限',
    permissionsIntro:
      'pack（そして同じ名前を API スコープとして使う Connected app）は、必要なものだけを宣言します。ユーザーが pack ごと・権限ごとに自分でオンにするまで、何も許可されません：',
    permissionCol: '権限',
    grantsCol: '許可内容',
    permissions: [
      { name: 'scripts:write', grants: 'ユーザーのライブラリにスクリプトを追加する。' },
      {
        name: 'prompter:load',
        grants: 'プロンプターでテキストを開き、読み上げセッションを開始する。',
      },
      {
        name: 'prompter:control',
        grants: 'プロンプターの再生・一時停止・最初から・シーク・終了を操作する。',
      },
      {
        name: 'prompter:events',
        grants: 'プロンプターのリアルタイム状態を読み取る —— セッションが有効な間のみ。',
      },
      {
        name: 'files:import',
        grants:
          'アプリ自身のファイル選択ダイアログでユーザーにファイルを選んでもらう。pack が見られるのはそのファイルのみ。',
      },
    ],
    permissionsNote:
      'ある権限が pack.json 内で厳密な https:// サイトを宣言しない限り、インターネットアクセスは無効です —— ワイルドカードや IP アドレス、localhost は使えません。サイトを宣言してもアクセスが自動で有効になるわけではなく、ユーザーが権限ごとに手動でオンにする必要があります。',
    makeHeading: '作ってみる',
    makeIntro:
      'すべてアプリ自体の Settings → Packs → Developer mode 内で完結します：New pack…、保存時のライブリロード、pack ごとのログ、そして Validate/Build。また、アプリを開かなくてもよいコマンドラインの方法もあります（SDK リポジトリから）：',
    makeStepsHeading: 'コマンドラインから',
    agentHeading: 'AI エージェントと一緒に作る',
    agentBody: [
      '上のスキャフォールドは、新しい pack ごとに AGENTS.md を書き出します —— サンドボックスのルール、マニフェストのフィールド、権限ごとの eyeread.on(...) ハンドラーの形、そして validate/build ワークフローが、1 つの自己完結したファイルにまとまっています。セットアップは不要で、プロジェクトファイルを読むコーディングエージェント（Claude Code、Cursor、Codex、Copilot など）なら、フォルダーを開いた瞬間にそれを読み込みます。',
      'Claude Code ユーザーには、pack フォルダーがまだ存在していなくても pack 関連のリクエストで起動する本格的な Skill も用意されています。仕様全体が参照資料として同梱されています。vercel-labs/skills が対応する 75 以上のエージェントのどれでもインストール可能で、Claude Code に限りません：',
    ],
    verifiedHeading: '検証済みの pack',
    verifiedBody:
      'pack は、メンテナーがレビュー後に署名すると ✓ Verified by eyeread.in バッジを獲得します。それまで —— あるいは署名なしで公開された pack —— は Community として、警告付きでインストールされます。改ざんされた署名や失効した署名は、インストールを完全にブロックします。',
    connectedHeading: 'Connected apps',
    connectedBody: [
      '連携機能を独立したプログラムとして書くほうが簡単な場合 —— どの言語でも構いません —— Connected apps は 127.0.0.1 上のローカル HTTP API を通じて同じ機能を提供し、アプリがあなたのコードを実行することは決してありません。ワンクリックのプロンプト（Allow/Deny）で一度ペアリングすれば、あとは bearer トークンを使って scripts:write、prompter:load、prompter:control、prompter:events を呼び出せます。',
      'ブラウザは設計上このAPIに到達できません（CORS なし、Origin/Sec-Fetch-Site を検証）—— ネイティブツール向けです：ライティングアプリ、Stream Deck やフットペダルとの連携、録画ツール、プロデューサー向けやセカンドスクリーン用の進行状況表示など。',
    ],
    moreHeading: '完全なリファレンス',
    moreBody:
      '完全な仕様（pack.json のスキーマ、eyeread.* API、ファイルとサイズの上限、Connected apps の HTTP プロトコル）は eyeread.in-packs-sdk リポジトリと、このアプリ自身の docs/PACKS.md にあります。',
    moreLinks: [
      {
        label: 'omniship-labs/eyeread.in-packs-sdk',
        href: 'https://github.com/omniship-labs/eyeread.in-packs-sdk',
        body: '仕様、CLI、スキャフォールド。',
      },
      {
        label: 'docs/PACKS.md',
        href: 'https://github.com/omniship-labs/eyeread.in/blob/main/docs/PACKS.md',
        body: 'Connected apps の HTTP API 全体。',
      },
    ],
  },
};
