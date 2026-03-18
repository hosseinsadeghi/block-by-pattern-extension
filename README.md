# 🛡️ Pattern Blocker (Chrome / Chromium Extension)

Block distracting websites or URL patterns directly in your browser — without fighting your hosts file or external apps.  
Perfect for cases like blocking **YouTube Shorts** while leaving the rest of YouTube accessible.

---

## ✨ Features

- 🔒 Block entire sites (`||tiktok.com/*`, `||twitter.com/*`, …)
- 🎯 Block only certain paths (`youtube.com/shorts/`, `reddit.com/r/all/`, …)
- ⚡ Supports regex for advanced filtering
- 🖱️ One-click toggle (ON/OFF) from the browser toolbar
- 📦 Lightweight — no hosts file edits, no system services
- 🌐 Works on Chrome, Edge, Brave, Vivaldi, Arc (any Chromium browser).  
  Firefox support is possible via Manifest V3.

---

## 🚀 Installation (Unpacked)

1. Clone or download this repository:
   ```sh
   git clone https://github.com/hosseinsadeghi/block-by-pattern-extension.git
   ```
2. Open Chrome (or Edge, Brave, etc.) and go to:
   ```
   chrome://extensions
   ```
3. Enable **Developer mode** (top-right corner).
4. Click **Load unpacked** and select the `pattern-blocker/` folder.
5. Pin the extension icon to your toolbar for quick access.

---

## ⚙️ Usage

- Click the toolbar icon to **toggle blocking**.  
  - No badge = Blocking enabled.  
  - `OFF` badge = Disabled.

- Right-click the icon → **Options** to configure patterns:
  - One rule per line
  - Lines starting with `#` are ignored (comments)
  - Examples:
    ```
    youtube.com/shorts/       # block Shorts only
    ||tiktok.com/*            # block entire TikTok domain
    /twitter\.com\/i\/spaces/ # regex for Twitter Spaces
    ```

- When a blocked URL is visited:
  - If it’s a **fresh load** → blocked instantly by Chrome’s request rules.
  - If it’s an **SPA navigation** (like clicking Shorts on YouTube) → redirected to a local **Blocked page**.

---

## 📄 File Overview

- `manifest.json` – extension definition
- `service_worker.js` – background logic (rules, toggling, SPA detection)
- `options.html` + `options.js` – configuration UI
- `blocked.html` – friendly "Blocked" screen
- `icon-128.png` – toolbar icon

---

## 🧪 Examples

- Block only YouTube Shorts:
  ```
  youtube.com/shorts/
  ```
- Block TikTok entirely:
  ```
  ||tiktok.com/*
  ```
- Block Reddit frontpage but keep subreddits:
  ```
  reddit.com/r/all/
  ```
- Regex example:
  ```
  /^https?:\/\/([^\/]+\.)?facebook\.com\/reel\//
  ```

---

## 🛠 Development

- Edit files, then reload the extension in `chrome://extensions` (click **Reload**).
- Logs appear in the **Extensions service worker** console (via the "background page" link).

---

## ⚖️ License

MIT License.  
Feel free to fork, extend, and share.

---

## 🙌 Credits

Created to solve a common pain: blocking **patterns** of distracting URLs without touching the fragile Windows `hosts` file.
