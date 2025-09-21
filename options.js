const STORAGE_KEYS = {
  enabled: "pb_enabled",
  lines: "pb_lines"
};

function defaultLines() {
  return [
    "youtube.com/shorts/",
    "||tiktok.com/*"
  ];
}

async function load() {
  const { [STORAGE_KEYS.enabled]: enabled = true, [STORAGE_KEYS.lines]: lines = defaultLines() } =
    await chrome.storage.sync.get([STORAGE_KEYS.enabled, STORAGE_KEYS.lines]);

  document.getElementById("enabled").checked = enabled;
  document.getElementById("lines").value = (lines || []).join("\n");
}

async function save() {
  const enabled = document.getElementById("enabled").checked;
  const raw = document.getElementById("lines").value || "";
  const lines = raw.split("\n");
  await chrome.storage.sync.set({ [STORAGE_KEYS.enabled]: enabled, [STORAGE_KEYS.lines]: lines });
  await chrome.runtime.sendMessage({ type: "PB_REBUILD" });
}

document.getElementById("save").addEventListener("click", save);
document.getElementById("reset").addEventListener("click", async () => {
  await chrome.storage.sync.set({ [STORAGE_KEYS.lines]: defaultLines() });
  await load();
  await chrome.runtime.sendMessage({ type: "PB_REBUILD" });
});

load();
