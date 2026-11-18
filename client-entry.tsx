// growi-plugin-unc-copy (v2)
// 社内ポータル用スクリプトプラグイン。
// 共有フォルダの UNC パスをインラインコード (例: `\\192.168.11.28\JTC-Share\...`) で書くと、
// そのパス自体がクリック可能になり、クリックでパス全文をクリップボードにコピーする。
// DokuWiki 時代の「リンクをクリックするとパスがコピーされる」挙動の再現。
//
// v2 での設計変更 (重要):
// v1 は <code> の手前のラベルノードを新しい <a> へ移動し、<code> 自体を remove() していた。
// これは React (GROWI v8) が管理する DOM ノードの移動・削除であり、再描画時に
// "Failed to execute 'removeChild' on 'Node'" エラーを引き起こした。
// v2 は React 管理下のノードを一切移動・削除・挿入しない。
// 対象の <code> にクラスと title を付ける (属性変更のみ) ことと、
// document へのイベント委譲によるクリック処理だけで実現する。

const PLUGIN_NAME = 'growi-plugin-unc-copy';
const COPIED_TEXT = 'コピーしました';
const MARK_CLASS = 'unc-copy-path';
const COPIED_CLASS = 'unc-copied';
const TOAST_CLASS = 'unc-copy-toast';

let observer: MutationObserver | null = null;
let timer: number | null = null;
let toastTimer: number | null = null;

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

const showToast = (): void => {
  let toast = document.querySelector(`.${TOAST_CLASS}`) as HTMLElement | null;
  if (toast == null) {
    toast = document.createElement('div');
    toast.className = TOAST_CLASS;
    toast.textContent = COPIED_TEXT;
    document.body.appendChild(toast);
  }
  toast.classList.add('show');
  if (toastTimer != null) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast?.classList.remove('show');
  }, 1200);
};

const onClick = (ev: Event): void => {
  const target = ev.target as HTMLElement;
  if (target.closest == null) return;
  const code = target.closest(`code.${MARK_CLASS}`) as HTMLElement | null;
  if (code == null) return;
  const path = (code.textContent ?? '').trim();
  if (!path.startsWith('\\\\')) return; // 念のため再検証
  ev.preventDefault();
  void copyText(path).then((ok) => {
    if (!ok) return;
    code.classList.add(COPIED_CLASS);
    showToast();
    window.setTimeout(() => {
      code.classList.remove(COPIED_CLASS);
    }, 1200);
  });
};

const processCode = (code: HTMLElement): void => {
  if (code.classList.contains(MARK_CLASS)) return;
  const path = (code.textContent ?? '').trim();
  if (!path.startsWith('\\\\')) return; // UNC パス (先頭が \\) 以外は対象外
  if (code.parentElement?.tagName === 'PRE') return; // コードブロックは対象外
  if (code.closest('[contenteditable="true"]') != null) return; // 視覚エディタ内は触らない
  // 属性の変更のみ。ノードの移動・削除・挿入は絶対にしない (React との衝突回避)
  code.classList.add(MARK_CLASS);
  code.title = 'クリックでパスをコピー';
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
  style.textContent = [
    `.${MARK_CLASS}{cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;}`,
    `.${MARK_CLASS}.${COPIED_CLASS}{color:#2e7d32 !important;}`,
    `.${TOAST_CLASS}{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#323232;color:#fff;padding:6px 14px;border-radius:4px;font-size:13px;opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:9999;}`,
    `.${TOAST_CLASS}.show{opacity:.92;}`,
  ].join('');
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
