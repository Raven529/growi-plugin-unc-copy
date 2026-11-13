# growi-plugin-unc-copy

GROWI script plugin: 社内ポータル向け。共有フォルダの UNC パスをインラインコードで書くと、表示はラベルだけのリンクになり、クリックでパス全文をクリップボードにコピーします (旧 DokuWiki ポータルの挙動の再現)。

## 書き方 / Usage

```markdown
- ラベル `\\192.168.11.28\JTC-Share\path\to\folder`
```

Rendered: only `ラベル` is shown as a link. Clicking it copies the full UNC path (with a brief `コピーしました` feedback). Plain http(s) links and code blocks are untouched.

## インストール / Install

GROWI 管理画面 → プラグイン → このリポジトリの URL を入力してインストール → 有効化。

- Built with Vite (based on the official growi-plugin-copy-code-to-clipboard skeleton).
- `dist/` is committed; no build step is needed at install time.
- On plain http (non-secure context) it falls back to `document.execCommand('copy')`.
