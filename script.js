const stepOrder = ["tang", "song", "review"];
const progressText = document.getElementById("progress-text");
const progressFill = document.getElementById("progress-fill");
const navButtons = document.querySelectorAll(".nav-step");
const lessonPanels = document.querySelectorAll(".lesson-panel");
const nextButtons = document.querySelectorAll(".next-step");
const contentNextButtons = document.querySelectorAll(".content-next-button");
const pageButtons = document.querySelectorAll(".page-link");
const dynastyPages = document.querySelectorAll(".dynasty-page");

/* ── Sidebar collapse ─────────────────────────────────────────────── */
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebar-toggle");

function setSidebarCollapsed(collapsed) {
  if (!sidebar) return;
  sidebar.classList.toggle("collapsed", collapsed);
  if (sidebarToggle) {
    sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
    sidebarToggle.setAttribute("aria-label", collapsed ? "展開側邊欄" : "收合側邊欄");
  }
  try {
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  } catch (error) {
    /* localStorage unavailable — collapse state just won't persist */
  }
}

if (sidebarToggle) {
  sidebarToggle.addEventListener("click", () => {
    setSidebarCollapsed(!sidebar.classList.contains("collapsed"));
  });
}

let storedSidebarCollapsed = false;
try {
  storedSidebarCollapsed = localStorage.getItem("sidebar-collapsed") === "1";
} catch (error) {
  /* localStorage unavailable — default to expanded */
}
setSidebarCollapsed(storedSidebarCollapsed);

/* ── Deep links ────────────────────────────────────────────────────
   Every page gets its own URL (#tang/utensils, #song/process, #review, …)
   so it can be opened directly, bookmarked, or shared — and back/forward
   moves between the pages you've actually visited. */
const VALID_SUBPAGES = ["reading", "utensils", "process"];

function setRouteHash(dynasty, page) {
  const hash = dynasty === "review" ? "#review" : `#${dynasty}/${page}`;
  if (window.location.hash !== hash) {
    history.pushState(null, "", hash);
  }
}

function applyRouteFromHash({ pushHistory = false } = {}) {
  const raw = window.location.hash.replace(/^#/, "");
  const [dynasty, page] = raw.split("/");

  if (dynasty === "review") {
    activatePanel("review", { updateUrl: pushHistory });
    return;
  }

  if (dynasty === "tang" || dynasty === "song") {
    activatePanel(dynasty, { updateUrl: pushHistory });
    if (page && page !== "reading" && VALID_SUBPAGES.includes(page)) {
      const targetButton = document.querySelector(`.page-link[data-dynasty="${dynasty}"][data-page="${page}"]`);
      if (targetButton) targetButton.click();
    }
    return;
  }

  activatePanel("tang", { updateUrl: pushHistory });
}

window.addEventListener("popstate", () => applyRouteFromHash());

const progress = {
  tang: true,
  song: false,
  review: false,
};

function updateProgress() {
  const completedCount = Object.values(progress).filter(Boolean).length;
  const percent = Math.round((completedCount / stepOrder.length) * 100);
  if (progressText) progressText.textContent = `${percent}%`;
  if (progressFill) progressFill.style.width = `${percent}%`;

  navButtons.forEach((button) => {
    const step = button.dataset.target;
    button.classList.toggle("is-complete", !!progress[step]);
  });
}

// Tracks pages actually stepped through via "下一頁", per dynasty. Jumping
// straight to a step by clicking the timeline never adds to this — only
// progressing forward with the next-page button does — so the checkmark
// only ever reflects real completion, not just "earlier in the list".
const completedPages = { tang: new Set(), song: new Set() };

function syncTimelineStates(targetDynasty = null, currentPage = null) {
  pageButtons.forEach((button) => {
    const { dynasty, page } = button.dataset;
    const isSameDynasty = !targetDynasty || dynasty === targetDynasty;

    const isCurrent = isSameDynasty && currentPage && page === currentPage;
    const isComplete = isSameDynasty && !isCurrent && completedPages[dynasty]?.has(page);

    button.classList.toggle("active", isCurrent);
    button.classList.toggle("is-complete", !!isComplete);
  });
}

const nextButtonLabels = {
  tang: { reading: "下一頁", utensils: "下一頁", process: "前往宋代" },
  song: { reading: "下一頁", utensils: "下一頁", process: "下一頁" },
};

function updateNextButtonLabel(dynasty, page) {
  const button = document.querySelector(`.content-next-button[data-dynasty="${dynasty}"]`);
  const label = button ? button.querySelector(".content-next-label") : null;
  const map = nextButtonLabels[dynasty];
  if (label && map && map[page]) {
    label.textContent = map[page];
  }
}

function activatePanel(target, { updateUrl = true } = {}) {
  lessonPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `${target}-panel`);
  });

  navButtons.forEach((button) => {
    const isActive = button.dataset.target === target;
    button.classList.toggle("active", isActive);
  });

  const firstPage = target === "tang" ? "reading" : target === "song" ? "reading" : "review";
  const activePage = document.querySelector(`.dynasty-page[data-dynasty="${target}"][data-page="${firstPage}"]`);
  if (activePage) {
    dynastyPages.forEach((page) => page.classList.remove("active"));
    activePage.classList.add("active");
  }

  if (target === "tang" || target === "song") {
    syncTimelineStates(target, firstPage);
    updateNextButtonLabel(target, firstPage);
  }

  if (updateUrl) setRouteHash(target, firstPage);
}

pageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const { dynasty, page } = button.dataset;
    dynastyPages.forEach((item) => {
      const match = item.dataset.dynasty === dynasty && item.dataset.page === page;
      item.classList.toggle("active", match);
    });

    syncTimelineStates(dynasty, page);
    updateNextButtonLabel(dynasty, page);
    setRouteHash(dynasty, page);
  });
});

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.target;
    activatePanel(target);
  });
});

nextButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const next = button.dataset.next;
    if (next === "song") progress.tang = true;
    if (next === "review") {
      progress.song = true;
      progress.review = true;
    }
    updateProgress();
    activatePanel(next);
  });
});

contentNextButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const dynasty = button.dataset.dynasty;
    const pages = ["reading", "utensils", "process"];
    const active = document.querySelector(`.dynasty-page.active[data-dynasty="${dynasty}"]`);
    const currentPage = active ? active.dataset.page : "reading";
    const currentIndex = pages.indexOf(currentPage);

    if (currentIndex < pages.length - 1) {
      const nextPage = pages[currentIndex + 1];
      completedPages[dynasty]?.add(currentPage);
      const targetButton = document.querySelector(`.page-link[data-dynasty="${dynasty}"][data-page="${nextPage}"]`);
      if (targetButton) {
        targetButton.click();
      }
      return;
    }

    if (dynasty === "tang") {
      progress.tang = true;
      updateProgress();
      activatePanel("song");
    }

    if (dynasty === "song") {
      progress.song = true;
      progress.review = true;
      updateProgress();
      activatePanel("review");
    }
  });
});

function shuffleCards(pool) {
  const cards = Array.from(pool.querySelectorAll(".utensil-card"));
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  cards.forEach((card) => pool.appendChild(card));
}

function setupUtensilMatching(panelRoot) {
  const pool = panelRoot.querySelector(".game-pool");
  const slots = panelRoot.querySelectorAll(".drop-slot");
  const cards = pool ? pool.querySelectorAll(".utensil-card") : [];

  if (pool && cards.length > 1) {
    shuffleCards(pool);
  }

  cards.forEach((card) => {
    card.addEventListener("dragstart", () => {
      card.classList.add("dragging");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("dragging");
    });
  });

  slots.forEach((slot) => {
    slot.addEventListener("dragover", (event) => {
      event.preventDefault();
      slot.classList.add("drag-over");
    });

    slot.addEventListener("dragleave", () => {
      slot.classList.remove("drag-over");
    });

    slot.addEventListener("drop", (event) => {
      event.preventDefault();
      slot.classList.remove("drag-over");
      const dragged = panelRoot.querySelector(".utensil-card.dragging");
      if (!dragged) return;
      const match = slot.dataset.match;
      const cardName = dragged.dataset.name;

      if (match === cardName) {
        slot.classList.add("correct");
        dragged.style.opacity = "0.4";
        dragged.draggable = false;
        dragged.setAttribute("aria-disabled", "true");
      } else {
        slot.classList.add("wrong");
        slot.animate(
          [
            { transform: "translateX(0)" },
            { transform: "translateX(-6px)" },
            { transform: "translateX(6px)" },
            { transform: "translateX(-6px)" },
            { transform: "translateX(6px)" },
            { transform: "translateX(0)" }
          ],
          { duration: 260, easing: "ease-in-out" }
        );
        setTimeout(() => slot.classList.remove("wrong"), 260);
      }
    });
  });
}

const tangPanel = document.getElementById("tang-panel");
const songPanel = document.getElementById("song-panel");

if (tangPanel) setupUtensilMatching(tangPanel);
if (songPanel) setupUtensilMatching(songPanel);

function setupTeaProcess(panelRoot) {
  const panelPrefix = panelRoot.id.replace("-panel", "");
  const teaLeaf = document.getElementById(`${panelPrefix}-leaf`);
  const kettle = document.getElementById(`${panelPrefix}-kettle`);
  const brazier = document.getElementById(`${panelPrefix}-brazier`);
  const whisk = document.getElementById(`${panelPrefix}-whisk`);
  const bowl = document.getElementById(`${panelPrefix}-bowl`);
  const taskBlocks = panelRoot.querySelectorAll(".process-task");

  if (!teaLeaf || !kettle || !brazier || !whisk || !bowl) return;

  const completeTask = (step) => {
    taskBlocks.forEach((task) => {
      const activeStep = Number(task.dataset.step);
      if (activeStep === step) {
        task.classList.add("complete");
      }
    });
  };

  teaLeaf.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/plain", "tea");
    teaLeaf.classList.add("dragging");
  });

  teaLeaf.addEventListener("dragend", () => {
    teaLeaf.classList.remove("dragging");
  });

  kettle.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  kettle.addEventListener("drop", (event) => {
    event.preventDefault();
    teaLeaf.style.left = "58%";
    teaLeaf.style.top = "58%";
    teaLeaf.style.opacity = "0.15";
    completeTask(1);
  });

  brazier.addEventListener("click", () => {
    brazier.classList.toggle("active");
    kettle.classList.toggle("hot");
    if (brazier.classList.contains("active")) {
      completeTask(2);
    }
  });

  whisk.addEventListener("mousedown", () => {
    whisk.classList.add("churning");
    completeTask(3);
  });

  whisk.addEventListener("mouseup", () => {
    whisk.classList.remove("churning");
  });

  whisk.addEventListener("mouseleave", () => {
    whisk.classList.remove("churning");
  });

  bowl.addEventListener("mousemove", (event) => {
    if (!brazier.classList.contains("active") || !whisk.classList.contains("churning")) return;
    const rect = bowl.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x > 0 && y > 0 && x < rect.width && y < rect.height) {
      bowl.classList.add("foamy");
      completeTask(4);
    }
  });

  bowl.addEventListener("mouseenter", () => {
    if (brazier.classList.contains("active") && whisk.classList.contains("churning")) {
      bowl.classList.add("foamy");
      completeTask(4);
    }
  });
}

if (tangPanel) setupTeaProcess(tangPanel);
// Song's 泡茶流程 page uses the dedicated 點茶 simulation (setupDianCha) below
// instead of the drag/click workbench tang uses.

/* ── 宋代點茶模擬 ──────────────────────────────────────────────────── */
function setupDianCha() {
  const scene = document.getElementById("dcScene");
  const sceneWrap = document.getElementById("dcSceneWrap");
  const statusEl = document.getElementById("dcStatus");
  const actionsEl = document.getElementById("dcActions");
  const summaryEl = document.getElementById("dcSummary");
  const restartBtn = document.getElementById("dcRestart");
  const foamGroup = document.getElementById("dcFoamGroup");

  if (!scene || !sceneWrap || !statusEl || !actionsEl || !summaryEl || !restartBtn || !foamGroup) return;

  const SUCCESS_MSG = {
    1: "團茶碾成了茶末。",
    2: "篩出了細緻的茶粉。",
    3: "茶碗溫熱了。",
    4: "茶粉調成了均勻的茶膏。",
    5: "泡沫開始出現。",
    6: "泡沫越來越多。",
    7: "泡沫綿密潔白，完成了！",
  };

  const DONE_AT_STEP = { grind: 1, sift: 2, warm: 3, paste: 4 };

  const state = { step: 0, failed: false };

  // Deterministic pseudo-random bubble field, generated once on load.
  function seededRandom(seed) {
    let t = seed + 0x6d2b79f5;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildFoam() {
    const rand = seededRandom(88);
    const cx = 220, cy = 118, rx = 122, ry = 19;
    const count = 34;
    for (let i = 0; i < count; i++) {
      const angle = rand() * Math.PI * 2;
      const radiusFactor = Math.sqrt(rand()) * 0.94;
      const x = cx + Math.cos(angle) * rx * radiusFactor;
      const y = cy + Math.sin(angle) * ry * radiusFactor;
      const r = 3.4 + rand() * 3.6;
      const stage = i < 11 ? "1" : i < 23 ? "2" : "3";
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("class", "dc-bubble");
      c.setAttribute("data-stage", stage);
      c.setAttribute("cx", x.toFixed(1));
      c.setAttribute("cy", y.toFixed(1));
      c.setAttribute("r", r.toFixed(1));
      c.setAttribute("fill", "#F8F3E5");
      c.setAttribute("opacity", (0.85 + rand() * 0.15).toFixed(2));
      foamGroup.appendChild(c);
    }
  }
  buildFoam();

  function setDone(action) {
    const btn = actionsEl.querySelector(`[data-action="${action}"]`);
    if (btn) btn.classList.add("is-done");
  }

  function clearDone() {
    actionsEl.querySelectorAll(".dc-action-btn").forEach((btn) => btn.classList.remove("is-done"));
  }

  function shakeScene() {
    sceneWrap.classList.remove("is-shaking");
    void sceneWrap.offsetWidth;
    sceneWrap.classList.add("is-shaking");
  }

  function render() {
    scene.setAttribute("data-step", String(state.step));

    Object.keys(DONE_AT_STEP).forEach((key) => {
      if (state.step >= DONE_AT_STEP[key]) setDone(key);
    });
    if (state.step >= 7) setDone("whisk");

    actionsEl.querySelectorAll(".dc-action-btn").forEach((btn) => {
      btn.disabled = state.failed || state.step >= 7;
    });

    summaryEl.hidden = state.step < 7;
    restartBtn.classList.toggle("is-alert", state.failed);
  }

  function showStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("is-error", !!isError);
  }

  function succeed(nextStep) {
    state.step = nextStep;
    showStatus(SUCCESS_MSG[nextStep], false);
    render();
  }

  function fail(msg) {
    showStatus(msg, true);
    shakeScene();
  }

  function hardFail() {
    state.failed = true;
    showStatus("水一次加太多，打不出泡沫了！宋人會分次注水。請按右上角「重新開始」再試一次。", true);
    shakeScene();
    render();
  }

  function handleAction(action) {
    if (state.failed || state.step >= 7) return;
    const step = state.step;

    if (action === "dump") { hardFail(); return; }

    if (action === "grind") {
      if (step === 0) succeed(1);
      return;
    }
    if (action === "sift") {
      if (step === 1) succeed(2);
      else if (step === 0) fail("還沒有茶末可以篩喔。");
      return;
    }
    if (action === "warm") {
      if (step === 2) succeed(3);
      else if (step < 2) fail("茶粉還不夠細，先篩一篩吧。");
      return;
    }
    if (action === "paste") {
      if (step === 3) succeed(4);
      else if (step === 2) fail("碗還是冷的，茶膏調不勻。");
      else if (step < 2) fail("茶粉還不夠細，先篩一篩吧。");
      return;
    }
    if (action === "whisk") {
      if (step >= 4 && step < 7) succeed(step + 1);
      else if (step < 4) fail("直接加水，茶粉會結塊。先調成茶膏吧。");
      return;
    }
  }

  function resetAll() {
    state.step = 0;
    state.failed = false;
    clearDone();
    showStatus("", false);
    render();
  }

  actionsEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".dc-action-btn");
    if (!btn) return;
    handleAction(btn.dataset.action);
  });

  restartBtn.addEventListener("click", resetAll);

  render();
}

setupDianCha();

if (window.location.hash) {
  applyRouteFromHash();
} else {
  const activePanelName = document.querySelector(".lesson-panel.active")?.id.replace("-panel", "") || "tang";
  activatePanel(activePanelName, { updateUrl: false });
}
updateProgress();
