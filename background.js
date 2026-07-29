const BATCH_URL = "https://push2.eastmoney.com/api/qt/ulist.np/get";
const BATCH_FIELDS = "f2,f3,f4,f5,f6,f7,f8,f10,f12,f14,f15,f16,f17,f18,f20,f21";
const REFRESH_ALARM = "us-refresh";
const REFRESH_INTERVAL_MIN = 0.1; // 6 seconds

// Eastmoney US market codes: 105 NASDAQ / 106 NYSE / 107 AMEX
function secidOf(stock) {
  return stock.market + "." + stock.code;
}

// Eastmoney scales US price fields (f2/f4/f15/f16/f17/f18) by 1000, percent fields by 100
const PRICE_SCALE = 3;

function div(v, p) {
  if (v == null || v === "-" || v === "") return null;
  const n = Number(v);
  if (!isFinite(n)) return null;
  return n / Math.pow(10, p);
}

function parseBatch(rows) {
  const quotes = {};
  if (!Array.isArray(rows)) return quotes;
  for (const r of rows) {
    const code = r.f12;
    if (!code) continue;
    quotes[code] = {
      name: r.f14 || "",
      price: div(r.f2, PRICE_SCALE),
      change: div(r.f4, PRICE_SCALE),
      changePct: div(r.f3, 2),
      high: div(r.f15, PRICE_SCALE),
      low: div(r.f16, PRICE_SCALE),
      open: div(r.f17, PRICE_SCALE),
      preClose: div(r.f18, PRICE_SCALE),
      volume: r.f5 != null ? Number(r.f5) : null, // US volume is in shares
      amount: r.f6 != null ? Number(r.f6) : null,
      amplitude: div(r.f7, 2),
      turnover: div(r.f8, 2),
      volumeRatio: div(r.f10, 2),
      totalMv: r.f20 != null ? Number(r.f20) : null,
      circMv: r.f21 != null ? Number(r.f21) : null,
    };
  }
  return quotes;
}

async function refreshQuotes() {
  const data = await chrome.storage.local.get(["watchList", "quotes"]);
  const watchList = data.watchList || [];
  if (watchList.length === 0) {
    await chrome.storage.local.set({ quotes: {}, quotesUpdatedAt: Date.now(), quotesError: null });
    return;
  }
  const secids = watchList.map(secidOf).join(",");
  const url = `${BATCH_URL}?fields=${BATCH_FIELDS}&secids=${secids}`;
  try {
    const res = await fetch(url, { headers: { Referer: "https://quote.eastmoney.com/" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    if (json.rc !== 0) throw new Error("API error: " + json.rc);
    const rows = json.data && json.data.diff;
    const quotes = parseBatch(rows);
    // Keep stocks missing from this response (e.g. halted) from the previous snapshot
    const merged = Object.assign({}, data.quotes || {}, quotes);
    await chrome.storage.local.set({
      quotes: merged,
      quotesUpdatedAt: Date.now(),
      quotesError: null,
    });
  } catch (e) {
    await chrome.storage.local.set({
      quotesError: "Failed to fetch quotes: " + (e.message || e),
      quotesUpdatedAt: Date.now(),
    });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_INTERVAL_MIN });
  refreshQuotes();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: REFRESH_INTERVAL_MIN });
  refreshQuotes();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) refreshQuotes();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.watchList) {
    refreshQuotes();
  }
});
