"use strict";

const ADMIN_PIN = "4911";
const DEFAULT_SUCCESS_RATE = 30;
const BALANCED_BLOCK_SIZE = 20;

const STORAGE = {
  entries: "apssV2Entries",
  rate: "apssV2SuccessRate",
  outcomeBag: "apssV2OutcomeBag",
  blockCompleted: "apssV2BlockCompleted"
};

const screens = {
  registration: document.getElementById("registrationScreen"),
  radio: document.getElementById("radioScreen"),
  processing: document.getElementById("processingScreen"),
  result: document.getElementById("resultScreen"),
  education: document.getElementById("educationScreen"),
  thankYou: document.getElementById("thankYouScreen")
};

const registrationForm = document.getElementById("registrationForm");
const openAdminButton = document.getElementById("openAdminButton");

const pttButton = document.getElementById("pttButton");
const radioState = document.getElementById("radioState");
const radioSubstate = document.getElementById("radioSubstate");
const waveform = document.getElementById("waveform");
const signalBars = document.getElementById("signalBars");

const processingHeadline = document.getElementById("processingHeadline");
const progressBar = document.getElementById("progressBar");
const stepCoverage = document.getElementById("stepCoverage");
const stepNetwork = document.getElementById("stepNetwork");
const stepConnection = document.getElementById("stepConnection");

const resultPanel = document.getElementById("resultPanel");
const resultMark = document.getElementById("resultMark");
const resultTitle = document.getElementById("resultTitle");
const resultText = document.getElementById("resultText");
const entryAward = document.getElementById("entryAward");
const continueButton = document.getElementById("continueButton");

const coverageInterest = document.getElementById("coverageInterest");
const completeButton = document.getElementById("completeButton");
const nextParticipantButton = document.getElementById("nextParticipantButton");
const countdownValue = document.getElementById("countdownValue");

const adminModal = document.getElementById("adminModal");
const closeAdminButton = document.getElementById("closeAdminButton");
const adminLogin = document.getElementById("adminLogin");
const adminDashboard = document.getElementById("adminDashboard");
const adminPin = document.getElementById("adminPin");
const adminLoginButton = document.getElementById("adminLoginButton");
const adminError = document.getElementById("adminError");

const participantMetric = document.getElementById("participantMetric");
const entryMetric = document.getElementById("entryMetric");
const successMetric = document.getElementById("successMetric");
const interestMetric = document.getElementById("interestMetric");
const rateSlider = document.getElementById("rateSlider");
const rateDisplay = document.getElementById("rateDisplay");
const balanceDescription = document.getElementById("balanceDescription");
const blockProgress = document.getElementById("blockProgress");
const saveRateButton = document.getElementById("saveRateButton");
const rateConfirmation = document.getElementById("rateConfirmation");
const exportButton = document.getElementById("exportButton");
const deleteDataButton = document.getElementById("deleteDataButton");
const actualRateLabel = document.getElementById("actualRateLabel");
const participantList = document.getElementById("participantList");

let currentParticipant = null;
let transmissionStarted = false;
let holdTimer = null;
let processingTimers = [];
let resetTimer = null;
let countdownTimer = null;


/* ---------------------------
   SCREEN CONTROL
---------------------------- */

function showScreen(name) {
  Object.values(screens).forEach((screen) => {
    screen.classList.remove("active");
  });

  screens[name].classList.add("active");
  window.scrollTo({ top: 0, behavior: "instant" });
}


/* ---------------------------
   AUDIO TONES
---------------------------- */

function playTone({
  frequency = 700,
  duration = 0.12,
  type = "sine",
  volume = 0.08,
  secondFrequency = null
} = {}) {
  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(
      frequency,
      context.currentTime
    );

    if (secondFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        secondFrequency,
        context.currentTime + duration
      );
    }

    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      context.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + duration);

    oscillator.addEventListener("ended", () => {
      context.close();
    });
  } catch (error) {
    console.warn("Audio tone unavailable:", error);
  }
}

function playPermitTone() {
  playTone({
    frequency: 880,
    secondFrequency: 1180,
    duration: 0.14,
    type: "square",
    volume: 0.045
  });
}

function playSuccessTone() {
  playTone({
    frequency: 680,
    secondFrequency: 1120,
    duration: 0.32,
    type: "sine",
    volume: 0.07
  });
}

function playFailureTone() {
  playTone({
    frequency: 260,
    secondFrequency: 150,
    duration: 0.38,
    type: "square",
    volume: 0.055
  });
}


/* ---------------------------
   STORAGE
---------------------------- */

function readEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.entries)) || [];
  } catch (error) {
    console.error("Could not read participant records:", error);
    return [];
  }
}

function writeEntries(entries) {
  localStorage.setItem(STORAGE.entries, JSON.stringify(entries));
}

function getSuccessRate() {
  const storedRate = Number(localStorage.getItem(STORAGE.rate));
  const validRates = [
    0, 5, 10, 15, 20,
    25, 30, 35, 40, 45, 50
  ];

  return validRates.includes(storedRate)
    ? storedRate
    : DEFAULT_SUCCESS_RATE;
}

function saveSuccessRate(rate) {
  localStorage.setItem(STORAGE.rate, String(rate));
}

function getBlockCompleted() {
  const value = Number(
    localStorage.getItem(STORAGE.blockCompleted)
  );

  return Number.isInteger(value) &&
    value >= 0 &&
    value < BALANCED_BLOCK_SIZE
      ? value
      : 0;
}

function setBlockCompleted(value) {
  localStorage.setItem(
    STORAGE.blockCompleted,
    String(value)
  );
}

function resetBalancedBlock() {
  localStorage.removeItem(STORAGE.outcomeBag);
  setBlockCompleted(0);
}


/* ---------------------------
   BALANCED OUTCOMES
---------------------------- */

function successCountForRate(rate) {
  return Math.round(
    BALANCED_BLOCK_SIZE * (rate / 100)
  );
}

function createOutcomeBag() {
  const rate = getSuccessRate();
  const successes = successCountForRate(rate);
  const failures = BALANCED_BLOCK_SIZE - successes;

  const bag = [
    ...Array(successes).fill(true),
    ...Array(failures).fill(false)
  ];

  for (let index = bag.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1)
    );

    [bag[index], bag[randomIndex]] = [
      bag[randomIndex],
      bag[index]
    ];
  }

  localStorage.setItem(
    STORAGE.outcomeBag,
    JSON.stringify(bag)
  );

  setBlockCompleted(0);
  return bag;
}

function getNextOutcome() {
  let bag;

  try {
    bag =
      JSON.parse(localStorage.getItem(STORAGE.outcomeBag)) ||
      [];
  } catch (error) {
    bag = [];
  }

  if (!Array.isArray(bag) || bag.length === 0) {
    bag = createOutcomeBag();
  }

  const result = Boolean(bag.shift());

  localStorage.setItem(
    STORAGE.outcomeBag,
    JSON.stringify(bag)
  );

  const completed = getBlockCompleted() + 1;

  setBlockCompleted(
    completed >= BALANCED_BLOCK_SIZE
      ? 0
      : completed
  );

  return result;
}


/* ---------------------------
   REGISTRATION
---------------------------- */

registrationForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const form = new FormData(registrationForm);

  currentParticipant = {
    id:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`,
    name: String(form.get("name") || "").trim(),
    organization: String(
      form.get("organization") || ""
    ).trim(),
    email: String(form.get("email") || "").trim(),
    phone: String(form.get("phone") || "").trim(),
    contactConsent: Boolean(form.get("contactConsent")),
    coverageInterest: false,
    connected: null,
    entries: 1,
    configuredSuccessRate: getSuccessRate(),
    createdAt: new Date().toISOString()
  };

  prepareRadioScreen();
  showScreen("radio");
});


/* ---------------------------
   RADIO INTERACTION
---------------------------- */

function prepareRadioScreen() {
  transmissionStarted = false;
  radioState.textContent = "READY";
  radioSubstate.textContent =
    "PRESS AND HOLD TO TRANSMIT";
  waveform.classList.remove("active");
  signalBars.classList.remove("weak", "lost");
  pttButton.classList.remove("pressed");
}

function beginHold(event) {
  event.preventDefault();

  if (transmissionStarted) {
    return;
  }

  pttButton.classList.add("pressed");
  waveform.classList.add("active");
  radioState.textContent = "TRANSMITTING";
  radioSubstate.textContent =
    "EMERGENCY MESSAGE ACTIVE";

  holdTimer = window.setTimeout(() => {
    startTransmission();
  }, 1200);
}

function cancelHold() {
  if (transmissionStarted) {
    return;
  }

  window.clearTimeout(holdTimer);
  pttButton.classList.remove("pressed");
  waveform.classList.remove("active");
  radioState.textContent = "READY";
  radioSubstate.textContent =
    "PRESS AND HOLD TO TRANSMIT";
}

pttButton.addEventListener("pointerdown", beginHold);
pttButton.addEventListener("pointerup", cancelHold);
pttButton.addEventListener("pointercancel", cancelHold);
pttButton.addEventListener("pointerleave", cancelHold);

function startTransmission() {
  if (!currentParticipant || transmissionStarted) {
    return;
  }

  transmissionStarted = true;
  window.clearTimeout(holdTimer);

  pttButton.classList.remove("pressed");
  waveform.classList.remove("active");
  radioState.textContent = "TRANSMITTED";
  radioSubstate.textContent =
    "SEARCHING FOR RESPONSE PATH";

  playPermitTone();

  showScreen("processing");
  runProcessingSequence();
}


/* ---------------------------
   PROCESSING
---------------------------- */

function clearProcessingTimers() {
  processingTimers.forEach((timer) => {
    window.clearTimeout(timer);
  });

  processingTimers = [];
}

function resetProcessingUI() {
  processingHeadline.textContent =
    "Searching for in-building coverage…";

  [stepCoverage, stepNetwork, stepConnection].forEach(
    (step) => step.classList.remove("active")
  );

  progressBar.style.transition = "none";
  progressBar.style.width = "0%";

  requestAnimationFrame(() => {
    progressBar.style.transition = "width 4.2s linear";
  });
}

function runProcessingSequence() {
  clearProcessingTimers();
  resetProcessingUI();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      progressBar.style.width = "100%";
    });
  });

  processingTimers.push(
    window.setTimeout(() => {
      stepCoverage.classList.add("active");
      processingHeadline.textContent =
        "Checking radio coverage inside the building…";
    }, 800)
  );

  processingTimers.push(
    window.setTimeout(() => {
      stepNetwork.classList.add("active");
      processingHeadline.textContent =
        "Locating the local public-safety radio network…";
    }, 1900)
  );

  processingTimers.push(
    window.setTimeout(() => {
      stepConnection.classList.add("active");
      processingHeadline.textContent =
        "Attempting to reach responding officers…";
    }, 3100)
  );

  processingTimers.push(
    window.setTimeout(() => {
      completeTransmission();
    }, 4400)
  );
}


/* ---------------------------
   RESULT
---------------------------- */

function completeTransmission() {
  const connected = getNextOutcome();

  currentParticipant.connected = connected;
  currentParticipant.entries = connected ? 2 : 1;

  resultPanel.classList.remove("success", "failure");

  if (connected) {
    resultPanel.classList.add("success");
    resultMark.textContent = "✓";
    resultTitle.textContent =
      "Connected with First Responders";
    resultText.textContent =
      "Your emergency communication successfully reached local first responders.";
    entryAward.textContent =
      "Bonus drawing entry awarded — 2 total entries.";
    playSuccessTone();
  } else {
    resultPanel.classList.add("failure");
    resultMark.textContent = "!";
    resultTitle.textContent = "Communication Failed";
    resultText.textContent =
      "Your emergency communication could not reach local first responders.";
    entryAward.textContent =
      "Your original drawing entry has been recorded.";
    playFailureTone();
  }

  showScreen("result");
}

continueButton.addEventListener("click", () => {
  coverageInterest.checked = false;
  showScreen("education");
});


/* ---------------------------
   INTEREST + SAVE
---------------------------- */

completeButton.addEventListener("click", () => {
  if (!currentParticipant) {
    resetExperience();
    return;
  }

  currentParticipant.coverageInterest =
    coverageInterest.checked;

  const entries = readEntries();
  entries.push(currentParticipant);
  writeEntries(entries);

  showThankYou();
});


/* ---------------------------
   RESET
---------------------------- */

function showThankYou() {
  showScreen("thankYou");

  let seconds = 8;
  countdownValue.textContent = String(seconds);

  window.clearInterval(countdownTimer);
  window.clearTimeout(resetTimer);

  countdownTimer = window.setInterval(() => {
    seconds -= 1;
    countdownValue.textContent = String(
      Math.max(seconds, 0)
    );
  }, 1000);

  resetTimer = window.setTimeout(() => {
    resetExperience();
  }, 8000);
}

nextParticipantButton.addEventListener(
  "click",
  resetExperience
);

function resetExperience() {
  window.clearTimeout(holdTimer);
  window.clearTimeout(resetTimer);
  window.clearInterval(countdownTimer);
  clearProcessingTimers();

  currentParticipant = null;
  transmissionStarted = false;

  registrationForm.reset();
  coverageInterest.checked = false;
  prepareRadioScreen();
  resetProcessingUI();

  showScreen("registration");

  window.setTimeout(() => {
    document.getElementById("name").focus();
  }, 150);
}


/* ---------------------------
   ADMIN LOGIN
---------------------------- */

openAdminButton.addEventListener("click", () => {
  adminModal.hidden = false;
  adminLogin.hidden = false;
  adminDashboard.hidden = true;
  adminPin.value = "";
  adminError.textContent = "";
  rateConfirmation.textContent = "";

  window.setTimeout(() => {
    adminPin.focus();
  }, 100);
});

closeAdminButton.addEventListener("click", () => {
  adminModal.hidden = true;
  adminPin.value = "";
  adminError.textContent = "";
  rateConfirmation.textContent = "";
});

adminLoginButton.addEventListener(
  "click",
  attemptAdminLogin
);

adminPin.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    attemptAdminLogin();
  }
});

function attemptAdminLogin() {
  if (adminPin.value !== ADMIN_PIN) {
    adminError.textContent = "Incorrect staff PIN.";
    return;
  }

  adminLogin.hidden = true;
  adminDashboard.hidden = false;
  adminError.textContent = "";
  refreshDashboard();
}


/* ---------------------------
   ADMIN DASHBOARD
---------------------------- */

function refreshDashboard() {
  const entries = readEntries();
  const successful = entries.filter(
    (entry) => entry.connected === true
  );
  const interested = entries.filter(
    (entry) => entry.coverageInterest === true
  );
  const drawingEntries = entries.reduce(
    (total, entry) =>
      total + Number(entry.entries || 1),
    0
  );

  participantMetric.textContent = String(entries.length);
  entryMetric.textContent = String(drawingEntries);
  successMetric.textContent = String(successful.length);
  interestMetric.textContent = String(interested.length);

  const actualRate =
    entries.length > 0
      ? Math.round(
          (successful.length / entries.length) * 100
        )
      : 0;

  actualRateLabel.textContent =
    `Actual connection rate: ${actualRate}%`;

  updateRateControls(getSuccessRate());
  renderParticipantList(entries);
}

function updateRateControls(rate) {
  const successCount = successCountForRate(rate);

  rateSlider.value = String(rate);
  rateDisplay.textContent = `${rate}%`;

  balanceDescription.textContent =
    `At ${rate}%, exactly ${successCount} ` +
    `${successCount === 1 ? "successful connection is" : "successful connections are"} ` +
    `distributed randomly within each block of ${BALANCED_BLOCK_SIZE} participants.`;

  blockProgress.textContent =
    `Current block: ${getBlockCompleted()} of ` +
    `${BALANCED_BLOCK_SIZE} completed`;
}

function renderParticipantList(entries) {
  participantList.innerHTML = "";

  if (entries.length === 0) {
    participantList.innerHTML =
      "<p>No participants have been recorded.</p>";
    return;
  }

  [...entries]
    .reverse()
    .slice(0, 75)
    .forEach((entry) => {
      const row = document.createElement("div");
      row.className = "participant-row";

      const timestamp =
        new Date(entry.createdAt).toLocaleString();

      row.innerHTML = `
        <div>
          <strong>${escapeHTML(entry.name)}</strong>
          <span>${escapeHTML(entry.organization || "No organization")}</span>
          <span>${escapeHTML(entry.email)}</span>
          <span>${timestamp}</span>
        </div>
        <div class="participant-tags">
          <span class="participant-tag">
            ${Number(entry.entries || 1)} ${
              Number(entry.entries || 1) === 1
                ? "entry"
                : "entries"
            }
          </span>
          ${
            entry.connected
              ? '<span class="participant-tag bonus">Connected</span>'
              : '<span class="participant-tag">Not connected</span>'
          }
          ${
            entry.coverageInterest
              ? '<span class="participant-tag interested">Testing interest</span>'
              : ""
          }
        </div>
      `;

      participantList.appendChild(row);
    });
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


/* ---------------------------
   RATE SLIDER
---------------------------- */

rateSlider.addEventListener("input", () => {
  const rate = Number(rateSlider.value);
  const successCount = successCountForRate(rate);

  rateDisplay.textContent = `${rate}%`;

  balanceDescription.textContent =
    `At ${rate}%, exactly ${successCount} ` +
    `${successCount === 1 ? "successful connection is" : "successful connections are"} ` +
    `distributed randomly within each block of ${BALANCED_BLOCK_SIZE} participants.`;

  rateConfirmation.textContent = "";
});

saveRateButton.addEventListener("click", () => {
  const selectedRate = Number(rateSlider.value);
  const currentRate = getSuccessRate();
  const completed = getBlockCompleted();

  if (
    selectedRate === currentRate &&
    completed === 0
  ) {
    rateConfirmation.textContent =
      `The percentage is already set to ${selectedRate}%.`;
    return;
  }

  let message =
    `Set successful connections to ${selectedRate}%?`;

  if (completed > 0) {
    message +=
      " This resets the unfinished balanced block but does not delete participant records.";
  }

  if (!window.confirm(message)) {
    updateRateControls(currentRate);
    return;
  }

  saveSuccessRate(selectedRate);
  resetBalancedBlock();
  updateRateControls(selectedRate);

  rateConfirmation.textContent =
    `Saved at ${selectedRate}%. A new balanced block begins with the next participant.`;
});


/* ---------------------------
   CSV EXPORT
---------------------------- */

exportButton.addEventListener("click", exportCSV);

function exportCSV() {
  const entries = readEntries();

  if (entries.length === 0) {
    window.alert("There are no participant records to export.");
    return;
  }

  const header = [
    "Name",
    "School District or Organization",
    "Email",
    "Phone",
    "General Contact Consent",
    "Interested in In-Building Coverage Testing",
    "Connected with First Responders",
    "Drawing Entries",
    "Configured Success Rate",
    "Date and Time"
  ];

  const rows = entries.map((entry) => [
    entry.name,
    entry.organization,
    entry.email,
    entry.phone,
    entry.contactConsent ? "Yes" : "No",
    entry.coverageInterest ? "Yes" : "No",
    entry.connected ? "Yes" : "No",
    entry.entries,
    `${entry.configuredSuccessRate ?? DEFAULT_SUCCESS_RATE}%`,
    entry.createdAt
  ]);

  const csv =
    "\uFEFF" +
    [header, ...rows]
      .map((row) =>
        row.map(csvCell).join(",")
      )
      .join("\r\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    `apss-first-responder-challenge-` +
    `${new Date().toISOString().slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}


/* ---------------------------
   DELETE DATA
---------------------------- */

deleteDataButton.addEventListener("click", () => {
  const confirmed = window.confirm(
    "This permanently deletes every participant and drawing entry stored in this browser. Continue?"
  );

  if (!confirmed) {
    return;
  }

  const typed = window.prompt(
    'Type DELETE to confirm.'
  );

  if (typed !== "DELETE") {
    window.alert("Event data was not deleted.");
    return;
  }

  localStorage.removeItem(STORAGE.entries);
  resetBalancedBlock();
  refreshDashboard();

  window.alert(
    "All participant records have been deleted. The selected percentage was retained."
  );
});


/* ---------------------------
   SERVICE WORKER
---------------------------- */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((error) => {
        console.error(
          "Service worker registration failed:",
          error
        );
      });
  });
}


/* ---------------------------
   INITIALIZE
---------------------------- */

function initialize() {
  if (localStorage.getItem(STORAGE.rate) === null) {
    saveSuccessRate(DEFAULT_SUCCESS_RATE);
  }

  updateRateControls(getSuccessRate());
  resetProcessingUI();
}

initialize();
