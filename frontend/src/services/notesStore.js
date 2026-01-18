const NOTES_KEY = "gp2_tx_notes_v1";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(obj) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(obj));
}

export function getNote(txId) {
  const all = readAll();
  return all[txId] || "";
}

export function saveNote(txId, text) {
  const all = readAll();
  all[txId] = text;
  writeAll(all);
}

export function deleteNote(txId) {
  const all = readAll();
  delete all[txId];
  writeAll(all);
}
