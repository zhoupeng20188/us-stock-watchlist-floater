(() => {
  // Avoid double injection on special pages
  if (window.__usFloatingInited) return;
  window.__usFloatingInited = true;

  const STOCK_URL = "https://push2.eastmoney.com/api/qt/stock/get";
  const ROTATE_INTERVAL = 3000;
  const SINGLE_FIELDS = "f43,f57,f58,f162,f167,f168,f169,f170";
  const PRICE_DIGITS = 2;

  let state = {
    watchList: [],
    quotes: {},
    quotesError: null,
    quotesUpdatedAt: null,
    position: null,
    currentIdx: 0,
    expanded: false,
    expandedFrom: null,
    hover: false,
  };

  let root, rotateTimer, hoverTimer;

  function fmtNum(v, digits = PRICE_DIGITS, fallback = "--") {
    if (v == null || !isFinite(v)) return fallback;
    return Number(v).toFixed(digits);
  }

  function fmtBig(v) {
    if (v == null || !isFinite(v)) return "--";
    if (v >= 1e12) return (v / 1e12).toFixed(2) + "T";
    if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(2) + "K";
    return v.toFixed(0);
  }

  function colorClass(q) {
    if (!q || q.change == null) return "us-flat";
    if (q.change > 0) return "us-up";
    if (q.change < 0) return "us-down";
    return "us-flat";
  }

  function ensureRoot() {
    if (root && document.body.contains(root)) return;
    root = document.createElement("div");
    root.id = "us-floating";
    root.className = "us-circle";
    document.body.appendChild(root);
    bindEvents();
    applyPosition();
  }

  function applyPosition() {
    const p = state.position;
    if (!p) {
      root.style.right = "20px";
      root.style.bottom = "20px";
      root.style.left = "auto";
      root.style.top = "auto";
      return;
    }
    if (p.left != null) {
      root.style.left = p.left + "px";
      root.style.right = "auto";
    } else {
      root.style.right = (p.right != null ? p.right : 20) + "px";
      root.style.left = "auto";
    }
    if (p.top != null) {
      root.style.top = p.top + "px";
      root.style.bottom = "auto";
    } else {
      root.style.bottom = (p.bottom != null ? p.bottom : 20) + "px";
      root.style.top = "auto";
    }
  }

  function render() {
    ensureRoot();
    if (state.watchList.length === 0) {
      renderEmpty();
      return;
    }
    if (state.quotesError && Object.keys(state.quotes).length === 0) {
      renderError();
      return;
    }
    if (state.expanded) {
      // Remember where the circle sits so collapse can restore it exactly
      if (!state.expandedFrom) {
        const r = root.getBoundingClientRect();
        state.expandedFrom = { left: r.left, top: r.top };
      }
      renderRect();
      clampRectToViewport();
    } else {
      renderCircle();
      if (state.expandedFrom) {
        root.style.left = state.expandedFrom.left + "px";
        root.style.top = state.expandedFrom.top + "px";
        root.style.right = "auto";
        root.style.bottom = "auto";
        state.expandedFrom = null;
      }
    }
  }

  // Keep the expanded panel fully inside the viewport: near the right/bottom
  // edge it grows leftward/upward instead of overflowing off-screen
  function clampRectToViewport() {
    // Width/height transitions would report intermediate values; measure final size
    const prevTransition = root.style.transition;
    root.style.transition = "none";
    const w = root.offsetWidth;
    const h = root.offsetHeight;
    root.style.transition = prevTransition;

    const r = root.getBoundingClientRect();
    let left = r.left;
    let top = r.top;
    if (left + w > window.innerWidth - 4) left = window.innerWidth - w - 4;
    if (top + h > window.innerHeight - 4) top = window.innerHeight - h - 4;
    if (left < 4) left = 4;
    if (top < 4) top = 4;
    root.style.left = left + "px";
    root.style.top = top + "px";
    root.style.right = "auto";
    root.style.bottom = "auto";
  }

  function renderEmpty() {
    root.className = "us-circle";
    root.innerHTML = `<div class="us-placeholder">No<br>watchlist</div>`;
  }

  function renderError() {
    root.className = "us-circle";
    root.innerHTML = `<div class="us-placeholder">Failed to<br>load quotes</div>`;
  }

  function renderCircle() {
    root.className = "us-circle";
    const stock = state.watchList[state.currentIdx];
    if (!stock) return;
    const q = state.quotes[stock.code] || {};
    const cls = colorClass(q);
    const price = q.price != null ? fmtNum(q.price) : "--";
    const pct = q.changePct != null ? (q.changePct >= 0 ? "+" : "") + fmtNum(q.changePct) + "%" : "--";
    root.innerHTML = `
      <div class="us-name">${stock.name || q.name}</div>
      <div class="us-price ${cls}">${price}</div>
      <div class="us-pct ${cls}">${pct}</div>
    `;
  }

  function renderRect() {
    root.className = "us-rect";
    const stock = state.watchList[state.currentIdx];
    if (!stock) return;
    const q = state.quotes[stock.code] || {};
    const cls = colorClass(q);
    const price = q.price != null ? fmtNum(q.price) : "--";
    const pct = q.changePct != null ? (q.changePct >= 0 ? "+" : "") + fmtNum(q.changePct) + "%" : "--";
    const change = q.change != null ? (q.change >= 0 ? "+" : "") + fmtNum(q.change) : "--";
    const cells = [
      ["Open", fmtNum(q.open)],
      ["Prev Close", fmtNum(q.preClose)],
      ["High", fmtNum(q.high)],
      ["Low", fmtNum(q.low)],
      ["Volume", fmtBig(q.volume)],
      ["Amount", fmtBig(q.amount)],
      ["Amplitude", fmtNum(q.amplitude) + "%"],
      ["Vol Ratio", fmtNum(q.volumeRatio)],
      ["Turnover", fmtNum(q.turnover) + "%"],
      ["Mkt Cap", fmtBig(q.totalMv)],
      ["Float Cap", fmtBig(q.circMv)],
      // Eastmoney returns no P/E for US stocks (f162 is always 0); P/B works
      ["P/E", q.pe != null ? fmtNum(q.pe) : "--"],
      ["P/B", q.pb != null ? fmtNum(q.pb) : "--"],
    ];
    const grid = cells.map(([k, v]) =>
      `<div class="us-cell"><span class="us-k">${k}</span><span class="us-v">${v}</span></div>`
    ).join("");
    root.innerHTML = `
      <div class="us-header" data-drag="1">
        <span class="us-h-name">${stock.name || q.name}</span>
        <span class="us-h-code">${stock.code}</span>
      </div>
      <div class="us-main">
        <span class="us-m-price ${cls}">${price}</span>
        <span class="us-m-pct ${cls}">${pct}</span>
        <span class="us-m-change">${change}</span>
      </div>
      <div class="us-grid">${grid}</div>
      <div class="us-footer"><a class="us-kofi" href="https://ko-fi.com/forever1252" target="_blank" rel="noopener">☕ Coffee</a><span>${state.quotesUpdatedAt ? new Date(state.quotesUpdatedAt).toLocaleTimeString() : "--"}</span></div>
    `;
  }

  function nextStock() {
    if (state.watchList.length === 0) return;
    state.currentIdx = (state.currentIdx + 1) % state.watchList.length;
    if (!state.expanded) renderCircle();
    else renderRect();
  }

  function startRotate() {
    stopRotate();
    rotateTimer = setInterval(() => {
      if (state.expanded || state.hover) return;
      nextStock();
    }, ROTATE_INTERVAL);
  }

  function stopRotate() {
    if (rotateTimer) {
      clearInterval(rotateTimer);
      rotateTimer = null;
    }
  }

  async function fetchSingle(code, market) {
    const secid = market + "." + code;
    const url = `${STOCK_URL}?secid=${secid}&fields=${SINGLE_FIELDS}`;
    try {
      const res = await fetch(url, { headers: { Referer: "https://quote.eastmoney.com/" } });
      if (!res.ok) return;
      const json = await res.json();
      if (!json.data) return;
      const d = json.data;
      // f162 (P/E) is always 0 for US stocks; treat as null and show "--"
      const pe = d.f162 != null && d.f162 !== 0 ? d.f162 / 100 : null;
      const pb = d.f167 != null && d.f167 !== 0 ? d.f167 / 100 : null;
      const quotes = Object.assign({}, state.quotes);
      quotes[code] = Object.assign({}, quotes[code] || {}, { pe, pb });
      state.quotes = quotes;
      if (state.expanded) renderRect();
    } catch (e) {
      // ignore
    }
  }

  function bindEvents() {
    let dragState = null;
    // Hard block on hover-expand from drag-start until the mouse fully leaves the ball
    let suppressHover = false;

    root.addEventListener("mouseenter", (e) => {
      if (suppressHover || dragState || e.buttons > 0) return;
      state.hover = true;
      if (hoverTimer) clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        if (suppressHover || dragState) return;
        if (!state.expanded && state.watchList.length > 0 && !state.quotesError) {
          state.expanded = true;
          render();
          const stock = state.watchList[state.currentIdx];
          const q = state.quotes[stock.code];
          if (stock && (!q || q.pb == null)) {
            fetchSingle(stock.code, stock.market);
          }
        }
      }, 150);
    });
    root.addEventListener("mouseleave", () => {
      suppressHover = false;
      state.hover = false;
      if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
      if (dragState && dragState.moved) return;
      if (state.expanded) {
        state.expanded = false;
        render();
      }
    });

    root.addEventListener("mousedown", (e) => {
      if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
      const isHeader = e.target.closest("[data-drag]");
      const isCircle = root.classList.contains("us-circle");
      // The whole circle is draggable; in expanded state the whole panel is draggable and dragging collapses it
      if (!isHeader && !isCircle && !root.classList.contains("us-rect")) return;
      e.preventDefault();
      suppressHover = true;
      dragState = {
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        isCircle,
      };
      const rect = root.getBoundingClientRect();
      dragState.offsetX = e.clientX - rect.left;
      dragState.offsetY = e.clientY - rect.top;
      if (!isCircle) {
        const header = e.target.closest(".us-header");
        if (header) header.classList.add("dragging");
      }
    });

    function endDrag() {
      if (!dragState) return;
      const header = root.querySelector(".us-header");
      if (header) header.classList.remove("dragging");
      dragState = null;
    }

    document.addEventListener("mousemove", (e) => {
      if (!dragState) return;
      // mouseup may be lost (e.g. released outside the window); force-end the drag if buttons are up
      if (e.buttons === 0) {
        endDrag();
        return;
      }
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragState.moved = true;
      if (!dragState.moved) return;

      // When a drag starts in expanded state, collapse to the circle first and center it on the cursor,
      // so the sudden size change doesn't jam against screen edges
      if (state.expanded) {
        state.expanded = false;
        state.hover = false;
        render();
        dragState.offsetX = root.offsetWidth / 2;
        dragState.offsetY = root.offsetHeight / 2;
      }

      const w = root.offsetWidth;
      const h = root.offsetHeight;
      let left = e.clientX - dragState.offsetX;
      let top = e.clientY - dragState.offsetY;
      left = Math.max(4, Math.min(window.innerWidth - w - 4, left));
      top = Math.max(4, Math.min(window.innerHeight - h - 4, top));
      root.style.left = left + "px";
      root.style.top = top + "px";
      root.style.right = "auto";
      root.style.bottom = "auto";
      dragState.left = left;
      dragState.top = top;
    });

    document.addEventListener("mouseup", (e) => {
      if (!dragState) return;
      const wasMoved = dragState.moved;
      const header = root.querySelector(".us-header");
      if (header) header.classList.remove("dragging");

      if (wasMoved) {
        const p = { left: dragState.left, top: dragState.top, right: null, bottom: null };
        state.position = p;
        chrome.storage.local.set({ position: p });
        const rect = root.getBoundingClientRect();
        const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                       e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (!inside) {
          state.hover = false;
          state.expanded = false;
          render();
        } else {
          state.hover = true;
        }
      }
      dragState = null;
    });

    window.addEventListener("blur", endDrag);
  }

  async function load() {
    const data = await chrome.storage.local.get(["watchList", "quotes", "quotesError", "quotesUpdatedAt", "position"]);
    state.watchList = data.watchList || [];
    state.quotes = data.quotes || {};
    state.quotesError = data.quotesError;
    state.quotesUpdatedAt = data.quotesUpdatedAt;
    state.position = data.position || null;
    if (state.currentIdx >= state.watchList.length) state.currentIdx = 0;
    render();
    startRotate();
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    let needRender = false;
    if (changes.watchList) {
      state.watchList = changes.watchList.newValue || [];
      if (state.currentIdx >= state.watchList.length) state.currentIdx = 0;
      needRender = true;
    }
    if (changes.quotes) {
      state.quotes = changes.quotes.newValue || {};
      needRender = true;
    }
    if (changes.quotesError) {
      state.quotesError = changes.quotesError.newValue;
      needRender = true;
    }
    if (changes.quotesUpdatedAt) {
      state.quotesUpdatedAt = changes.quotesUpdatedAt.newValue;
      needRender = true;
    }
    if (changes.position) {
      state.position = changes.position.newValue;
      applyPosition();
    }
    if (needRender) render();
  });

  // Delayed injection in case the page is not ready
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(load, 100);
  } else {
    window.addEventListener("DOMContentLoaded", () => setTimeout(load, 100));
  }
})();
