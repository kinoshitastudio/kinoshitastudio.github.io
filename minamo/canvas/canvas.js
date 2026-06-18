// Nagi — Overview Canvas
// Standalone web app. Speaks only the data contract, fed by an adapter.
// v0.2: islands = Chrome tab groups.
// v0.4: Consolidate — pull tabs/islands from other windows into the current one.

import { ChromeSource } from "../adapter/chrome-adapter.js";
import { MockSource } from "../adapter/mock-data.js";
import { Archive, ARCHIVE_EXPIRY_DAYS } from "../adapter/archive.js";
import { Launcher } from "../adapter/launcher.js";
import { Notes } from "../adapter/notes.js";

const Source = ChromeSource.available() ? ChromeSource : MockSource;
const IS_MOCK = Source === MockSource;
const NONE = -1;

const GROUP_COLORS = {
  grey: "#5f6368", blue: "#1a73e8", red: "#d93025", yellow: "#f9ab00",
  green: "#1e8e3e", pink: "#d01884", purple: "#9334e6", cyan: "#007b83", orange: "#fa903e",
};
const COLOR_KEYS = Object.keys(GROUP_COLORS);
function colorForDomain(d) {
  let h = 0;
  for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) >>> 0;
  return COLOR_KEYS[h % COLOR_KEYS.length];
}

const HOUR = 3600 * 1000;
const AGING_AFTER = 6 * HOUR;
const STALE_AFTER = 24 * HOUR;

// ── i18n (EN / 日本語) ────────────────────────────────────────────
const STRINGS = {
  tagline: { en: "calm your tabs", ja: "タブを、凪に" },
  searchPh: { en: "Search tabs…", ja: "タブを検索…" },
  stat_tabs: { en: "tabs", ja: "タブ" },
  stat_islands: { en: "islands", ja: "島" },
  stat_stale: { en: "stale", ja: "放置" },
  mergeAll: { en: "⤿ Merge all", ja: "⤿ 全部まとめる" },
  mergeTitle: { en: "Merge all windows into this one", ja: "全ウインドウをこの窓にまとめる" },
  viewTitle: { en: "View: %s (click to switch)", ja: "表示: %s（クリックで切替）" },
  view_list: { en: "List", ja: "リスト" },
  view_compact: { en: "Compact", ja: "コンパクト" },
  view_card: { en: "Card", ja: "カード" },
  fullTitle: { en: "Open full view ↗", ja: "全画面で開く ↗" },
  thisWindow: { en: "This window", ja: "この窓" },
  window_n: { en: "Window %s", ja: "ウインドウ %s" },
  n_tabs: { en: "%s tabs", ja: "%s タブ" },
  pullWindow: { en: "Pull into this window →", ja: "この窓に引っ張る →" },
  pullWindowTitle: { en: "Move all tabs & islands here (islands preserved)", ja: "全タブ・島をここへ（島は保持）" },
  pullTabTitle: { en: "Pull into this window", ja: "この窓に引っ張る" },
  ungrouped: { en: "Ungrouped", ja: "未分類" },
  untitled: { en: "Untitled island", ja: "名称未設定の島" },
  changeColor: { en: "Change color", ja: "色を変える" },
  renameIsland: { en: "Rename island", ja: "島の名前を変更" },
  dragReorder: { en: "Drag to reorder island", ja: "ドラッグで島を並び替え" },
  collapse: { en: "Collapse / expand", ja: "折りたたみ / 展開" },
  nameIsland: { en: "Name this island", ja: "島に名前を付ける" },
  whyOpen: { en: "+ why is this open?", ja: "+ なぜ開いてる?" },
  whyOpenPh: { en: "Why is this island open?", ja: "なぜこの島を開いてる?" },
  editNote: { en: "Edit note", ja: "メモを編集" },
  n_closed: { en: "↩ %s closed", ja: "↩ %s件 閉じた" },
  restore: { en: "Restore", ja: "戻す" },
  restoreTo: { en: "Restore to “%s”", ja: "「%s」に戻す" },
  restoreReopen: { en: "Restore (reopen)", ja: "戻す（再オープン）" },
  deleteArchive: { en: "Delete from archive (permanent)", ja: "アーカイブから完全削除" },
  closeKeptIsland: { en: "Close (kept under this island)", ja: "閉じる（この島に残す）" },
  closeKeptArchive: { en: "Close (kept in Archive)", ja: "閉じる（アーカイブに残す）" },
  stillNeed: { en: "Still need this?", ja: "まだ必要?" },
  group_n: { en: "Group %s · %s", ja: "%s件まとめる · %s" },
  groupTitle: { en: "Make an island from %s %s tabs", ja: "%s件の %s タブで島を作る" },
  newIsland: { en: "＋ Drop here to start a new island", ja: "＋ ここにドロップで新しい島" },
  archive: { en: "🗄 Archive", ja: "🗄 アーカイブ" },
  autoClears: { en: "auto-clears after %sd", ja: "%s日で自動消去" },
  clear: { en: "Clear", ja: "全消去" },
  clearTitle: { en: "Empty the archive", ja: "アーカイブを空にする" },
  clearConfirm: { en: "Empty the archive? This can't be undone.", ja: "アーカイブを空に？元に戻せません。" },
  archiveEmpty: { en: "Nothing archived yet — closing a tab keeps it here for %s days.", ja: "まだ何もありません——タブを閉じると%s日間ここに残ります。" },
  archiveNoMatch: { en: "No archived tabs match.", ja: "一致するアーカイブはありません。" },
  n_left: { en: "%sd left", ja: "あと%s日" },
  launcher: { en: "🚀 Launcher", ja: "🚀 ランチャー" },
  pinTool: { en: "＋ Pin a tool", ja: "＋ ツールを追加" },
  promptName: { en: "Tool name", ja: "ツール名" },
  promptUrl: { en: "URL (https://…)", ja: "URL (https://…)" },
  promptKey: { en: "Shortcut key (single letter, optional)", ja: "ショートカットキー（1文字・任意）" },
  unpin: { en: "Unpin", ja: "外す" },
  mergeConfirm: { en: "Merge all other windows into this one? (islands are preserved)", ja: "他の全ウインドウをこの窓にまとめる？（島は保持されます）" },
  closed: { en: "Closed", ja: "閉じた" },
  undo: { en: "Undo", ja: "元に戻す" },
  noTabs: { en: "No tabs open.", ja: "開いているタブがありません。" },
  noMatch: { en: "No tabs match.", ja: "一致するタブがありません。" },
  settings: { en: "Settings", ja: "設定" },
  background: { en: "Background", ja: "背景" },
  language: { en: "Language", ja: "言語" },
  customBg: { en: "Custom image URL (https://…)", ja: "背景画像のURL (https://…)" },
  apply: { en: "Apply", ja: "適用" },
  moreSoon: { en: "More options will live here as MINAMO grows.", ja: "今後、設定はここに増えていきます。" },
  close: { en: "Close", ja: "閉じる" },
};
let lang = localStorage.getItem("minamo-lang");
if (lang !== "ja" && lang !== "en") lang = (navigator.language || "").toLowerCase().indexOf("ja") === 0 ? "ja" : "en";
function t(key, ...args) {
  const e = STRINGS[key] || {};
  let s = e[lang] || e.en || key;
  let i = 0;
  return s.replace(/%s/g, () => (i < args.length ? args[i++] : "%s"));
}

const $ = (sel, root = document) => root.querySelector(sel);
let query = "";
let currentWindowId = null;
const collapsed = new Set();
const openClosed = new Set();   // island keys whose "closed tabs" tray is expanded
let archived = [];              // current Archive snapshot (set each render)
let claimedIds = new Set();     // archive entries shown inline under a live island
let launcherItems = [];         // pinned tools (set each render)
let notes = {};                 // island intent notes by title (set each render)
let focusGroupId = null;        // a freshly-made island to start renaming inline
let dragState = null;           // { kind, id, windowId } during an active drag
collapsed.add("launcher");      // launcher starts folded, pinned at the bottom

// ── Launcher: open a pinned tool — switch to it if already open, else open it ──
function originOf(u) { try { return new URL(u).origin; } catch { return u; } }
async function openTool(url) {
  const snap = await Source.getSnapshot();
  const all = snap.windows.flatMap((w) => w.tabs);
  const hit = all.find((t) => t.url && (t.url === url || originOf(t.url) === originOf(url)));
  if (hit) await Source.activateTab(hit.id, hit.windowId);
  else await Source.openUrl(url);
}

// ── Toast (immediate reassurance on close, with Undo) ─────────────
let toastTimer = null;
function showToast(message, onUndo) {
  let t = document.getElementById("nagi-toast");
  if (!t) { t = document.createElement("div"); t.id = "nagi-toast"; t.className = "toast"; document.body.appendChild(t); }
  t.innerHTML = "";
  const span = document.createElement("span"); span.textContent = message;
  const btn = document.createElement("button"); btn.className = "toast__undo"; btn.textContent = t("undo");
  btn.addEventListener("click", async () => { t.classList.remove("show"); await onUndo(); });
  t.append(span, btn);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 5000);
}

function staleness(tab) {
  if (!tab.lastAccessed) return "fresh";
  const age = Date.now() - tab.lastAccessed;
  if (age >= STALE_AFTER) return "stale";
  if (age >= AGING_AFTER) return "aging";
  return "fresh";
}
function ago(ts) {
  if (!ts) return "";
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h` : `${Math.round(h / 24)}d`;
}
function matches(tab) {
  if (!query) return true;
  const q = query.toLowerCase();
  return tab.title.toLowerCase().includes(q) || tab.domain.toLowerCase().includes(q);
}
function matchesEntry(e) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (e.title || "").toLowerCase().includes(q) || (e.domain || "").toLowerCase().includes(q);
}
function refresh() { if (IS_MOCK) render(); } // chrome path also re-renders via onChange

// ── Quick-switch: type in search, ↑/↓ to pick, Enter to jump ──────
let qsIndex = 0;
function qsTargets() { return [...document.querySelectorAll("#islands .tab[data-tab-id]")]; }
function applyQs() {
  const t = qsTargets();
  if (qsIndex >= t.length) qsIndex = Math.max(0, t.length - 1);
  t.forEach((el, i) => el.classList.toggle("tab--selected", !!query && i === qsIndex));
}

// ── Consolidate helper: pull one window's contents into the current window ──
async function pullWindowInto(win, targetWindowId) {
  for (const g of win.groups) await Source.moveGroupToWindow(g.id, targetWindowId); // islands survive
  const loose = win.tabs.filter((t) => t.groupId === NONE).map((t) => t.id);
  if (loose.length) await Source.moveTabsToWindow(loose, targetWindowId);
}

// ── Tab card ──────────────────────────────────────────────────────
function tabCard(tab, group) {
  const el = document.createElement("div");
  el.className = `tab tab--${staleness(tab)}`;
  if (tab.active) el.classList.add("tab--active");
  el.title = tab.url;
  el.draggable = true;
  el.dataset.tabId = tab.id;
  el.dataset.windowId = tab.windowId;

  el.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", `tab:${tab.id}:${tab.windowId}`);
    e.dataTransfer.effectAllowed = "move";
    dragState = { kind: "tab", id: tab.id, windowId: tab.windowId, groupId: tab.groupId };
    el.classList.add("dragging");
    document.body.classList.add("is-dragging");
  });
  el.addEventListener("dragend", () => {
    dragState = null;
    el.classList.remove("dragging");
    document.body.classList.remove("is-dragging");
  });

  // Drop target for tab-on-tab reordering (insertion line left/right)
  el.addEventListener("dragover", (e) => {
    if (!dragState || dragState.kind !== "tab" || dragState.id === tab.id) return;
    e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move";
    const r = el.getBoundingClientRect();
    const after = e.clientX > r.left + r.width / 2;
    el.classList.toggle("tab-drop-after", after);
    el.classList.toggle("tab-drop-before", !after);
  });
  el.addEventListener("dragleave", (e) => {
    if (!el.contains(e.relatedTarget)) el.classList.remove("tab-drop-before", "tab-drop-after");
  });
  el.addEventListener("drop", async (e) => {
    if (!dragState || dragState.kind !== "tab" || dragState.id === tab.id) return;
    e.preventDefault(); e.stopPropagation();
    const after = el.classList.contains("tab-drop-after");
    el.classList.remove("tab-drop-before", "tab-drop-after");
    const draggedId = dragState.id;
    const sameGroup = dragState.groupId === tab.groupId && dragState.windowId === tab.windowId;
    if (!sameGroup) {
      if (tab.groupId !== NONE) await Source.moveTabToGroup(draggedId, tab.groupId);
      else { if (dragState.windowId !== tab.windowId) await Source.moveTabsToWindow([draggedId], tab.windowId); await Source.ungroupTab(draggedId); }
    }
    await Source.moveTabToIndex(draggedId, tab.windowId, tab.index + (after ? 1 : 0));
    refresh();
  });

  const fav = document.createElement("img");
  fav.className = "tab__fav"; fav.src = tab.favIconUrl || ""; fav.alt = ""; fav.loading = "lazy";
  fav.onerror = () => { fav.style.visibility = "hidden"; };

  const body = document.createElement("span");
  body.className = "tab__body";
  const titleEl = document.createElement("span");
  titleEl.className = "tab__title"; titleEl.textContent = tab.title;
  const meta = document.createElement("span");
  meta.className = "tab__meta";
  meta.textContent = ago(tab.lastAccessed) ? `${tab.domain} · ${ago(tab.lastAccessed)}` : tab.domain;
  body.append(titleEl, meta);

  const actions = document.createElement("span");
  actions.className = "tab__actions";

  // pull into current window (only for tabs living elsewhere)
  if (currentWindowId != null && tab.windowId !== currentWindowId) {
    const pull = document.createElement("span");
    pull.className = "tab__act tab__act--pull"; pull.textContent = "→"; pull.title = t("pullTabTitle");
    pull.addEventListener("click", async (e) => {
      e.stopPropagation();
      await Source.moveTabsToWindow([tab.id], currentWindowId);
      refresh();
    });
    actions.append(pull);
  }

  // Close — auto-archived (recycle bin); stays under its island as "closed"
  const close = document.createElement("span");
  close.className = "tab__act tab__act--close"; close.textContent = "×"; close.title = t("closeKeptIsland");
  close.addEventListener("click", async (e) => {
    e.stopPropagation();
    el.classList.add("tab--leaving");
    const snap = { url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl, domain: tab.domain,
      islandTitle: group?.title || "", islandColor: group?.color || "" };
    await Source.closeTab(tab.id);
    if (IS_MOCK) await Archive.add(snap); // in the extension the background SW does this
    showToast(t("closed"), async () => { await Source.openUrl(tab.url); await Archive.removeByUrl(tab.url); refresh(); });
    refresh();
  });
  actions.append(close);

  el.append(fav, body, actions);

  if (staleness(tab) === "stale") {
    const nudge = document.createElement("button");
    nudge.className = "tab__nudge"; nudge.textContent = t("stillNeed");
    nudge.title = t("closeKeptArchive");
    nudge.addEventListener("click", async (e) => {
      e.stopPropagation();
      el.classList.add("tab--leaving");
      await Source.closeTab(tab.id);
      refresh();
    });
    el.append(nudge);
  }
  el.addEventListener("click", () => Source.activateTab(tab.id, tab.windowId));
  return el;
}

// ── Drop target wiring ────────────────────────────────────────────
function makeDropTarget(el, onDrop, opts = {}) {
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragState && dragState.kind === "island") {
      // reordering: show an insertion line above/below this island
      if (opts.island && dragState.id !== opts.groupId) {
        const r = el.getBoundingClientRect();
        const after = e.clientY > r.top + r.height / 2;
        el.classList.toggle("drop-after", after);
        el.classList.toggle("drop-before", !after);
      }
    } else {
      el.classList.add("drop-active"); // tab drop: highlight the whole island
    }
  });
  el.addEventListener("dragleave", (e) => {
    if (!el.contains(e.relatedTarget)) el.classList.remove("drop-active", "drop-before", "drop-after");
  });
  el.addEventListener("drop", async (e) => {
    e.preventDefault();
    const after = el.classList.contains("drop-after");
    el.classList.remove("drop-active", "drop-before", "drop-after");
    const [kind, idStr, winStr] = (e.dataTransfer.getData("text/plain") || "").split(":");
    if (!kind || Number.isNaN(Number(idStr))) return;
    await onDrop({ kind, id: Number(idStr), windowId: Number(winStr), after });
    refresh();
  });
}

// ── Island intent note ("why is this open?") ─────────────────────
function islandNote(group) {
  const text = notes[group.title] || "";
  const el = document.createElement("div");
  el.className = "island__note" + (text ? "" : " island__note--empty");
  el.textContent = text || t("whyOpen");
  el.title = t("editNote");
  el.addEventListener("click", () => startNoteEdit(el, group, text));
  return el;
}
function startNoteEdit(el, group, text) {
  const input = document.createElement("input");
  input.className = "island__note-input"; input.value = text;
  input.placeholder = t("whyOpenPh"); input.spellcheck = false;
  el.replaceWith(input); input.focus(); input.select();
  let done = false;
  const commit = async (save) => {
    if (done) return; done = true;
    if (save) { await Notes.set(group.title, input.value.trim()); refresh(); }
    else render();
  };
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") { e.preventDefault(); commit(true); }
    else if (e.key === "Escape") { e.preventDefault(); commit(false); }
  });
  input.addEventListener("blur", () => commit(true));
}

// ── Island (a tab group, or the ungrouped bucket) ─────────────────
function island({ win, group, tabs }) {
  const el = document.createElement("section");
  el.className = "island";
  const isUngrouped = !group;
  const key = isUngrouped ? `u${win.id}` : `g${group.id}`;
  if (collapsed.has(key)) el.classList.add("collapsed");

  const head = document.createElement("header");
  head.className = "island__head";

  const chev = document.createElement("button");
  chev.className = "island__chev"; chev.textContent = "⌄"; chev.title = t("collapse");
  chev.addEventListener("click", (e) => {
    e.stopPropagation();
    if (collapsed.has(key)) collapsed.delete(key); else collapsed.add(key);
    el.classList.toggle("collapsed");
  });
  head.append(chev);

  if (isUngrouped) {
    const name = document.createElement("span");
    name.className = "island__name island__name--muted"; name.textContent = t("ungrouped");
    head.append(name);
  } else {
    const dot = document.createElement("button");
    dot.className = "island__dot"; dot.style.background = GROUP_COLORS[group.color] || GROUP_COLORS.grey;
    dot.title = t("changeColor");
    const palette = document.createElement("div");
    palette.className = "island__palette";
    COLOR_KEYS.forEach((c) => {
      const sw = document.createElement("button");
      sw.className = "swatch"; sw.style.background = GROUP_COLORS[c]; sw.title = c;
      sw.addEventListener("click", async (e) => { e.stopPropagation(); await Source.setGroupColor(group.id, c); refresh(); });
      palette.append(sw);
    });
    dot.addEventListener("click", (e) => { e.stopPropagation(); palette.classList.toggle("open"); });

    const name = document.createElement("button");
    name.className = "island__name";
    name.textContent = group.title || t("untitled");
    if (!group.title) name.classList.add("island__name--muted");
    name.title = t("renameIsland");
    function startRename() {
      const input = document.createElement("input");
      input.className = "island__name-input"; input.value = group.title || "";
      input.placeholder = t("nameIsland"); input.spellcheck = false;
      name.replaceWith(input);
      input.focus(); input.select();
      let done = false;
      const commit = async (save) => {
        if (done) return; done = true;
        if (save) { await Source.renameGroup(group.id, input.value.trim()); refresh(); }
        else render();
      };
      input.addEventListener("keydown", (e) => {
        e.stopPropagation(); // don't trigger global "/" or launcher keys while typing
        if (e.key === "Enter") { e.preventDefault(); commit(true); }
        else if (e.key === "Escape") { e.preventDefault(); commit(false); }
      });
      input.addEventListener("blur", () => commit(true));
    }
    name.addEventListener("click", startRename);
    const handle = document.createElement("span");
    handle.className = "island__handle"; handle.textContent = "⠿"; handle.title = t("dragReorder");
    handle.draggable = true;
    handle.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", `island:${group.id}:${win.id}`);
      e.dataTransfer.effectAllowed = "move";
      dragState = { kind: "island", id: group.id, windowId: win.id };
      el.classList.add("island--dragging");
      document.body.classList.add("is-dragging");
    });
    handle.addEventListener("dragend", () => {
      dragState = null;
      el.classList.remove("island--dragging");
      document.body.classList.remove("is-dragging");
    });
    head.append(handle, dot, name, palette);
    if (group.id === focusGroupId) { focusGroupId = null; requestAnimationFrame(startRename); }
    el.style.setProperty("--island-color", GROUP_COLORS[group.color] || GROUP_COLORS.grey);
    el.classList.add("island--grouped");
  }

  const count = document.createElement("span");
  count.className = "island__count"; count.textContent = `${tabs.length}`;
  head.append(count);

  const grid = document.createElement("div");
  grid.className = "island__grid";
  tabs.filter(matches).forEach((t) => grid.append(tabCard(t, group)));

  el.append(head);
  if (group && group.title) el.append(islandNote(group));
  el.append(grid);

  // Closed tabs that belonged to this island — kept in place, collapsed by default
  if (group && group.title) {
    const belong = archived.filter((e) => e.islandTitle && e.islandTitle === group.title);
    belong.forEach((e) => claimedIds.add(e.id)); // claimed → not shown again in global Archive
    const closedHere = belong.filter(matchesEntry);
    if (closedHere.length) {
      const ckey = `c${group.id}`;
      const open = openClosed.has(ckey) || !!query;
      const chip = document.createElement("button");
      chip.className = "island__closedchip";
      chip.textContent = t("n_closed", closedHere.length);
      chip.addEventListener("click", () => {
        if (openClosed.has(ckey)) openClosed.delete(ckey); else openClosed.add(ckey);
        render();
      });
      const box = document.createElement("div");
      box.className = "island__closed island__grid";
      if (!open) box.classList.add("hidden");
      closedHere.forEach((e) => box.append(archiveCard(e)));
      el.append(chip, box);
    }
  }

  // Auto-grouping suggestions: ungrouped tabs sharing a domain → "make an island"
  if (!group && !query) {
    const byDomain = new Map();
    tabs.forEach((t) => { const d = t.domain || "?"; (byDomain.get(d) || byDomain.set(d, []).get(d)).push(t); });
    const suggestions = [...byDomain.entries()]
      .filter(([, ts]) => ts.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3);
    if (suggestions.length) {
      const row = document.createElement("div");
      row.className = "suggest-row";
      suggestions.forEach(([domain, ts]) => {
        const chip = document.createElement("button");
        chip.className = "suggest-chip";
        const dot = document.createElement("span");
        dot.className = "suggest-dot"; dot.style.background = GROUP_COLORS[colorForDomain(domain)];
        const label = document.createElement("span");
        label.textContent = t("group_n", ts.length, domain);
        chip.append(dot, label);
        chip.title = t("groupTitle", ts.length, domain);
        chip.addEventListener("click", async () => {
          await Source.groupTabs(ts.map((t) => t.id), domain, colorForDomain(domain));
          refresh();
        });
        row.append(chip);
      });
      el.append(row);
    }
  }

  // Drop:
  //  - island onto a grouped island → reorder (place dragged group at this one's spot)
  //  - tab into a group → group it; tab into ungrouped → move here & ungroup
  makeDropTarget(el, async (drag) => {
    if (drag.kind === "island") {
      if (!group || drag.id === group.id) return;
      const idxs = tabs.map((t) => t.index);
      const index = drag.after ? Math.max(...idxs) + 1 : Math.min(...idxs);
      await Source.moveGroupToIndex(drag.id, index);
      return;
    }
    if (group) {
      await Source.moveTabToGroup(drag.id, group.id);
    } else {
      if (drag.windowId !== win.id) await Source.moveTabsToWindow([drag.id], win.id);
      await Source.ungroupTab(drag.id);
    }
  }, { island: !!group, groupId: group ? group.id : null });
  return el;
}

function newIslandZone(win) {
  const el = document.createElement("section");
  el.className = "island island--new";
  el.innerHTML = `<div class="island--new__inner"></div>`;
  el.firstChild.textContent = t("newIsland");
  makeDropTarget(el, async (drag) => {
    if (drag.kind !== "tab") return;
    if (drag.windowId !== win.id) await Source.moveTabsToWindow([drag.id], win.id);
    const gid = await Source.moveTabToNewGroup(drag.id);
    if (gid != null && gid !== NONE) focusGroupId = gid; // render will start inline naming
  });
  return el;
}

// ── Window block ──────────────────────────────────────────────────
function windowBlock(win, index) {
  const wrap = document.createElement("div");
  wrap.className = "winblock";
  const isCurrent = win.id === currentWindowId;
  if (isCurrent) wrap.classList.add("winblock--focused");

  const head = document.createElement("div");
  head.className = "winblock__head";
  const name = document.createElement("h2");
  name.className = "winblock__name";
  name.textContent = isCurrent ? t("thisWindow") : t("window_n", index + 1);
  const count = document.createElement("span");
  count.className = "winblock__count"; count.textContent = t("n_tabs", win.tabs.length);
  head.append(name, count);

  // Consolidate: pull this whole window into the current one
  if (!isCurrent && currentWindowId != null) {
    const pull = document.createElement("button");
    pull.className = "winblock__pull";
    pull.textContent = t("pullWindow");
    pull.title = t("pullWindowTitle");
    pull.addEventListener("click", async () => { await pullWindowInto(win, currentWindowId); refresh(); });
    head.append(pull);
  }
  wrap.append(head);

  const groupOrder = [];
  const seen = new Set();
  win.tabs.slice().sort((a, b) => a.index - b.index).forEach((t) => {
    if (t.groupId !== NONE && !seen.has(t.groupId)) { seen.add(t.groupId); groupOrder.push(t.groupId); }
  });
  groupOrder.forEach((gid) => {
    const group = win.groups.find((g) => g.id === gid) || { id: gid, title: "", color: "grey" };
    const tabs = win.tabs.filter((t) => t.groupId === gid);
    if (tabs.some(matches)) wrap.append(island({ win, group, tabs }));
  });
  const ungrouped = win.tabs.filter((t) => t.groupId === NONE);
  if (ungrouped.some(matches)) wrap.append(island({ win, group: null, tabs: ungrouped }));

  if (!query) wrap.append(newIslandZone(win));
  return wrap;
}

// ── Archive section (Nagi's memory — independent of the live browser) ──
const GROUP_DOT = (c) => GROUP_COLORS[c] || "";

// Restore: reopen the tab and, if it belonged to an island, put it back there.
async function restoreEntry(entry) {
  const tab = await Source.openUrl(entry.url);
  if (entry.islandTitle && tab && tab.id != null) {
    try {
      const snap = await Source.getSnapshot();
      let gid = null;
      for (const w of snap.windows) { const g = w.groups.find((x) => x.title === entry.islandTitle); if (g) { gid = g.id; break; } }
      if (gid != null) await Source.moveTabToGroup(tab.id, gid);
      else await Source.groupTabs([tab.id], entry.islandTitle, entry.islandColor);
    } catch { /* best effort */ }
  }
  await Archive.remove(entry.id);
}

function archiveCard(entry) {
  const el = document.createElement("div");
  el.className = "tab tab--archived";
  el.title = `${entry.url}\nRestore`;

  const fav = document.createElement("img");
  fav.className = "tab__fav"; fav.src = entry.favIconUrl || ""; fav.alt = ""; fav.loading = "lazy";
  fav.onerror = () => { fav.style.visibility = "hidden"; };

  const body = document.createElement("span");
  body.className = "tab__body";
  const titleEl = document.createElement("span");
  titleEl.className = "tab__title"; titleEl.textContent = entry.title || entry.domain;
  const meta = document.createElement("span");
  meta.className = "tab__meta";
  const isle = entry.islandTitle ? ` · ${entry.islandTitle}` : "";
  const daysLeft = Math.max(0, Math.ceil((entry.archivedAt + ARCHIVE_EXPIRY_DAYS * 86400000 - Date.now()) / 86400000));
  meta.textContent = `${entry.domain}${isle} · ${ago(entry.archivedAt)} · ${t("n_left", daysLeft)}`;
  if (entry.islandColor) {
    const dot = document.createElement("span");
    dot.className = "tab__isledot"; dot.style.background = GROUP_DOT(entry.islandColor);
    meta.prepend(dot);
  }
  body.append(titleEl, meta);

  const actions = document.createElement("span");
  actions.className = "tab__actions";
  const restore = document.createElement("button");
  restore.className = "archive__restore"; restore.textContent = t("restore");
  restore.title = entry.islandTitle ? t("restoreTo", entry.islandTitle) : t("restoreReopen");
  restore.addEventListener("click", async (e) => { e.stopPropagation(); await restoreEntry(entry); refresh(); });
  const del = document.createElement("span");
  del.className = "tab__act tab__act--close"; del.textContent = "×"; del.title = t("deleteArchive");
  del.addEventListener("click", async (e) => {
    e.stopPropagation();
    el.classList.add("tab--leaving");
    await Archive.remove(entry.id);
    refresh();
  });
  actions.append(restore, del);

  el.append(fav, body, actions);
  el.addEventListener("click", async () => { await restoreEntry(entry); refresh(); });
  return el;
}

function archiveSection(items) {
  const wrap = document.createElement("div");
  wrap.className = "winblock archive";
  const visible = items.filter(matchesEntry);
  const isCollapsed = collapsed.has("arc") && !query;
  if (isCollapsed) wrap.classList.add("collapsed");

  const el = document.createElement("section");
  el.className = "island island--archive";
  if (isCollapsed) el.classList.add("collapsed");

  const head = document.createElement("header");
  head.className = "island__head";
  const chev = document.createElement("button");
  chev.className = "island__chev"; chev.textContent = "⌄"; chev.title = t("collapse");
  chev.addEventListener("click", (e) => {
    e.stopPropagation();
    if (collapsed.has("arc")) collapsed.delete("arc"); else collapsed.add("arc");
    render();
  });
  const name = document.createElement("span");
  name.className = "island__name"; name.textContent = t("archive");
  const note = document.createElement("span");
  note.className = "archive__note"; note.textContent = t("autoClears", ARCHIVE_EXPIRY_DAYS);
  const count = document.createElement("span");
  count.className = "island__count"; count.textContent = `${items.length}`;
  head.append(chev, name, note, count);

  if (items.length) {
    const clear = document.createElement("button");
    clear.className = "archive__clear"; clear.textContent = t("clear"); clear.title = t("clearTitle");
    clear.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (confirm(t("clearConfirm"))) { await Archive.clear(); refresh(); }
    });
    head.insertBefore(clear, count);
  }

  const grid = document.createElement("div");
  grid.className = "island__grid";
  if (visible.length) visible.forEach((e) => grid.append(archiveCard(e)));
  else {
    const empty = document.createElement("p");
    empty.className = "archive__empty";
    empty.textContent = items.length ? t("archiveNoMatch") : t("archiveEmpty", ARCHIVE_EXPIRY_DAYS);
    grid.append(empty);
  }

  el.append(head, grid);
  el.classList.add("island--grouped");
  el.style.setProperty("--island-color", "var(--text-2)");
  wrap.append(el);
  return wrap;
}

// ── Launcher island (pinned tools) ────────────────────────────────
function faviconFor(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; } catch { return ""; }
}
function launcherSection(items) {
  const wrap = document.createElement("div");
  wrap.className = "winblock";
  const el = document.createElement("section");
  el.className = "island island--grouped island--launcher";
  el.style.setProperty("--island-color", "var(--accent)");
  if (collapsed.has("launcher")) el.classList.add("collapsed");

  const head = document.createElement("header");
  head.className = "island__head";
  const chev = document.createElement("button");
  chev.className = "island__chev"; chev.textContent = "⌄"; chev.title = t("collapse");
  chev.addEventListener("click", () => {
    if (collapsed.has("launcher")) collapsed.delete("launcher"); else collapsed.add("launcher");
    el.classList.toggle("collapsed");
  });
  const name = document.createElement("span");
  name.className = "island__name"; name.textContent = t("launcher");
  const count = document.createElement("span");
  count.className = "island__count"; count.textContent = `${items.length}`;
  head.append(chev, name, count);

  const grid = document.createElement("div");
  grid.className = "launcher-grid";
  items.forEach((it) => {
    const tile = document.createElement("button");
    tile.className = "ltile"; tile.title = it.url;
    const fav = document.createElement("img");
    fav.className = "ltile__fav"; fav.src = faviconFor(it.url); fav.alt = "";
    fav.onerror = () => { fav.style.visibility = "hidden"; };
    const nm = document.createElement("span");
    nm.className = "ltile__name"; nm.textContent = it.name;
    tile.append(fav, nm);
    if (it.key) {
      const k = document.createElement("span");
      k.className = "ltile__key"; k.textContent = it.key.toUpperCase();
      tile.append(k);
    }
    const rm = document.createElement("span");
    rm.className = "ltile__rm"; rm.textContent = "×"; rm.title = t("unpin");
    rm.addEventListener("click", async (e) => { e.stopPropagation(); await Launcher.remove(it.id); refresh(); });
    tile.append(rm);
    tile.addEventListener("click", () => openTool(it.url));
    grid.append(tile);
  });

  const add = document.createElement("button");
  add.className = "ltile ltile--add"; add.textContent = t("pinTool");
  add.addEventListener("click", async () => {
    const name = prompt(t("promptName")); if (!name) return;
    const url = prompt(t("promptUrl")); if (!url) return;
    const key = prompt(t("promptKey")) || "";
    await Launcher.add({ name: name.trim(), url: url.trim(), key: key.trim().slice(0, 1) });
    refresh();
  });
  grid.append(add);

  el.append(head, grid);
  wrap.append(el);
  return wrap;
}

// ── Render ────────────────────────────────────────────────────────
async function render() {
  currentWindowId = await Source.getCurrentWindowId();
  const snap = await Source.getSnapshot();
  archived = await Archive.list();
  launcherItems = await Launcher.list();
  notes = await Notes.map();
  claimedIds = new Set();
  const root = $("#islands");
  root.innerHTML = "";

  const allTabs = snap.windows.flatMap((w) => w.tabs);
  const shown = allTabs.filter(matches).length;
  const stale = allTabs.filter((t) => staleness(t) === "stale").length;
  const islands = snap.windows.reduce((n, w) => n + new Set(w.tabs.filter((t) => t.groupId !== NONE).map((t) => t.groupId)).size, 0);

  $("#stat-tabs").textContent = allTabs.length;
  $("#stat-islands").textContent = islands;
  $("#stat-stale").textContent = stale;
  $("#stale-row").classList.toggle("hidden", stale === 0);
  $("#btn-merge").classList.toggle("hidden", snap.windows.length <= 1);

  // current window first, then the rest (so "pull into this" reads naturally)
  const ordered = snap.windows.slice().sort((a, b) => (b.id === currentWindowId) - (a.id === currentWindowId));
  ordered
    .map((w) => ({ w, i: snap.windows.indexOf(w) }))
    .filter(({ w }) => w.tabs.some(matches) || !query)
    .forEach(({ w, i }) => root.append(windowBlock(w, i)));

  if (shown === 0 && !query) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = t("noTabs");
    root.append(empty);
  }

  // Global Archive — only entries NOT shown inline under a live island
  // (island-less closes, or whose island no longer exists). Self-cleaning.
  const orphans = archived.filter((e) => !claimedIds.has(e.id));
  root.append(archiveSection(orphans));

  // Launcher pinned at the very bottom, collapsed by default
  if (!query) root.append(launcherSection(launcherItems));

  applyQs(); // (re)highlight the quick-switch selection
}

// ── Wire up ───────────────────────────────────────────────────────
const search = $("#search");
search.addEventListener("input", () => { query = search.value.trim(); qsIndex = 0; render(); });
function typingInField() {
  const a = document.activeElement;
  return a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
}
document.addEventListener("keydown", (e) => {
  // ⌘K / Ctrl+K → focus search (spotlight-style)
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); search.focus(); search.select(); return; }
  if (e.key === "/" && document.activeElement !== search) { e.preventDefault(); search.focus(); return; }
  if (e.key === "Escape") { search.value = ""; query = ""; qsIndex = 0; render(); search.blur(); return; }

  // Quick-switch: while a query is active, ↑/↓ to pick, Enter to jump
  if (query) {
    const t = qsTargets();
    if (e.key === "ArrowDown") { e.preventDefault(); qsIndex = Math.min(t.length - 1, qsIndex + 1); applyQs(); t[qsIndex]?.scrollIntoView({ block: "nearest" }); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); qsIndex = Math.max(0, qsIndex - 1); applyQs(); t[qsIndex]?.scrollIntoView({ block: "nearest" }); return; }
    if (e.key === "Enter") {
      const el = t[qsIndex];
      if (el) { e.preventDefault(); Source.activateTab(Number(el.dataset.tabId), Number(el.dataset.windowId)); }
      return;
    }
  }

  // Launcher shortcut keys (single letter, no modifiers, not while typing)
  if (!typingInField() && !e.metaKey && !e.ctrlKey && !e.altKey && /^[a-zA-Z]$/.test(e.key)) {
    const hit = launcherItems.find((it) => it.key && it.key.toLowerCase() === e.key.toLowerCase());
    if (hit) { e.preventDefault(); openTool(hit.url); }
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".island__dot") && !e.target.closest(".island__palette")) {
    document.querySelectorAll(".island__palette.open").forEach((p) => p.classList.remove("open"));
  }
});

// Merge all other windows into the current one
$("#btn-merge").addEventListener("click", async () => {
  if (!confirm(t("mergeConfirm"))) return;
  const snap = await Source.getSnapshot();
  for (const w of snap.windows) if (w.id !== currentWindowId) await pullWindowInto(w, currentWindowId);
  refresh();
});

// View mode — one button cycles List → Compact → Card
const VIEW_MODES = ["list", "compact", "card"];
const VIEW_ICON = { list: "☰", compact: "≡", card: "▦" };
const btnView = $("#btn-view");
let viewMode = localStorage.getItem("nagi-view");
if (!VIEW_MODES.includes(viewMode)) viewMode = "list";
function applyView() {
  document.body.classList.toggle("compact", viewMode === "compact");
  document.body.classList.toggle("view-card", viewMode === "card");
  btnView.textContent = VIEW_ICON[viewMode];
  btnView.title = t("viewTitle", t("view_" + viewMode));
}
btnView.addEventListener("click", () => {
  viewMode = VIEW_MODES[(VIEW_MODES.indexOf(viewMode) + 1) % VIEW_MODES.length];
  localStorage.setItem("nagi-view", viewMode);
  applyView();
});
applyView();

// Full view — open the canvas in a regular tab
$("#btn-full").addEventListener("click", () => {
  const url = (typeof chrome !== "undefined" && chrome.runtime?.getURL)
    ? chrome.runtime.getURL("canvas/index.html")
    : location.href.split("#")[0];
  if (typeof chrome !== "undefined" && chrome.tabs?.create) chrome.tabs.create({ url });
  else window.open(url, "_blank");
});

// Settings (background image + a home for future options)
const BG_PRESETS = [
  { name: "None", value: "none" },
  { name: "Dusk", value: "linear-gradient(135deg,#243b55,#141e30)" },
  { name: "Charcoal", value: "linear-gradient(135deg,#2d3436,#000000)" },
  { name: "Aurora", value: "radial-gradient(circle at 30% 10%,#3a1c71,#0f0c29)" },
];
function readSettings() { try { return JSON.parse(localStorage.getItem("nagi-settings") || "{}"); } catch { return {}; } }
function writeSettings(s) { localStorage.setItem("nagi-settings", JSON.stringify(s)); }
function applyBg(bg) {
  if (!bg || bg === "none") { document.body.style.backgroundImage = ""; document.body.classList.remove("has-bg"); return; }
  const layer = (bg.startsWith("url") || bg.includes("gradient")) ? bg : `url("${bg}")`;
  document.body.style.backgroundImage = `linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)), ${layer}`;
  document.body.classList.add("has-bg");
}
applyBg(readSettings().bg);

// Apply translations to the static chrome (placeholder, stat labels, button titles)
function applyStaticI18n() {
  document.documentElement.lang = lang;
  if (search) search.placeholder = t("searchPh");
  const labels = document.querySelectorAll(".stat span");
  if (labels[0]) labels[0].textContent = t("stat_tabs");
  if (labels[1]) labels[1].textContent = t("stat_islands");
  if (labels[2]) labels[2].textContent = t("stat_stale");
  const tag = document.querySelector(".brand__tag"); if (tag) tag.textContent = t("tagline");
  const bm = $("#btn-merge"); if (bm) { bm.textContent = t("mergeAll"); bm.title = t("mergeTitle"); }
  const bf = $("#btn-full"); if (bf) bf.title = t("fullTitle");
  const bs = $("#btn-settings"); if (bs) bs.title = t("settings");
}
function setLang(l) {
  lang = l;
  try { localStorage.setItem("minamo-lang", l); } catch (e) {}
  applyStaticI18n();
  applyView();
  render();
}

function openSettings() {
  if (document.getElementById("nagi-settings")) return;
  const ov = document.createElement("div");
  ov.id = "nagi-settings"; ov.className = "settings-ov";
  const panel = document.createElement("div"); panel.className = "settings";
  const head = document.createElement("header"); head.className = "settings__head";
  head.innerHTML = `<b>${t("settings")}</b>`;
  const close = document.createElement("button"); close.className = "settings__close"; close.textContent = "×"; close.title = t("close");
  head.append(close);
  panel.append(head);

  // Background
  const sec = document.createElement("div"); sec.className = "settings__sec";
  const label = document.createElement("div"); label.className = "settings__label"; label.textContent = t("background");
  const sw = document.createElement("div"); sw.className = "settings__swatches";
  const cur = () => readSettings().bg || "none";
  BG_PRESETS.forEach((p) => {
    const b = document.createElement("button"); b.className = "settings__sw"; b.textContent = p.name;
    if (p.value !== "none") b.style.backgroundImage = p.value;
    if (cur() === p.value) b.classList.add("active");
    b.addEventListener("click", () => {
      writeSettings({ ...readSettings(), bg: p.value }); applyBg(p.value);
      sw.querySelectorAll(".settings__sw").forEach((x) => x.classList.remove("active")); b.classList.add("active");
    });
    sw.append(b);
  });
  const row = document.createElement("div"); row.className = "settings__row";
  const inp = document.createElement("input"); inp.className = "settings__input";
  inp.placeholder = t("customBg");
  inp.value = (cur().startsWith && cur().startsWith("url")) ? cur().slice(5, -2) : "";
  const apply = document.createElement("button"); apply.className = "settings__apply"; apply.textContent = t("apply");
  apply.addEventListener("click", () => { const u = inp.value.trim(); if (!u) return; const v = `url("${u}")`; writeSettings({ ...readSettings(), bg: v }); applyBg(v); });
  row.append(inp, apply);
  sec.append(label, sw, row);
  panel.append(sec);

  // Language
  const lsec = document.createElement("div"); lsec.className = "settings__sec";
  const llabel = document.createElement("div"); llabel.className = "settings__label"; llabel.textContent = t("language");
  const lrow = document.createElement("div"); lrow.className = "settings__langs";
  [["en", "EN"], ["ja", "日本語"]].forEach(([code, txt]) => {
    const b = document.createElement("button"); b.className = "settings__lang"; b.textContent = txt;
    if (lang === code) b.classList.add("active");
    b.addEventListener("click", () => {
      setLang(code);
      lrow.querySelectorAll(".settings__lang").forEach((x) => x.classList.remove("active")); b.classList.add("active");
      llabel.textContent = t("language");
    });
    lrow.append(b);
  });
  lsec.append(llabel, lrow);
  panel.append(lsec);

  const note = document.createElement("p"); note.className = "settings__note"; note.textContent = t("moreSoon");
  panel.append(note);

  ov.append(panel);
  document.body.append(ov);
  const dismiss = () => ov.remove();
  close.addEventListener("click", dismiss);
  ov.addEventListener("click", (e) => { if (e.target === ov) dismiss(); });
}
$("#btn-settings").addEventListener("click", openSettings);

if (IS_MOCK) document.body.classList.add("is-mock");
applyStaticI18n();
Source.onChange(render);
Archive.onChange(render);
Launcher.onChange(render);
Notes.onChange(render);
render();
