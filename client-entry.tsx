// growi-plugin-unc-copy
// 社内ポータル用スクリプトプラグイン。
// 共有フォルダの UNC パスをインラインコード (例: `\\192.168.11.28\JTC-Share\...`) で書くと、
// 表示上は手前のラベルだけのリンクになり、クリックでパス全文をクリップボードにコピーする。
// DokuWiki 時代の「リンクをクリックするとパスがコピーされる」挙動の再現。

const PLUGIN_NAME = 'growi-plugin-unc-copy';
const COPIED_TEXT = 'コピーしました';
const LINK_CLASS = 'unc-copy-link';

let observer: MutationObserver | null = null;
let timer: number | null = null;

const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard != null && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    throw new Error('Clipboard API unavailable');
  }
  catch {
    // http (LAN) では Clipboard API が使えないため execCommand にフォールバック
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    }
    catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
};

const onClick = (ev: Event): void => {
  const target = ev.target as HTMLElement;
  if (target.closest == null) return;
  const a = target.closest(`a.${LINK_CLASS}`) as HTMLAnchorElement | null;
  if (a == null) return;
  ev.preventDefault();
  const path = a.dataset.path ?? '';
  if (path === '') return;
  void copyText(path).then((ok) => {
    if (!ok) return;
    const original = a.dataset.label ?? '';
    a.textContent = COPIED_TEXT;
    a.classList.add('unc-copied');
    window.setTimeout(() => {
      a.textContent = original;
      a.classList.remove('unc-copied');
    }, 1200);
  });
};

const processCode = (code: HTMLElement): void => {
  if (code.dataset.uncProcessed === '1') return;
  code.dataset.uncProcessed = '1';
  const path = (code.textContent ?? '').trim();
  if (!path.startsWith('\\\\')) return; // UNC パス (先頭が \\) 以外は対象外
  if (code.parentElement?.tagName === 'PRE') return; // コードブロックは対象外
  if (code.closest('[contenteditable="true"]') != null) return; // 視覚エディタ内は触らない
  const li = code.closest('li');
  if (li == null) return;

  // <code> より前にあるノード (ラベル) を丸ごとアンカーに移す
  const anchor = document.createElement('a');
  anchor.href = '#';
  anchor.className = LINK_CLASS;
  anchor.dataset.path = path;
  anchor.title = 'クリックでパスをコピー';
  let label = '';
  let n: Node | null = li.firstChild;
  while (n != null && n !== code) {
    const next: Node | null = n.nextSibling;
    label += n.textContent ?? '';
    anchor.appendChild(n);
    n = next;
  }
  label = label.trim();
  if (label === '') {
    label = 'リンク';
    anchor.textContent = label;
  }
  anchor.dataset.label = label;
  li.insertBefore(anchor, code);
  code.remove();
};

const scan = (): void => {
  document.querySelectorAll('code').forEach((el) => {
    processCode(el as HTMLElement);
  });
};

const scheduleScan = (): void => {
  if (timer != null) window.clearTimeout(timer);
  timer = window.setTimeout(scan, 300);
};

const activate = (): void => {
  const style = document.createElement('style');
  style.textContent = `.${LINK_CLASS}{cursor:pointer}.${LINK_CLASS}.unc-copied{color:#2e7d32 !important;}`;
  document.head.appendChild(style);
  document.addEventListener('click', onClick, true);
  scan();
  observer = new MutationObserver(scheduleScan);
  observer.observe(document.body, { childList: true, subtree: true });
};

const deactivate = (): void => {
  document.removeEventListener('click', onClick, true);
  if (observer != null) {
    observer.disconnect();
    observer = null;
  }
};

if ((window as any).pluginActivators == null) {
  (window as any).pluginActivators = {};
}
(window as any).pluginActivators[PLUGIN_NAME] = {
  activate,
  deactivate,
};

export {};
