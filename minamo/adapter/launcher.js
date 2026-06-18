// Nagi — Launcher store
// Pinned tools you launch with one click (or a key). For the studio that's NOA,
// BMBoard, etc.; for anyone it's their own daily web tools / PWAs.
// Persisted independently of the live browser, like the Archive.
//
//   Item { id, name, url, key? }

const KEY = "nagi-launcher";
const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `l${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

// Dev/dogfood seed = kinoshita studio's own tools (space.html). For the public
// release this becomes empty + "pin your own tools".
const SEED = [
  { name: "NOA", url: "http://localhost:2797/", key: "N" },
  { name: "BMBoard", url: "https://bmboard.studio/", key: "B" },
  { name: "baka.seq", url: "https://kinoshita.studio/lifehack/baka.html", key: "S" },
  { name: "Ateli.er", url: "https://atelistudio.com/", key: "A" },
  { name: "Library", url: "https://kinoshita.studio/Library/", key: "L" },
  { name: "DDD", url: "https://dddtodo.github.io/ddd/", key: "D" },
  { name: "Disaster", url: "https://kinoshita.studio/disaster/", key: "F" },
].map((x) => ({ id: newId(), ...x }));

async function read() {
  if (hasChromeStorage) { const o = await chrome.storage.local.get(KEY); return o[KEY] ?? null; }
  try { const v = localStorage.getItem(KEY); return v == null ? null : JSON.parse(v); } catch { return null; }
}
async function write(arr) {
  if (hasChromeStorage) await chrome.storage.local.set({ [KEY]: arr });
  else localStorage.setItem(KEY, JSON.stringify(arr));
}

export const Launcher = {
  async list() {
    let arr = await read();
    if (arr == null) { arr = SEED; await write(arr); } // first run → seed
    return arr;
  },
  async add(item) {
    const arr = (await read()) || [];
    arr.push({ id: newId(), ...item });
    await write(arr);
  },
  async remove(id) {
    await write(((await read()) || []).filter((x) => x.id !== id));
  },
  onChange(cb) {
    if (hasChromeStorage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes[KEY]) cb();
      });
    }
  },
};
