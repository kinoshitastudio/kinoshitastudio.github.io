// Nagi — Notes store
// A one-line "why is this open?" intent note per island (keyed by island name).
// Islands are contexts, so the note captures the purpose of the context.
// Shared via chrome.storage so the side panel and full view stay in sync.

const KEY = "nagi-notes";
const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

async function read() {
  if (hasChromeStorage) { const o = await chrome.storage.local.get(KEY); return o[KEY] || {}; }
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
async function write(obj) {
  if (hasChromeStorage) await chrome.storage.local.set({ [KEY]: obj });
  else localStorage.setItem(KEY, JSON.stringify(obj));
}

export const Notes = {
  async map() { return await read(); },
  async set(islandTitle, text) {
    if (!islandTitle) return;
    const o = await read();
    if (text) o[islandTitle] = text; else delete o[islandTitle];
    await write(o);
  },
  onChange(cb) {
    if (hasChromeStorage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes[KEY]) cb();
      });
    }
  },
};
