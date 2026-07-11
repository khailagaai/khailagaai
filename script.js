const STORAGE_KEY = "betting-calculator-state-v3";
const THEME_KEY = "betting-calculator-theme";

const form = document.getElementById("entry-form");
const rateInput = document.getElementById("rate");
const amountInput = document.getElementById("amount");
const teamANameInput = document.getElementById("team-a-name");
const teamBNameInput = document.getElementById("team-b-name");
const teamALabel = document.getElementById("team-a-label");
const teamBLabel = document.getElementById("team-b-label");
const teamATotalLabel = document.getElementById("team-a-total-label");
const teamBTotalLabel = document.getElementById("team-b-total-label");
const teamATotal = document.getElementById("team-a-total");
const teamBTotal = document.getElementById("team-b-total");
const averageKhai = document.getElementById("average-khai");
const entryCount = document.getElementById("entry-count");
const historyList = document.getElementById("history-list");
const submitBtn = document.getElementById("submit-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const resetBookBtn = document.getElementById("reset-book");
const themeToggleBtn = document.getElementById("theme-toggle");
const cashoutBtn = document.getElementById("cashout-btn");
const losscutBtn = document.getElementById("losscut-btn");

const modalOverlay = document.getElementById("custom-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalInput = document.getElementById("modal-input");
const modalCancelBtn = document.getElementById("modal-cancel-btn");
const modalOkBtn = document.getElementById("modal-ok-btn");
const modalTeamSelectWrapper = document.getElementById("modal-team-select-wrapper");
const modalTeamSelect = document.getElementById("modal-team-select");

function showModal({ title, message, type = "alert", teamPrompt = false }) {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    if (type === "prompt") {
      modalInput.classList.remove("hidden");
      modalInput.value = "";
      if (teamPrompt) {
        modalTeamSelectWrapper.classList.remove("hidden");
        modalTeamSelect.options[0].text = state.teamA;
        modalTeamSelect.options[1].text = state.teamB;
      } else {
        modalTeamSelectWrapper.classList.add("hidden");
      }
      setTimeout(() => modalInput.focus(), 100);
    } else {
      modalInput.classList.add("hidden");
      modalTeamSelectWrapper.classList.add("hidden");
    }

    if (type === "alert") {
      modalCancelBtn.classList.add("hidden");
    } else {
      modalCancelBtn.classList.remove("hidden");
    }

    modalOverlay.classList.remove("hidden");

    const cleanup = (val) => {
      modalOverlay.classList.add("hidden");
      modalOkBtn.onclick = null;
      modalCancelBtn.onclick = null;
      resolve(val);
    };

    modalOkBtn.onclick = () => {
      if (type === "prompt") {
        if (teamPrompt) {
           cleanup({ rateStr: modalInput.value, teamKey: modalTeamSelect.value });
        } else {
           cleanup(modalInput.value);
        }
      } else {
        cleanup(true);
      }
    };

    modalCancelBtn.onclick = () => {
      cleanup(type === "prompt" ? null : false);
    };
    
    // Add enter key support for prompt
    if (type === "prompt") {
      modalInput.onkeydown = (e) => {
        if (e.key === "Enter") {
          modalOkBtn.click();
        }
      };
    } else {
      modalInput.onkeydown = null;
    }
  });
}

const state = {
  teamA: "Team A",
  teamB: "Team B",
  entries: [],
};

// --- Theme Management ---
function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    document.documentElement.setAttribute("data-theme", savedTheme);
  } else {
    // Default to dark if no preference saved
    document.documentElement.setAttribute("data-theme", "dark");
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem(THEME_KEY, newTheme);
}

themeToggleBtn.addEventListener("click", toggleTheme);
initTheme();
// -------------------------

let editingIndex = null;

function readState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (parsed.teamA) state.teamA = parsed.teamA;
    if (parsed.teamB) state.teamB = parsed.teamB;
    if (Array.isArray(parsed.entries)) state.entries = parsed.entries;
  } catch (error) {
    console.warn("Unable to read saved state", error);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getTotals() {
  const totals = {
    "team-a": 0,
    "team-b": 0,
  };

  state.entries.forEach((entry) => {
    const opponent = entry.teamKey === "team-a" ? "team-b" : "team-a";

    if (entry.type === "lagaai") {
      // Lagaai (Back) logic:
      // If selected team wins, profit = liability. If opponent wins, loss = amount.
      totals[entry.teamKey] += entry.liability;
      totals[opponent] -= entry.amount;
    } else {
      // Khai (Lay) logic:
      // If selected team wins, loss = liability. If opponent wins, profit = amount.
      totals[entry.teamKey] -= entry.liability;
      totals[opponent] += entry.amount;
    }
  });

  return totals;
}

function getAverageKhai() {
  const khaiEntries = state.entries;
  if (!khaiEntries.length) return 0;
  const totalAmount = khaiEntries.reduce((sum, entry) => sum + entry.amount, 0);
  if (!totalAmount) return 0;
  const weightedTotal = khaiEntries.reduce((sum, entry) => sum + entry.amount * entry.rate, 0);
  return weightedTotal / totalAmount;
}

function render() {
  teamANameInput.value = state.teamA;
  teamBNameInput.value = state.teamB;
  teamALabel.textContent = state.teamA;
  teamBLabel.textContent = state.teamB;
  teamATotalLabel.textContent = state.teamA;
  teamBTotalLabel.textContent = state.teamB;

  const totals = getTotals();

  const setTotalUI = (elementId, cardId, value) => {
    const el = document.getElementById(elementId);
    const card = document.getElementById(cardId);
    el.textContent = formatCurrency(Math.abs(value));

    card.classList.remove("positive", "negative", "neutral");
    if (value > 0) {
      card.classList.add("positive");
      el.textContent = "+" + el.textContent;
    } else if (value < 0) {
      card.classList.add("negative");
      el.textContent = "-" + el.textContent;
    } else {
      card.classList.add("neutral");
    }
  };

  setTotalUI("team-a-total", "team-a-card", totals["team-a"]);
  setTotalUI("team-b-total", "team-b-card", totals["team-b"]);

  const avgKhai = getAverageKhai();
  averageKhai.textContent = avgKhai > 0 ? avgKhai.toFixed(2) + "%" : "0%";
  entryCount.textContent = state.entries.length;

  historyList.innerHTML = "";
  if (state.entries.length === 0) {
    historyList.innerHTML = `<div class="empty-state">No entries yet. Add your first bet above!</div>`;
    return;
  }

  state.entries.forEach((entry, index) => {
    const item = document.createElement("div");
    item.className = "history-item";

    const teamName = entry.teamKey === "team-a" ? state.teamA : state.teamB;
    const badgeClass = entry.type === "khai" ? "badge-khai" : "badge-lagaai";
    const typeLabel = entry.type === "khai" ? "Khai (Lay)" : "Lagaai (Back)";

    item.innerHTML = `
      <div class="history-details">
        <div class="history-header">
          <span class="badge ${badgeClass}">${typeLabel}</span>
          <span class="history-team">${teamName}</span>
        </div>
        <div class="history-stats">
          <span>Amount: <strong>${formatCurrency(entry.amount)}</strong></span>
          <span>Rate: <strong>${entry.rate}%</strong></span>
          <span class="history-liability">Liability: ${formatCurrency(entry.liability)}</span>
        </div>
      </div>
      <div class="history-actions">
        <button class="icon-btn edit-btn" data-edit="${index}" title="Edit">✏️</button>
        <button class="icon-btn delete-btn" data-delete="${index}" title="Delete">🗑️</button>
      </div>
    `;
    historyList.appendChild(item);
  });
}

function resetForm() {
  rateInput.value = "";
  amountInput.value = "";
  teamANameInput.value = state.teamA || "Team A";
  teamBNameInput.value = state.teamB || "Team B";
  document.querySelector('input[name="bet-type"][value="khai"]').checked = true;
  document.querySelector('input[name="khai-team"][value="team-a"]').checked = true;
  editingIndex = null;
  submitBtn.textContent = "Add Entry";
  cancelEditBtn.classList.add("hidden");
  rateInput.focus();
}

function addEntry(event) {
  event.preventDefault();

  const rate = Number(rateInput.value);
  const amount = Number(amountInput.value);
  const selectedTeam = document.querySelector('input[name="khai-team"]:checked').value;
  const betType = document.querySelector('input[name="bet-type"]:checked').value;

  if (!rate || !amount) {
    return;
  }

  const liability = (amount * rate) / 100;
  const entry = {
    type: betType,
    teamKey: selectedTeam,
    rate,
    amount,
    liability,
  };

  if (editingIndex !== null) {
    state.entries.splice(editingIndex, 1, entry);
  } else {
    state.entries.unshift(entry);
  }

  saveState();
  render();
  resetForm();
}

async function deleteEntry(index) {
  const confirmed = await showModal({
    title: "Delete Entry",
    message: "Are you sure you want to delete this entry?",
    type: "confirm"
  });
  if (confirmed) {
    state.entries.splice(index, 1);
    saveState();
    render();
    if (editingIndex === index) {
      resetForm();
    } else if (editingIndex !== null && index < editingIndex) {
      editingIndex--;
    }
  }
}

function editEntry(index) {
  const entry = state.entries[index];
  rateInput.value = entry.rate;
  amountInput.value = entry.amount;
  document.querySelector(`input[name="khai-team"][value="${entry.teamKey}"]`).checked = true;
  document.querySelector(`input[name="bet-type"][value="${entry.type}"]`).checked = true;

  editingIndex = index;
  submitBtn.textContent = "Update Entry";
  cancelEditBtn.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
  rateInput.focus();
}

function handleHistoryClick(event) {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.matches("[data-delete]")) {
    deleteEntry(Number(target.getAttribute("data-delete")));
  }
  if (target.matches("[data-edit]")) {
    editEntry(Number(target.getAttribute("data-edit")));
  }
}

async function handleCashout() {
  const totals = getTotals();
  
  if (Math.abs(totals["team-a"] - totals["team-b"]) < 0.01) {
    await showModal({ title: "Alert", message: "Book is already balanced!", type: "alert" });
    return;
  }

  const result = await showModal({
    title: "Cashout",
    message: "Select the team and enter its rate (%):",
    type: "prompt",
    teamPrompt: true
  });
  if (result === null) return;
  
  const { rateStr, teamKey } = result;
  const rate = Number(rateStr);
  if (!rate || rate <= 0) {
    await showModal({ title: "Error", message: "Valid rate is required to calculate Cashout.", type: "alert" });
    return;
  }
  
  const sel = teamKey;
  const opp = sel === "team-a" ? "team-b" : "team-a";
  const tSel = totals[sel];
  const tOpp = totals[opp];
  
  let type, A, L;
  if (tSel > tOpp) {
    type = "khai";
    A = (tSel - tOpp) / (1 + rate / 100);
    L = A * (rate / 100);
  } else {
    type = "lagaai";
    A = (tOpp - tSel) / (1 + rate / 100);
    L = A * (rate / 100);
  }
  
  A = Math.round(A * 100) / 100;
  L = Math.round(L * 100) / 100;

  state.entries.unshift({
    type,
    teamKey: sel,
    rate,
    amount: A,
    liability: L
  });
  
  saveState();
  render();
  resetForm();
}

async function handleLossCut() {
  const totals = getTotals();
  
  if (totals["team-a"] >= 0 && totals["team-b"] >= 0) {
    await showModal({ title: "Alert", message: "No loss to cut!", type: "alert" });
    return;
  }
  if (totals["team-a"] < 0 && totals["team-b"] < 0) {
    await showModal({ title: "Error", message: "Both sides have a loss! Cannot perform a single loss cut.", type: "alert" });
    return;
  }

  const result = await showModal({
    title: "Loss Cut",
    message: "Select the team and enter its rate (%):",
    type: "prompt",
    teamPrompt: true
  });
  if (result === null) return;
  
  const { rateStr, teamKey } = result;
  const rate = Number(rateStr);
  if (!rate || rate <= 0) {
    await showModal({ title: "Error", message: "Valid rate is required to calculate Loss Cut.", type: "alert" });
    return;
  }
  
  const sel = teamKey;
  const opp = sel === "team-a" ? "team-b" : "team-a";
  const tSel = totals[sel];
  const tOpp = totals[opp];
  
  let type, A, L;
  if (tSel < 0) {
    type = "lagaai";
    L = Math.abs(tSel);
    A = L / (rate / 100);
  } else if (tOpp < 0) {
    type = "khai";
    A = Math.abs(tOpp);
    L = A * (rate / 100);
  }
  
  A = Math.round(A * 100) / 100;
  L = Math.round(L * 100) / 100;

  state.entries.unshift({
    type,
    teamKey: sel,
    rate,
    amount: A,
    liability: L
  });
  
  saveState();
  render();
  resetForm();
}

cashoutBtn.addEventListener("click", handleCashout);
losscutBtn.addEventListener("click", handleLossCut);

form.addEventListener("submit", addEntry);

rateInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    amountInput.focus();
  }
});

amountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addEntry(event);
  }
});

cancelEditBtn.addEventListener("click", resetForm);

resetBookBtn.addEventListener("click", async () => {
  const confirmed = await showModal({
    title: "Reset Book",
    message: "Are you sure you want to reset the whole betting book? This cannot be undone.",
    type: "confirm"
  });
  if (!confirmed) return;
  state.entries = [];
  saveState();
  render();
});

historyList.addEventListener("click", handleHistoryClick);

teamANameInput.addEventListener("input", (event) => {
  state.teamA = event.target.value || "Team A";
  saveState();
  render();
});

teamBNameInput.addEventListener("input", (event) => {
  state.teamB = event.target.value || "Team B";
  saveState();
  render();
});

readState();
render();
resetForm();
