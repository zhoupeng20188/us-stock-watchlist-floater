# Chrome Web Store Listing — US Stock Watchlist Floater

## Name (45 chars max)

US Stock Watchlist Floater

## Summary (132 chars max)

A tiny floating ball on any page that rotates through your US stock watchlist — live price & change, hover for full quotes.

## Category

Productivity

## Language

English

## Detailed description

Keep an eye on your US stocks without leaving the page you're on.

US Stock Watchlist Floater adds a small, unobtrusive floating ball to the corner of every page. It rotates through your watchlist every few seconds, showing each stock's latest price and percent change. Hover over the ball to expand a detail panel with open, previous close, high/low, volume, amount, amplitude, volume ratio, turnover, market cap and P/B.

FEATURES
• Floating circle that cycles through your watchlist — no tab switching, no distractions
• Hover to expand a full quote panel with 13 indicators
• Drag the ball anywhere; it remembers its position
• Panel always stays on screen — it flips direction near window edges
• Quotes refresh automatically every few seconds
• Add any US ticker (AAPL, TSLA, NVDA…) — NASDAQ, NYSE and AMEX are detected automatically
• US color convention: green up, red down

PRIVACY-FRIENDLY
• Your watchlist is stored locally in your browser only
• No accounts, no tracking, no analytics
• Quote data is fetched directly from a public market-data API; nothing else leaves your browser

NOTE
Quotes may be delayed and are provided for reference only — not investment advice.

Free forever. If it helps you, you can support the author at https://ko-fi.com/forever1252

## Permission justifications (Privacy practices tab)

- **storage**: Saves the user's watchlist and the floating ball's position locally in the browser.
- **alarms**: Schedules periodic quote refreshes (every few seconds) while the browser is running.
- **host_permissions (push2.eastmoney.com, searchapi.eastmoney.com)**: Fetches US stock quote data and resolves ticker symbols to exchanges. No user data is sent — these are read-only GET requests.
- **Content script on all URLs**: The floating ball must be visible on any page the user browses; that is the core purpose of the extension. The script only renders the widget — it does not read, collect or transmit page content.

## Data usage compliance answers

- Does not collect or transmit user data (watchlist stays in local storage).
- Network requests contain only stock ticker symbols, sent to the quote API.
- No remote code execution; all code ships in the package.
