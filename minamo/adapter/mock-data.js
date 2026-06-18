// Nagi — mock data source
// Lets the canvas run as a plain web app with no extension installed.
// Mirrors the full contract including tab groups (islands) + group actions.

const HOUR = 3600 * 1000;
const NONE = -1;
const now = Date.now();
let nextGroupId = 900;

function fav(d) {
  return `https://www.google.com/s2/favicons?domain=${d}&sz=64`;
}

const MOCK = {
  windows: [
    {
      id: 1,
      focused: true,
      groups: [
        { id: 101, title: "営業", color: "blue", collapsed: false },
        { id: 102, title: "制作", color: "green", collapsed: false },
      ],
      tabs: [
        { id: 11, windowId: 1, index: 0, groupId: 101, title: "Inbox — Gmail", url: "https://mail.google.com", domain: "mail.google.com", favIconUrl: fav("google.com"), active: true, lastAccessed: now - 0.2 * HOUR },
        { id: 12, windowId: 1, index: 1, groupId: 101, title: "山文製陶所", url: "https://www.seitousyo.jp", domain: "seitousyo.jp", favIconUrl: fav("seitousyo.jp"), active: false, lastAccessed: now - 2 * HOUR },
        { id: 13, windowId: 1, index: 2, groupId: 102, title: "Figma — Overview Canvas", url: "https://figma.com/file", domain: "figma.com", favIconUrl: fav("figma.com"), active: false, lastAccessed: now - 3 * HOUR },
        { id: 14, windowId: 1, index: 3, groupId: 102, title: "GitHub — Nagi", url: "https://github.com", domain: "github.com", favIconUrl: fav("github.com"), active: false, lastAccessed: now - 5 * HOUR },
        { id: 15, windowId: 1, index: 4, groupId: NONE, title: "Stack Overflow — tabs API", url: "https://stackoverflow.com/q/123", domain: "stackoverflow.com", favIconUrl: fav("stackoverflow.com"), active: false, lastAccessed: now - 30 * HOUR },
        { id: 16, windowId: 1, index: 5, groupId: NONE, title: "MDN — chrome.tabGroups", url: "https://developer.mozilla.org", domain: "developer.mozilla.org", favIconUrl: fav("mozilla.org"), active: false, lastAccessed: now - 80 * HOUR },
        { id: 17, windowId: 1, index: 6, groupId: NONE, title: "Reddit — r/webdev", url: "https://reddit.com/r/webdev", domain: "reddit.com", favIconUrl: fav("reddit.com"), active: false, lastAccessed: now - 4 * HOUR },
        { id: 18, windowId: 1, index: 7, groupId: NONE, title: "Reddit — r/chrome", url: "https://reddit.com/r/chrome", domain: "reddit.com", favIconUrl: fav("reddit.com"), active: false, lastAccessed: now - 7 * HOUR },
      ],
    },
    {
      id: 2,
      focused: false,
      groups: [],
      tabs: [
        { id: 21, windowId: 2, index: 0, groupId: NONE, title: "YouTube — Building a $100B Startup", url: "https://youtube.com", domain: "youtube.com", favIconUrl: fav("youtube.com"), active: true, lastAccessed: now - 1 * HOUR },
        { id: 22, windowId: 2, index: 1, groupId: NONE, title: "Y Combinator", url: "https://ycombinator.com", domain: "ycombinator.com", favIconUrl: fav("ycombinator.com"), active: false, lastAccessed: now - 6 * HOUR },
      ],
    },
  ],
};

function findTab(id) {
  for (const w of MOCK.windows) {
    const t = w.tabs.find((x) => x.id === id);
    if (t) return { tab: t, win: w };
  }
  return {};
}

export const MockSource = {
  available() { return true; },
  async getSnapshot() { return JSON.parse(JSON.stringify(MOCK)); },
  async activateTab() { /* no-op */ },
  async openUrl(url) { window.open(url, "_blank"); return null; },
  async closeTab(tabId) {
    MOCK.windows.forEach((w) => { w.tabs = w.tabs.filter((t) => t.id !== tabId); });
  },
  async moveTabToGroup(tabId, groupId) {
    const { tab } = findTab(tabId);
    if (tab) tab.groupId = groupId;
  },
  async moveTabToNewGroup(tabId) {
    const { tab, win } = findTab(tabId);
    if (!tab) return NONE;
    const id = ++nextGroupId;
    win.groups.push({ id, title: "", color: "grey", collapsed: false });
    tab.groupId = id;
    return id;
  },
  async groupTabs(tabIds, title, color) {
    const first = findTab(tabIds[0]);
    if (!first.win) return NONE;
    const id = ++nextGroupId;
    first.win.groups.push({ id, title: title || "", color: color || "grey", collapsed: false });
    tabIds.forEach((tid) => { const { tab } = findTab(tid); if (tab) tab.groupId = id; });
    return id;
  },
  async ungroupTab(tabId) {
    const { tab } = findTab(tabId);
    if (tab) tab.groupId = NONE;
  },
  async renameGroup(groupId, title) {
    MOCK.windows.forEach((w) => { const g = w.groups.find((x) => x.id === groupId); if (g) g.title = title; });
  },
  async setGroupColor(groupId, color) {
    MOCK.windows.forEach((w) => { const g = w.groups.find((x) => x.id === groupId); if (g) g.color = color; });
  },
  async getCurrentWindowId() {
    const f = MOCK.windows.find((w) => w.focused);
    return f ? f.id : MOCK.windows[0]?.id;
  },
  async moveGroupToIndex(groupId, index) {
    for (const w of MOCK.windows) {
      const gtabs = w.tabs.filter((t) => t.groupId === groupId);
      if (!gtabs.length) continue;
      w.tabs = w.tabs.filter((t) => t.groupId !== groupId);
      let pos = w.tabs.findIndex((t) => t.index >= index);
      if (pos < 0) pos = w.tabs.length;
      w.tabs.splice(pos, 0, ...gtabs);
      w.tabs.forEach((t, i) => { t.index = i; });
      break;
    }
  },
  async moveTabToIndex(tabId, windowId, index) {
    const w = MOCK.windows.find((x) => x.id === windowId);
    if (!w) return;
    let t = null;
    for (const x of MOCK.windows) {
      const f = x.tabs.find((y) => y.id === tabId);
      if (f) { t = f; x.tabs = x.tabs.filter((y) => y.id !== tabId); break; }
    }
    if (!t) return;
    t.windowId = windowId;
    let pos = w.tabs.findIndex((x) => x.index >= index);
    if (pos < 0) pos = w.tabs.length;
    w.tabs.splice(pos, 0, t);
    w.tabs.forEach((x, i) => { x.index = i; });
  },
  async moveGroupToWindow(groupId, windowId) {
    const target = MOCK.windows.find((w) => w.id === windowId);
    if (!target) return;
    for (const w of MOCK.windows) {
      if (w.id === windowId) continue;
      const gi = w.groups.findIndex((g) => g.id === groupId);
      if (gi === -1) continue;
      target.groups.push(w.groups.splice(gi, 1)[0]);
      const moving = w.tabs.filter((t) => t.groupId === groupId);
      w.tabs = w.tabs.filter((t) => t.groupId !== groupId);
      moving.forEach((t) => { t.windowId = windowId; target.tabs.push(t); });
    }
  },
  async moveTabsToWindow(tabIds, windowId) {
    const target = MOCK.windows.find((w) => w.id === windowId);
    if (!target) return;
    tabIds.forEach((id) => {
      const { tab, win } = findTab(id);
      if (!tab || win.id === windowId) return;
      win.tabs = win.tabs.filter((t) => t.id !== id);
      tab.windowId = windowId; tab.groupId = NONE; target.tabs.push(tab);
    });
  },
  onChange() { /* static */ },
};
