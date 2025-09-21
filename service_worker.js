// Storage keys
const STORAGE_KEYS = {
  enabled: "pb_enabled",
  lines: "pb_lines" // array of string patterns
};

// Give each rule a stable id derived from its index
const RULE_ID_BASE = 10000;

// Convert user line -> DNR rule (returns null if invalid/empty)
function lineToRule(line, idx) {
  const trimmed = (line || "").trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  // Heuristics:
  // - If user supplied regex: /.../ -> use regexFilter
  // - Else if starts with "|" or "||" or "*": treat as urlFilter (MV3 supports Adblock-like anchors in urlFilter)
  // - Else if looks like a domain or path, prepend "||" for domain-anchored match
  let rule = {
    id: RULE_ID_BASE + idx,
    priority: 1,
    action: { type: "block" },
    condition: {
      resourceTypes: ["main_frame", "sub_frame"] // block full page loads & iframes by default
    }
  };

  if (trimmed.startsWith("/") && trimmed.endsWith("/") && trimmed.length > 2) {
    // regex
    rule.condition.regexFilter = trimmed.slice(1, -1);
  } else {
    let urlFilter = trimmed;
    if (
      !(urlFilter.startsWith("||") ||
        urlFilter.startsWith("|") ||
        urlFilter.startsWith("*") ||
        urlFilter.includes("://"))
    ) {
      // Bare "youtube.com/shorts/" -> anchor to domain
      urlFilter = "||" + urlFilter;
    }
    rule.condition.urlFilter = urlFilter;
  }

  return rule;
}

async function rebuildRules() {
  const { [STORAGE_KEYS.enabled]: enabled = true, [STORAGE_KEYS.lines]: lines = defaultLines() } =
    await chrome.storage.sync.get([STORAGE_KEYS.enabled, STORAGE_KEYS.lines]);

  // Remove previous dynamic rules (we just replace the whole set)
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.map(r => r.id);

  if (!enabled) {
    if (removeIds.length) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds });
    }
    return;
  }

  const addRules = [];
  (lines || []).forEach((line, i) => {
    const rule = lineToRule(line, i);
    if (rule) addRules.push(rule);
  });

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules
  });
}

function defaultLines() {
  // A few sensible examples; you can edit in Options
  return [
    // EXAMPLE: block ONLY YouTube Shorts, not the rest of YouTube:
    "youtube.com/shorts/",
    // EXAMPLE: block TikTok site-wide:
    "||tiktok.com/*",
    // You can also use regex if you prefer:
    // "/^https?:\\/\\/(www\\.)?twitter\\.com\\/i\\/(?:spaces|communities)\\/.*$/"
  ];
}

async function initDefaults() {
  const curr = await chrome.storage.sync.get([STORAGE_KEYS.enabled, STORAGE_KEYS.lines]);
  const toSet = {};
  if (typeof curr[STORAGE_KEYS.enabled] !== "boolean") toSet[STORAGE_KEYS.enabled] = true;
  if (!Array.isArray(curr[STORAGE_KEYS.lines])) toSet[STORAGE_KEYS.lines] = defaultLines();
  if (Object.keys(toSet).length) await chrome.storage.sync.set(toSet);
}

chrome.runtime.onInstalled.addListener(async () => {
  await initDefaults();
  await rebuildRules();
});

// Toggle on toolbar click
chrome.action.onClicked.addListener(async () => {
  const curr = await chrome.storage.sync.get(STORAGE_KEYS.enabled);
  const enabled = !(curr[STORAGE_KEYS.enabled] ?? true);
  await chrome.storage.sync.set({ [STORAGE_KEYS.enabled]: enabled });
  await rebuildRules();
  await chrome.action.setBadgeText({ text: enabled ? "" : "OFF" });
});

// React to options changes
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "PB_REBUILD") {
    rebuildRules().then(() => sendResponse({ ok: true }));
    return true; // keep message channel open for async
  }
});

// Show OFF badge on startup if disabled
chrome.runtime.onStartup.addListener(async () => {
  const { [STORAGE_KEYS.enabled]: enabled = true } = await chrome.storage.sync.get(STORAGE_KEYS.enabled);
  await chrome.action.setBadgeText({ text: enabled ? "" : "OFF" });
});

// --- SPA URL change handling (YouTube, Twitter, etc.) ---

// Reuse stored patterns to test URLs in SPA navigations.
// Simple matcher: regex lines (/.../) use RegExp; others use substring includes.
// Good enough for cases like "youtube.com/shorts/". You can harden to Adblock syntax if needed.
async function urlMatchesBlockedPatterns(url) {
  const { pb_enabled: enabled = true, pb_lines: lines = [] } =
    await chrome.storage.sync.get(["pb_enabled", "pb_lines"]);
  if (!enabled) return false;

  for (const raw of lines) {
    const line = (raw || "").trim();
    if (!line || line.startsWith("#")) continue;

    if (line.startsWith("/") && line.endsWith("/") && line.length > 2) {
      try { if (new RegExp(line.slice(1, -1)).test(url)) return true; }
      catch { /* ignore bad regex */ }
    } else {
      // very simple contains; covers 'youtube.com/shorts/' nicely
      if (url.includes(line)) return true;
      // optionally, recognize leading "||" anchor
      if (line.startsWith("||")) {
        const needle = line.slice(2).replace(/\*+$/, "");
        if (url.includes(needle)) return true;
      }
    }
  }
  return false;
}

// Helper: redirect the tab to our local blocked page
function redirectToBlocked(tabId) {
  const blockedUrl = chrome.runtime.getURL("blocked.html");
  chrome.tabs.update(tabId, { url: blockedUrl }).catch(() => {});
}

// Fires when SPA changes the URL via history.pushState/replaceState
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  // main_frame only; ignore subframes
  if (details.frameId !== 0) return;
  // Ignore extension / chrome:// pages
  if (!/^https?:\/\//i.test(details.url)) return;

  if (await urlMatchesBlockedPatterns(details.url)) {
    redirectToBlocked(details.tabId);
  }
});

// Also handle onCommitted for fast redirects that don't hit the network
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!/^https?:\/\//i.test(details.url)) return;

  if (await urlMatchesBlockedPatterns(details.url)) {
    redirectToBlocked(details.tabId);
  }
});
