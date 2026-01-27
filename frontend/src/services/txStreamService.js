// src/services/txStreamService.js
import { txApi } from "./apiClient";

const randBetween = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const countries = ["UAE", "KSA", "Qatar", "UK", "USA", "Germany", "India"];
const devices = ["iPhone", "Android", "Windows", "Mac", "ATM", "POS"];
const channels = ["Mobile App", "Web", "ATM", "POS"];
const merchants = [
  "Amazon",
  "Noon",
  "Apple",
  "Careem",
  "Talabat",
  "Booking.com",
  "Crypto Exchange",
];
const cardTypes = ["VISA", "MasterCard", "AMEX"];

let timer = null;
let running = false;

// allow UI to subscribe to stream state
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn(running));

export const txStreamService = {
  isRunning() {
    return running;
  },

  subscribe(fn) {
    listeners.add(fn);
    // initial push
    fn(running);
    return () => listeners.delete(fn);
  },

  start() {
    if (running) return;
    running = true;
    notify();

    timer = setInterval(async () => {
      const txId = `TX-${Math.floor(1000 + Math.random() * 9000)}`;

      const payload = {
        tx_id: txId,
        user: `User ${String.fromCharCode(randBetween(65, 90))}`,
        amount: randBetween(50, 40000),
        country: pick(countries),
        device: pick(devices),
        channel: pick(channels),
        merchant: pick(merchants),
        card_type: pick(cardTypes),
        hour: randBetween(0, 23),
        ts: new Date().toISOString(),
      };

      try {
        await txApi.create(payload);
      } catch (e) {
        // ignore occasional duplicate id errors in mock mode
        console.error(e);
      }
    }, 1100);
  },

  stop() {
    if (!running) return;
    running = false;
    notify();

    if (timer) clearInterval(timer);
    timer = null;
  },

  toggle() {
    running ? this.stop() : this.start();
  },
};
