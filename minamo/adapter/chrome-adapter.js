// Nagi — Chrome data adapter
// Implements the Nagi data contract on top of the chrome.* APIs.
// The canvas never touches chrome.* directly — only this file does.
// Phase 2 (cross-profile) will swap this for an Electron/native adapter
// that returns the SAME contract, so the canvas stays untouched.
//
// ── Data contract ────────────────────────────────────────────────
//   Snapshot { windows: Window[] }
//   Window  { id, focused, groups: Group[], tabs: Tab[] }
//   Group   { id, title, color, collapsed }
//   Tab {
//     id, windowId, index, groupId,            // groupId = -1 when ungrouped
//     title, url, domain, favIconUrl, active, lastAccessed
//   }
//   Actions:
//     activateTab(tabId, windowId)
//     closeTab(tabId)
//     moveTabToGroup(tabId, groupId)      // existing island
//     moveTabToNewGroup(tabId) -> groupId // start a new island
//     ungroupTab(tabId)                   // drop out of all islands
//     renameGroup(groupId, title)
//     setGroupColor(groupId, color)
// ─────────────────────────────────────────────────────────────────

const NONE = -1; // chrome.tabGroups.TAB_GROUP_ID_NONE

function domainOf(url) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return h || url;
  } catch {
    return url || "";
  }
}

export const ChromeSource = {
  available() {
    return typeof chrome !== "undefined" && !!chrome.windows && !!chrome.tabGroups;
  },

  async getSnapshot() {
    const wins = await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] });
    const out = [];
    for (const w of wins) {
      let groups = [];
      try {
        const gs = await chrome.tabGroups.query({ windowId: w.id });
        groups = gs.map((g) => ({ id: g.id, title: g.title || "", color: g.color, collapsed: g.collapsed }));
      } catch {
        /* tabGroups may be unavailable on older Chrome */
      }
      out.push({
        id: w.id,
        focused: w.focused,
        groups,
        tabs: (w.tabs || []).map((t) => ({
          id: t.id,
          windowId: t.windowId,
          index: t.index,
          groupId: typeof t.groupId === "number" ? t.groupId : NONE,
          title: t.title || domainOf(t.url),
          url: t.url || "",
          domain: domainOf(t.url),
          favIconUrl: t.favIconUrl || "",
          active: t.active,
          lastAccessed: t.lastAccessed,
        })),
      });
    }
    return { windows: out };
  },

  async activateTab(tabId, windowId) {
    await chrome.tabs.update(tabId, { active: true });
    await chrome.windows.update(windowId, { focused: true });
  },

  async openUrl(url) {
    return await chrome.tabs.create({ url, active: true }); // returns the new tab
  },

  async closeTab(tabId) {
    await chrome.tabs.remove(tabId);
  },

  async moveTabToGroup(tabId, groupId) {
    await chrome.tabs.group({ groupId, tabIds: [tabId] });
  },

  async moveTabToNewGroup(tabId) {
    return await chrome.tabs.group({ tabIds: [tabId] }); // returns new groupId
  },

  async groupTabs(tabIds, title, color) {
    const groupId = await chrome.tabs.group({ tabIds });
    const upd = {};
    if (title) upd.title = title;
    if (color) upd.color = color;
    if (Object.keys(upd).length) await chrome.tabGroups.update(groupId, upd);
    return groupId;
  },

  async ungroupTab(tabId) {
    await chrome.tabs.ungroup(tabId);
  },

  async renameGroup(groupId, title) {
    await chrome.tabGroups.update(groupId, { title });
  },

  async setGroupColor(groupId, color) {
    await chrome.tabGroups.update(groupId, { color });
  },

  // ── Consolidate (pull into the current window) ──
  async getCurrentWindowId() {
    try { const w = await chrome.windows.getCurrent(); return w.id; } catch { return null; }
  },
  async moveGroupToWindow(groupId, windowId) {
    // moves the whole group (and its tabs) — islands survive the move
    await chrome.tabGroups.move(groupId, { windowId, index: -1 });
  },
  async moveTabsToWindow(tabIds, windowId) {
    if (tabIds.length) await chrome.tabs.move(tabIds, { windowId, index: -1 });
  },

  // ── Reorder ──
  async moveGroupToIndex(groupId, index) {
    await chrome.tabGroups.move(groupId, { index });
  },
  async moveTabToIndex(tabId, windowId, index) {
    await chrome.tabs.move(tabId, { windowId, index });
  },

  onChange(cb) {
    const evs = [
      chrome.tabs.onCreated, chrome.tabs.onRemoved, chrome.tabs.onUpdated,
      chrome.tabs.onActivated, chrome.tabs.onMoved, chrome.tabs.onAttached,
      chrome.tabs.onDetached,
      chrome.tabGroups?.onCreated, chrome.tabGroups?.onRemoved,
      chrome.tabGroups?.onUpdated, chrome.tabGroups?.onMoved,
    ].filter(Boolean);
    let timer = null;
    const fire = () => { clearTimeout(timer); timer = setTimeout(cb, 150); };
    evs.forEach((e) => e.addListener(fire));
  },
};
