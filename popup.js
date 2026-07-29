const SEARCH_URL = "https://searchapi.eastmoney.com/api/suggest/get";
const SEARCH_TOKEN = "D43BF722C8E33BDC906FB84D85E326E8";
const QUOTE_URL = "https://push2.eastmoney.com/api/qt/stock/get";

const codeInput = document.getElementById("codeInput");
const addBtn = document.getElementById("addBtn");
const msgEl = document.getElementById("msg");
const listEl = document.getElementById("list");
const emptyEl = document.getElementById("empty");
const countEl = document.getElementById("count");
const updatedAtEl = document.getElementById("updatedAt");

let watchList = [];

function setMsg(text, isOk = false) {
  msgEl.textContent = text;
  msgEl.className = "msg" + (isOk ? " ok" : "");
}

function validateCode(code) {
  return /^[A-Za-z][A-Za-z0-9.]{0,9}$/.test(code);
}

// Resolve a US ticker via the Eastmoney suggest API, then fetch the English
// company name via the quote API (f730; f14 is the Chinese name).
// market: 105 NASDAQ / 106 NYSE / 107 AMEX
async function fetchStock(symbol) {
  const url = `${SEARCH_URL}?input=${encodeURIComponent(symbol)}&type=14&token=${SEARCH_TOKEN}&count=10`;
  const res = await fetch(url, { headers: { Referer: "https://quote.eastmoney.com/" } });
  if (!res.ok) throw new Error("Network error");
  const json = await res.json();
  const rows = (json.QuotationCodeTable && json.QuotationCodeTable.Data) || [];
  const upper = symbol.toUpperCase();
  const usRows = rows.filter(r => r.Classify === "UsStock" && r.UnifiedCode === upper);
  // Prefer common stock (SecurityType 20), fall back to others (ETF etc.)
  const hit = usRows.find(r => r.SecurityType === "20") || usRows[0];
  if (!hit) throw new Error("Symbol not found");

  const market = Number(hit.MktNum);
  const name = await fetchEnglishName(market, hit.UnifiedCode);
  return {
    code: hit.UnifiedCode,
    name: name || hit.UnifiedCode,
    market,
    exchange: hit.JYS || "",
  };
}

async function fetchEnglishName(market, code) {
  try {
    const url = `${QUOTE_URL}?secid=${market}.${encodeURIComponent(code)}&fields=f57,f730`;
    const res = await fetch(url, { headers: { Referer: "https://quote.eastmoney.com/" } });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data && json.data.f730) || null;
  } catch (e) {
    return null;
  }
}

async function addStock() {
  const code = codeInput.value.trim().toUpperCase();
  if (!validateCode(code)) {
    setMsg("Enter a ticker (starts with a letter; letters, digits and dots allowed)");
    return;
  }
  if (watchList.some(s => s.code === code)) {
    setMsg("Already in watchlist");
    return;
  }
  addBtn.disabled = true;
  setMsg("Searching...");
  try {
    const stock = await fetchStock(code);
    watchList.push(stock);
    await save();
    codeInput.value = "";
    addBtn.disabled = true;
    setMsg(`Added ${stock.name} (${stock.code})`, true);
    render();
  } catch (e) {
    setMsg(e.message || "Failed to add");
  } finally {
    addBtn.disabled = codeInput.value.trim().length === 0;
  }
}

async function removeStock(code) {
  watchList = watchList.filter(s => s.code !== code);
  await save();
  render();
}

async function move(code, delta) {
  const i = watchList.findIndex(s => s.code === code);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= watchList.length) return;
  [watchList[i], watchList[j]] = [watchList[j], watchList[i]];
  await save();
  render();
}

async function save() {
  await chrome.storage.local.set({ watchList });
}

function render() {
  listEl.innerHTML = "";
  countEl.textContent = `(${watchList.length})`;
  emptyEl.style.display = watchList.length ? "none" : "block";

  watchList.forEach((s, i) => {
    const li = document.createElement("li");

    const code = document.createElement("span");
    code.className = "code";
    code.textContent = s.code;

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = s.name;

    const exch = document.createElement("span");
    exch.className = "exch";
    exch.textContent = s.exchange || "";

    const actions = document.createElement("div");
    actions.className = "actions";

    const up = document.createElement("button");
    up.className = "ghost";
    up.textContent = "↑";
    up.disabled = i === 0;
    up.onclick = () => move(s.code, -1);

    const down = document.createElement("button");
    down.className = "ghost";
    down.textContent = "↓";
    down.disabled = i === watchList.length - 1;
    down.onclick = () => move(s.code, 1);

    const del = document.createElement("button");
    del.className = "ghost";
    del.textContent = "Delete";
    del.onclick = () => removeStock(s.code);

    actions.append(up, down, del);
    li.append(code, name, exch, actions);
    listEl.appendChild(li);
  });
}

async function load() {
  const data = await chrome.storage.local.get(["watchList", "quotesUpdatedAt", "quotesError"]);
  watchList = data.watchList || [];
  render();
  if (data.quotesError) {
    setMsg(data.quotesError);
  } else if (data.quotesUpdatedAt) {
    const t = new Date(data.quotesUpdatedAt);
    updatedAtEl.textContent = `Quotes updated at ${t.toLocaleTimeString()}`;
  }
}

codeInput.addEventListener("input", () => {
  codeInput.value = codeInput.value.replace(/[^A-Za-z0-9.]/g, "").toUpperCase().slice(0, 10);
  addBtn.disabled = codeInput.value.length === 0;
});

codeInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addStock();
});

addBtn.addEventListener("click", addStock);

load();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.watchList) {
    watchList = changes.watchList.newValue || [];
    render();
  }
  if (changes.quotesUpdatedAt) {
    const t = new Date(changes.quotesUpdatedAt.newValue);
    updatedAtEl.textContent = `Quotes updated at ${t.toLocaleTimeString()}`;
  }
  if (changes.quotesError) {
    setMsg(changes.quotesError.newValue || "");
  }
});
