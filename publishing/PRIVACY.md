# Privacy Policy — US Stock Watchlist Floater

Last updated: July 29, 2026

## Overview

US Stock Watchlist Floater ("the extension") is a browser extension that displays US stock quotes in a small floating widget. The author takes your privacy seriously: the extension is designed to collect as little data as possible — effectively none.

## What the extension stores

- Your stock watchlist (ticker symbols and company names)
- The on-screen position of the floating widget

Both are stored exclusively in your browser's local extension storage (`chrome.storage.local`). They never leave your device and are never transmitted to the author or any third party.

## Network requests

To show quotes, the extension sends read-only GET requests containing **only stock ticker symbols** (e.g. `AAPL`) to a public market-data API operated by Eastmoney (eastmoney.com). No personal information, browsing history, page content, or device identifiers are included in these requests.

## What the extension does NOT do

- No account or registration required
- No analytics, tracking, or telemetry
- No cookies are read or written
- No page content is read, collected, or transmitted — the content script only renders the floating widget
- No data is sold, shared, or transferred to third parties
- No remote code is loaded or executed; all code ships inside the extension package

## Data deletion

Uninstalling the extension, or clearing the browser's extension storage, permanently deletes all locally stored data.

## Changes to this policy

Any changes will be published at this URL with an updated date.

## Contact

For questions about this policy, open an issue on the project's GitHub repository or reach the author via https://ko-fi.com/forever1252.
