// ─── Config ────────────────────────────────────────────────
// This is where your Python backend is running
const API_BASE = "https://yt-downloader-production-bd10.up.railway.app";

// ─── Grab all the elements we need ────────────────────────
const urlInput = document.getElementById("url-input");
const previewBtn = document.getElementById("preview-btn");
const previewBox = document.getElementById("preview-box");
const previewThumb = document.getElementById("preview-thumb");
const previewTitle = document.getElementById("preview-title");
const previewUpload = document.getElementById("preview-uploader");
const previewDur = document.getElementById("preview-duration");
const downloadBtn = document.getElementById("download-btn");
const btnLabel = document.getElementById("btn-label");
const statusEl = document.getElementById("status");
const statusText = document.getElementById("status-text");
const spinner = document.getElementById("spinner");
const qualityGroup = document.getElementById("quality-group");
const qualitySelect = document.getElementById("quality-select");
const fmtMp4 = document.getElementById("fmt-mp4");
const fmtMp3 = document.getElementById("fmt-mp3");

// ─── State ─────────────────────────────────────────────────
let selectedFormat = "mp4"; // default

// ─── Format Toggle (MP4 / MP3) ─────────────────────────────
fmtMp4.addEventListener("click", () => {
  selectedFormat = "mp4";
  fmtMp4.classList.add("active");
  fmtMp3.classList.remove("active");
  qualityGroup.style.display = "flex"; // show quality for video
});

fmtMp3.addEventListener("click", () => {
  selectedFormat = "mp3";
  fmtMp3.classList.add("active");
  fmtMp4.classList.remove("active");
  qualityGroup.style.display = "none"; // hide quality for audio
});

// ─── Helper: Format seconds into mm:ss or hh:mm:ss ─────────
function formatDuration(seconds) {
  if (!seconds) return "Unknown duration";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Helper: Show status message ───────────────────────────
function showStatus(message, type = "loading") {
  statusEl.className = "status"; // reset classes
  statusEl.classList.remove("hidden");

  if (type === "loading") {
    spinner.classList.remove("hidden");
    statusEl.classList.add("loading");
  } else {
    spinner.classList.add("hidden");
  }

  if (type === "error") statusEl.classList.add("error");
  if (type === "success") statusEl.classList.add("success");

  statusText.textContent = message;
}

function hideStatus() {
  statusEl.classList.add("hidden");
}

// ─── Preview Button — fetch video info ─────────────────────
previewBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();

  if (!url) {
    showStatus("Please paste a YouTube URL first.", "error");
    return;
  }

  showStatus("Fetching video info...", "loading");
  previewBox.classList.add("hidden");

  try {
    // Calls GET /info?url=... on your FastAPI backend
    const res = await fetch(`${API_BASE}/info?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.detail || "Failed to fetch info");

    // Populate the preview card
    previewThumb.src = data.thumbnail;
    previewTitle.textContent = data.title;
    previewUpload.textContent = data.uploader;
    previewDur.textContent = formatDuration(data.duration);

    previewBox.classList.remove("hidden");
    hideStatus();

    // Re-init lucide icons (thumbnail area is new DOM)
    lucide.createIcons();
  } catch (err) {
    showStatus(`Error: ${err.message}`, "error");
  }
});

// ─── Allow pressing Enter in the input to trigger preview ──
urlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") previewBtn.click();
});

// ─── Download Button ────────────────────────────────────────
downloadBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();

  if (!url) {
    showStatus("Please paste a YouTube URL first.", "error");
    return;
  }

  const quality = qualitySelect.value;

  // Disable button while downloading
  downloadBtn.disabled = true;
  btnLabel.textContent = "Downloading...";
  showStatus("Sending request to backend...", "loading");

  try {
    // Calls POST /download on your FastAPI backend
    const res = await fetch(`${API_BASE}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: url,
        format: selectedFormat,
        quality: quality,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Download failed");
    }

    showStatus("Processing download...", "loading");

    // yt-dlp can take a while — we receive the file as a blob
    const blob = await res.blob();

    // Figure out filename from the response headers
    const disposition = res.headers.get("content-disposition");
    let filename = `download.${selectedFormat}`;
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match) filename = match[1];
    }

    // Trick the browser into downloading the blob as a file
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);

    showStatus(`✓ Downloaded: ${filename}`, "success");
  } catch (err) {
    showStatus(`Error: ${err.message}`, "error");
  } finally {
    // Re-enable button no matter what
    downloadBtn.disabled = false;
    btnLabel.textContent = "Download";
  }
});
