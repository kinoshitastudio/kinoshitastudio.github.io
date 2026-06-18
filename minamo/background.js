// Nagi — service worker
// 1) Clicking the toolbar icon opens the side panel (the canvas lives there).
// 2) Recycle bin: every tab you close is remembered in the Archive — whether you
//    close it via Nagi or Chrome's own ×. Close freely; nothing is truly lost.

import { Archive } from "./adapter/archive.js";

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// ── Recycle bin ───────────────────────────────────────────────────
// MV3 service workers are ephemeral: an in-memory cache would be wiped when the
// worker sleeps, so closing a tab afterwards couldn't be archived. Persist the
// last-known tab info in chrome.storage.session (survives SW restarts).
const tkey = (id) => `t${id}`;

function trivial(url) {
  return !url || url === "about:blank" ||
    /^(chrome|chrome-extension|about|edge|devtools|view-source):/.test(url);
}
function info(tab) {
  return { url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl, groupId: tab.groupId };
}
function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url || ""; }
}
async function remember(tab) {
  if (tab && tab.id != null) await chrome.storage.session.set({ [tkey(tab.id)]: info(tab) });
}

(async () => {
  try {
    const tabs = await chrome.tabs.query({});
    const obj = {};
    tabs.forEach((t) => { if (t.id != null) obj[tkey(t.id)] = info(t); });
    await chrome.storage.session.set(obj);
  } catch {}
})();

chrome.tabs.onCreated.addListener(remember);
chrome.tabs.onUpdated.addListener((_id, _info, tab) => remember(tab));
chrome.tabs.onActivated.addListener(async ({ tabId }) => { try { remember(await chrome.tabs.get(tabId)); } catch {} });

chrome.tabs.onRemoved.addListener(async (tabId) => {
  const k = tkey(tabId);
  const got = await chrome.storage.session.get(k);
  const t = got[k];
  await chrome.storage.session.remove(k);
  if (!t || trivial(t.url)) return;
  let islandTitle = "", islandColor = "";
  if (typeof t.groupId === "number" && t.groupId !== -1) {
    try { const g = await chrome.tabGroups.get(t.groupId); islandTitle = g.title || ""; islandColor = g.color || ""; } catch {}
  }
  await Archive.add({
    url: t.url, title: t.title || domainOf(t.url), favIconUrl: t.favIconUrl || "",
    domain: domainOf(t.url), islandTitle, islandColor,
  });
});
