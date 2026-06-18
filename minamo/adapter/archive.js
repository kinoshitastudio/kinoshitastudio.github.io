// Nagi — Archive store
// A persistent memory layer, INDEPENDENT of the live browser mirror.
// When you let a tab go, Nagi remembers it here so you can restore it later.
// "減らすのが気持ちいい" only works if nothing is truly lost.
//
// Uses chrome.storage.local in the extension; falls back to localStorage so the
// canvas can run standalone. Same shape either way.
//
//   Entry { id, url, title, favIconUrl, domain, islandTitle, islandColor, archivedAt }

const KEY = "nagi-archive";
const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

// The archive is a recycle bin, not a library: it self-cleans so it never
// becomes the new pile. Items expire; Chrome history is the permanent backstop.
export const ARCHIVE_EXPIRY_DAYS = 7;
const EXPIRY_MS = ARCHIVE_EXPIRY_DAYS * 24 * 3600 * 1000;
const MAX = 300;

function prune(arr) {
  const cutoff = Date.now() - EXPIRY_MS;
  return arr.filter((e) => (e.archivedAt || 0) >= cutoff);
}

async function read() {
  if (hasChromeStorage) {
    const o = await chrome.storage.local.get(KEY);
    return o[KEY] || [];
  }
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
async function write(arr) {
  if (hasChromeStorage) await chrome.storage.local.set({ [KEY]: arr });
  else localStorage.setItem(KEY, JSON.stringify(arr));
}
function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `a${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

export const Archive = {
  async list() {
    return prune(await read()).sort((a, b) => b.archivedAt - a.archivedAt);
  },
  async add(entry) {
    const arr = await read();
    // expire old, de-dupe by URL (most recent wins), keep the latest MAX
    let next = prune(arr).filter((e) => e.url !== entry.url);
    next.push({ id: newId(), archivedAt: Date.now(), ...entry });
    next.sort((a, b) => b.archivedAt - a.archivedAt);
    if (next.length > MAX) next = next.slice(0, MAX);
    await write(next);
  },
  async remove(id) {
    await write((await read()).filter((e) => e.id !== id));
  },
  async removeByUrl(url) {
    await write((await read()).filter((e) => e.url !== url));
  },
  async clear() {
    await write([]);
  },
  onChange(cb) {
    if (hasChromeStorage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes[KEY]) cb();
      });
    }
  },
};
