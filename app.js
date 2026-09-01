// Gym Lift Tracker — all data lives on-device in localStorage. No server, no account.

const STORAGE_KEY = "gymLiftTracker.v1";

const DEFAULT_LIFTS = [
  { name: "Squat", unit: "lb" },
  { name: "Bench Press", unit: "lb" },
  { name: "Clean", unit: "lb" },
  { name: "Snatch", unit: "lb" },
];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error("Corrupt saved data, resetting.", e);
    }
  }
  const now = Date.now();
  return {
    lifts: DEFAULT_LIFTS.map((l) => ({ id: uid(), createdAt: now, ...l })),
    entries: [],
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
let view = { type: "home" };

const app = document.getElementById("app");
const pageTitle = document.getElementById("pageTitle");
const backBtn = document.getElementById("backBtn");
const addLiftBtn = document.getElementById("addLiftBtn");
const sheetOverlay = document.getElementById("sheetOverlay");
const sheet = document.getElementById("sheet");

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function estOneRepMax(weight, reps) {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

function entriesForLift(liftId) {
  return state.entries
    .filter((e) => e.liftId === liftId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function bestForLift(liftId) {
  const entries = entriesForLift(liftId);
  if (!entries.length) return null;
  return entries.reduce((best, e) => {
    const est = estOneRepMax(e.weight, e.reps);
    return est > best.est ? { est, entry: e } : best;
  }, { est: -Infinity, entry: null });
}

function closeSheet() {
  sheetOverlay.hidden = true;
  sheet.innerHTML = "";
}

function openSheet(html, onMount) {
  sheet.innerHTML = html;
  sheetOverlay.hidden = false;
  if (onMount) onMount(sheet);
}

sheetOverlay.addEventListener("click", (e) => {
  if (e.target === sheetOverlay) closeSheet();
});

// ---------- Rendering ----------

function render() {
  if (view.type === "home") renderHome();
  else if (view.type === "detail") renderDetail(view.liftId);
}

function renderHome() {
  pageTitle.textContent = "Lift Tracker";
  backBtn.hidden = true;
  addLiftBtn.hidden = false;

  if (!state.lifts.length) {
    app.innerHTML = `<div class="empty-state">No lifts yet.<br>Tap + to add your first one.</div>`;
    return;
  }

  const cards = state.lifts
    .map((lift) => {
      const best = bestForLift(lift.id);
      const entries = entriesForLift(lift.id);
      const lastLine = entries.length
        ? `Last: ${entries[0].weight}${lift.unit} × ${entries[0].reps} on ${formatDate(entries[0].date)}`
        : "No sets logged yet";
      const bestLine = best
        ? `Best set: ${best.entry.weight}${lift.unit} × ${best.entry.reps} (est. 1RM ${Math.round(best.est)}${lift.unit})`
        : "";
      return `
        <button class="lift-card" data-id="${lift.id}">
          <span class="name">${escapeHtml(lift.name)}</span>
          <span class="meta">${lastLine}</span>
          ${bestLine ? `<span class="best">${bestLine}</span>` : ""}
        </button>
      `;
    })
    .join("");

  app.innerHTML = `<div class="lift-grid">${cards}</div>`;

  app.querySelectorAll(".lift-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      view = { type: "detail", liftId: btn.dataset.id };
      render();
    });
  });
}

function renderDetail(liftId) {
  const lift = state.lifts.find((l) => l.id === liftId);
  if (!lift) {
    view = { type: "home" };
    return render();
  }

  pageTitle.textContent = lift.name;
  backBtn.hidden = false;
  addLiftBtn.hidden = true;

  const entries = entriesForLift(liftId);
  const historyHtml = entries.length
    ? entries
        .map(
          (e) => `
        <div class="history-row" data-id="${e.id}">
          <div>
            <div class="set">${e.weight}${lift.unit} × ${e.reps}${e.sets > 1 ? ` × ${e.sets} sets` : ""}</div>
            <div class="date">${formatDate(e.date)}${e.note ? " — " + escapeHtml(e.note) : ""}</div>
          </div>
          <button class="del" data-id="${e.id}" aria-label="Delete set">Delete</button>
        </div>
      `
        )
        .join("")
    : `<div class="empty-state">No sets logged yet. Add your first one above.</div>`;

  app.innerHTML = `
    <div class="detail-header">
      <span class="pill">${lift.unit}</span>
      <button class="link" id="removeLiftBtn">Remove lift</button>
    </div>

    <form class="log-form" id="logForm">
      <div class="row">
        <div class="field">
          <label for="weight">Weight (${lift.unit})</label>
          <input type="number" id="weight" inputmode="decimal" step="0.5" min="0" required>
        </div>
        <div class="field">
          <label for="reps">Reps</label>
          <input type="number" id="reps" inputmode="numeric" min="1" value="1" required>
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label for="sets">Sets</label>
          <input type="number" id="sets" inputmode="numeric" min="1" value="1" required>
        </div>
        <div class="field">
          <label for="date">Date</label>
          <input type="date" id="date" value="${todayISO()}" required>
        </div>
      </div>
      <div class="field">
        <label for="note">Note (optional)</label>
        <input type="text" id="note" placeholder="e.g. felt heavy, PR attempt">
      </div>
      <button type="submit" class="primary">Log set</button>
    </form>

    <div class="section-title">History</div>
    <div class="history-list">${historyHtml}</div>
  `;

  document.getElementById("logForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const weight = parseFloat(document.getElementById("weight").value);
    const reps = parseInt(document.getElementById("reps").value, 10);
    const sets = parseInt(document.getElementById("sets").value, 10);
    const date = document.getElementById("date").value;
    const note = document.getElementById("note").value.trim();
    if (!weight || !reps || !sets || !date) return;

    state.entries.push({
      id: uid(),
      liftId,
      weight,
      reps,
      sets,
      date,
      note,
      createdAt: Date.now(),
    });
    saveState();
    renderDetail(liftId);
  });

  app.querySelectorAll(".del").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.entries = state.entries.filter((e) => e.id !== btn.dataset.id);
      saveState();
      renderDetail(liftId);
    });
  });

  document.getElementById("removeLiftBtn").addEventListener("click", () => {
    confirmRemoveLift(lift);
  });
}

function confirmRemoveLift(lift) {
  openSheet(`
    <h2>Remove "${escapeHtml(lift.name)}"?</h2>
    <p style="color:var(--muted); font-size:14px; margin:0;">
      This deletes the lift and all ${entriesForLift(lift.id).length} logged set(s) for it. This can't be undone.
    </p>
    <div class="sheet-actions">
      <button class="secondary" id="cancelRemove">Cancel</button>
      <button class="primary" id="confirmRemove" style="background:var(--danger); color:#fff;">Remove</button>
    </div>
  `, (root) => {
    root.querySelector("#cancelRemove").addEventListener("click", closeSheet);
    root.querySelector("#confirmRemove").addEventListener("click", () => {
      state.lifts = state.lifts.filter((l) => l.id !== lift.id);
      state.entries = state.entries.filter((e) => e.liftId !== lift.id);
      saveState();
      closeSheet();
      view = { type: "home" };
      render();
    });
  });
}

function openAddLiftSheet() {
  openSheet(`
    <h2>Add a lift</h2>
    <div class="field">
      <label for="newLiftName">Name</label>
      <input type="text" id="newLiftName" placeholder="e.g. Deadlift" autofocus>
    </div>
    <div class="field">
      <label for="newLiftUnit">Unit</label>
      <select id="newLiftUnit">
        <option value="lb">lb</option>
        <option value="kg">kg</option>
      </select>
    </div>
    <div class="sheet-actions">
      <button class="secondary" id="cancelAdd">Cancel</button>
      <button class="primary" id="confirmAdd">Add lift</button>
    </div>
  `, (root) => {
    const nameInput = root.querySelector("#newLiftName");
    root.querySelector("#cancelAdd").addEventListener("click", closeSheet);
    root.querySelector("#confirmAdd").addEventListener("click", () => {
      const name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      const unit = root.querySelector("#newLiftUnit").value;
      state.lifts.push({ id: uid(), name, unit, createdAt: Date.now() });
      saveState();
      closeSheet();
      render();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

backBtn.addEventListener("click", () => {
  view = { type: "home" };
  render();
});

addLiftBtn.addEventListener("click", openAddLiftSheet);

render();

// ---------- PWA install / offline ----------

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((err) => {
      console.error("Service worker registration failed", err);
    });
  });
}
