// src/services/adminStore.js
// Users + settings stay localStorage (for now)
// Audit logs move to DB via FastAPI.

import { apiGetAuditLogs, apiCreateAuditLog } from "./api";

const USERS_KEY = "admin_users_v1";
const SETTINGS_KEY = "admin_settings_v1";

const now = () => new Date().toLocaleString();

// ---------- helpers ----------
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- init ----------
export function initAdminStore() {
  const users = readJSON(USERS_KEY, null);
  const settings = readJSON(SETTINGS_KEY, null);

  if (!users) {
    writeJSON(USERS_KEY, [
      { id: "U-1001", email: "analyst@bank.com", role: "analyst", status: "active" },
      { id: "U-1002", email: "admin@bank.com", role: "admin", status: "active" },
      { id: "U-1003", email: "super@bank.com", role: "superadmin", status: "active" },
    ]);
  }

  if (!settings) {
    writeJSON(SETTINGS_KEY, {
      orangeThreshold: 40,
      redThreshold: 70,
      autoBlockRed: false,
    });
  }
}

// ---------- getters ----------
export function getUsers() {
  initAdminStore();
  return readJSON(USERS_KEY, []);
}

export function getSettings() {
  initAdminStore();
  return readJSON(SETTINGS_KEY, {
    orangeThreshold: 40,
    redThreshold: 70,
    autoBlockRed: false,
  });
}

/**
 * AUDIT LOGS NOW COME FROM DB
 */
export async function getAuditLogs() {
  return apiGetAuditLogs();
}

/**
 * Add audit entry to DB.
 * (Matches backend: { action, meta })
 */
export async function addAuditLog(action, meta = {}) {
  const entry = await apiCreateAuditLog({ action, meta });
  return entry;
}

// ---------- admin operations ----------
export async function createUser({ email, role }) {
  initAdminStore();
  if (!email?.trim()) throw new Error("Email is required");

  const users = readJSON(USERS_KEY, []);
  const exists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) throw new Error("User already exists");

  const user = {
    id: `U-${1000 + users.length + 1}`,
    email: email.trim(),
    role: role || "analyst",
    status: "active",
  };

  users.push(user);
  writeJSON(USERS_KEY, users);

  // also write audit to DB
  await addAuditLog("ADMIN_CREATE_USER", {
    id: user.id,
    email: user.email,
    role: user.role,
    time: now(),
  });

  return users;
}

export async function toggleUserStatus(id) {
  initAdminStore();
  const users = readJSON(USERS_KEY, []);
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) throw new Error("User not found");

  users[idx].status = users[idx].status === "active" ? "disabled" : "active";
  writeJSON(USERS_KEY, users);

  await addAuditLog("ADMIN_TOGGLE_USER", { id, status: users[idx].status, time: now() });
  return users;
}

export async function updateThresholds({ orangeThreshold, redThreshold, autoBlockRed }) {
  initAdminStore();

  const o = Number(orangeThreshold);
  const r = Number(redThreshold);

  if (!Number.isFinite(o) || o < 1 || o > 99) throw new Error("Orange must be 1..99");
  if (!Number.isFinite(r) || r < 1 || r > 100) throw new Error("Red must be 1..100");
  if (r <= o) throw new Error("Red threshold must be greater than orange");

  const settings = {
    orangeThreshold: o,
    redThreshold: r,
    autoBlockRed: Boolean(autoBlockRed),
  };

  writeJSON(SETTINGS_KEY, settings);

  await addAuditLog("ADMIN_UPDATE_THRESHOLDS", { ...settings, time: now() });
  return settings;
}

export async function resetAdminDemo() {
  localStorage.removeItem(USERS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  initAdminStore();
  await addAuditLog("ADMIN_RESET_DEMO", { time: now() });
}
