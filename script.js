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
  tang: false,
  song: false,
  review: false,
};

// Tracks pages actually stepped through via "下一頁", per dynasty. Jumping
// straight to a step by clicking the timeline never adds to this — only
// progressing forward with the next-page button does — so the checkmark
// only ever reflects real completion, not just "earlier in the list".
const completedPages = { tang: new Set(), song: new Set() };

// Each of tang's and song's 3 pages is worth 15% (6 × 15% = 90%); the
// review page is worth the final 10%, reached once both dynasties are done.
const PAGE_PROGRESS_WEIGHT = 15;
const REVIEW_PROGRESS_WEIGHT = 10;

function updateProgress() {
  const percent = Math.min(
    100,
    (completedPages.tang.size + completedPages.song.size) * PAGE_PROGRESS_WEIGHT +
      (progress.review ? REVIEW_PROGRESS_WEIGHT : 0)
  );
  if (progressText) progressText.textContent = `${percent}%`;
  if (progressFill) progressFill.style.width = `${percent}%`;

  navButtons.forEach((button) => {
    const step = button.dataset.target;
    button.classList.toggle("is-complete", !!progress[step]);
  });
}

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
      updateProgress();
      const targetButton = document.querySelector(`.page-link[data-dynasty="${dynasty}"][data-page="${nextPage}"]`);
      if (targetButton) {
        targetButton.click();
      }
      return;
    }

    if (dynasty === "tang") {
      completedPages.tang?.add(currentPage);
      progress.tang = true;
      updateProgress();
      activatePanel("song");
    }

    if (dynasty === "song") {
      completedPages.song?.add(currentPage);
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

// Both tang's 煎茶 and song's 點茶 process pages use their own dedicated
// simulations (setupJianCha / setupDianCha below) instead of a shared
// drag/click workbench.

// Shared by both simulations: lets the learner drag (or click, which is
// treated as an instant drag-and-drop) a step button into the next empty
// slot. A wrong drop never moves the button — it just stays put, which is
// the "bounces back to its original position" behavior — and the caller's
// shake feedback still fires as normal.
function wireSlotsAndDragDrop(actionsEl, slotsEl) {
  const slotEls = Array.from(slotsEl.querySelectorAll(".dc-slot"));

  function fillSlot(index, label) {
    const slot = slotEls[index];
    if (!slot) return;
    slot.textContent = label;
    slot.classList.add("filled");
  }

  function highlightNext(step) {
    slotEls.forEach((slot, i) => slot.classList.toggle("is-next", i === step));
  }

  function resetSlots() {
    slotEls.forEach((slot, i) => {
      slot.textContent = String(i + 1);
      slot.classList.remove("filled", "is-next");
    });
  }

  actionsEl.addEventListener("dragstart", (event) => {
    const btn = event.target.closest(".dc-action-btn");
    if (!btn || btn.disabled) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", btn.dataset.action);
    event.dataTransfer.effectAllowed = "move";
    btn.classList.add("dragging");
  });

  actionsEl.addEventListener("dragend", (event) => {
    const btn = event.target.closest(".dc-action-btn");
    if (btn) btn.classList.remove("dragging");
  });

  slotsEl.addEventListener("dragover", (event) => {
    event.preventDefault();
    slotsEl.classList.add("is-drag-over");
  });

  slotsEl.addEventListener("dragleave", () => {
    slotsEl.classList.remove("is-drag-over");
  });

  slotsEl.addEventListener("drop", (event) => {
    event.preventDefault();
    slotsEl.classList.remove("is-drag-over");
    const action = event.dataTransfer.getData("text/plain");
    if (action) actionsEl.dispatchEvent(new CustomEvent("dc-drop-action", { detail: action }));
  });

  return { fillSlot, highlightNext, resetSlots };
}

/* ── 宋代點茶模擬 ──────────────────────────────────────────────────── */
function setupDianCha() {
  const scene = document.getElementById("dcScene");
  const sceneWrap = document.getElementById("dcSceneWrap");
  const statusEl = document.getElementById("dcStatus");
  const actionsEl = document.getElementById("dcActions");
  const slotsEl = document.getElementById("dcSlots");
  const summaryEl = document.getElementById("dcSummary");
  const restartBtn = document.getElementById("dcRestart");
  const foamGroup = document.getElementById("dcFoamGroup");

  if (!scene || !sceneWrap || !statusEl || !actionsEl || !slotsEl || !summaryEl || !restartBtn || !foamGroup) return;

  const { fillSlot, highlightNext, resetSlots } = wireSlotsAndDragDrop(actionsEl, slotsEl);

  const START_MSG = "先從第一步開始吧！";

  const SUCCESS_MSG = {
    1: "團茶碾成了茶末。",
    2: "篩出了細緻的茶粉。",
    3: "茶碗溫熱了。",
    4: "茶粉調成了均勻的茶膏。",
    5: "泡沫開始出現了，再注水攪打一次。",
    6: "泡沫越來越多，再攪打一次就完成了！",
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
    const cx = 220, cy = 111, rx = 112, ry = 15;
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

    // Whisk button glows once whisking has begun, to nudge the learner to
    // keep clicking — stops the moment it's actually done (checkmark takes over).
    const whiskBtn = actionsEl.querySelector('[data-action="whisk"]');
    if (whiskBtn) {
      whiskBtn.classList.toggle("is-pulsing", state.step >= 5 && state.step < 7 && !state.failed);
    }

    summaryEl.hidden = state.step < 7;
    restartBtn.classList.toggle("is-alert", state.failed);
    highlightNext(state.failed || state.step >= 7 ? -1 : state.step);
  }

  function showStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("is-error", !!isError);
  }

  function labelFor(action) {
    const btn = actionsEl.querySelector(`[data-action="${action}"]`);
    const span = btn ? btn.querySelector("span:last-child") : null;
    return span ? span.textContent : action;
  }

  function succeed(nextStep, action) {
    fillSlot(nextStep - 1, labelFor(action));
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
      if (step === 0) succeed(1, action);
      return;
    }
    if (action === "sift") {
      if (step === 1) succeed(2, action);
      else if (step === 0) fail("還沒有茶末可以篩喔。");
      return;
    }
    if (action === "warm") {
      if (step === 2) succeed(3, action);
      else if (step < 2) fail("茶粉還不夠細，先篩一篩吧。");
      return;
    }
    if (action === "paste") {
      if (step === 3) succeed(4, action);
      else if (step === 2) fail("碗還是冷的，茶膏調不勻。");
      else if (step < 2) fail("茶粉還不夠細，先篩一篩吧。");
      return;
    }
    if (action === "whisk") {
      if (step >= 4 && step < 7) succeed(step + 1, action);
      else if (step < 4) fail("直接加水，茶粉會結塊。先調成茶膏吧。");
      return;
    }
  }

  function resetAll() {
    state.step = 0;
    state.failed = false;
    clearDone();
    resetSlots();
    showStatus(START_MSG, false);
    render();
  }

  actionsEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".dc-action-btn");
    if (!btn) return;
    handleAction(btn.dataset.action);
  });

  actionsEl.addEventListener("dc-drop-action", (event) => handleAction(event.detail));

  restartBtn.addEventListener("click", resetAll);

  showStatus(START_MSG, false);
  render();
}

setupDianCha();

/* ── 唐代煎茶模擬 ──────────────────────────────────────────────────── */
function setupJianCha() {
  const scene = document.getElementById("tcScene");
  const sceneWrap = document.getElementById("tcSceneWrap");
  const statusEl = document.getElementById("tcStatus");
  const actionsEl = document.getElementById("tcActions");
  const slotsEl = document.getElementById("tcSlots");
  const summaryEl = document.getElementById("tcSummary");
  const restartBtn = document.getElementById("tcRestart");
  const reLabel = document.getElementById("tcReLabel");

  if (!scene || !sceneWrap || !statusEl || !actionsEl || !slotsEl || !summaryEl || !restartBtn || !reLabel) return;

  const { fillSlot, highlightNext, resetSlots } = wireSlotsAndDragDrop(actionsEl, slotsEl);

  const START_MSG = "先從第一步開始吧！";

  const SUCCESS_MSG = {
    1: "茶餅烤得微焦，香氣散發出來了。",
    2: "茶餅碾成了細粉。",
    3: "用羅合篩出了均勻的茶粉。",
    4: "水面冒出像魚眼的小泡，這是『一沸』。現在該做什麼呢？",
    5: "一沸時加入了鹽。繼續加熱吧。",
    6: "鍋邊的泡泡像泉水湧出、連成串珠，這是『二沸』。現在該做什麼呢？",
    7: "取出一瓢水，把茶粉投入鍑中。繼續加熱吧。",
    8: "水像波浪一樣翻騰，這是『三沸』。快！現在該做什麼？",
    9: "把瓢裡的水倒回，止住沸騰，茶湯表面浮起了茶沫。",
    10: "茶湯分入各碗，完成了！",
  };

  const DONE_AT_STEP = { zhi: 1, nian: 2, shai: 3, yan: 5, qushui: 7, daohui: 9, re: 9 };

  const state = { step: 0, failed: false };

  function reLabelForStep(step) {
    if (step < 4) return "加熱（一沸）";
    if (step < 6) return "加熱（二沸）";
    return "加熱（三沸）";
  }

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
    if (state.step >= 10) setDone("fencha");

    actionsEl.querySelectorAll(".dc-action-btn").forEach((btn) => {
      btn.disabled = state.failed || state.step >= 10;
    });

    reLabel.textContent = reLabelForStep(state.step);

    const reBtn = actionsEl.querySelector('[data-action="re"]');
    if (reBtn) {
      reBtn.classList.toggle("is-pulsing", [3, 5, 7].includes(state.step) && !state.failed);
    }

    summaryEl.hidden = state.step < 10;
    restartBtn.classList.toggle("is-alert", state.failed);
    highlightNext(state.failed || state.step >= 10 ? -1 : state.step);
  }

  function showStatus(msg, isError) {
    statusEl.textContent = msg;
    statusEl.classList.toggle("is-error", !!isError);
  }

  function labelFor(action) {
    const btn = actionsEl.querySelector(`[data-action="${action}"]`);
    const span = btn ? btn.querySelector("span:last-child") : null;
    return span ? span.textContent : action;
  }

  function succeed(nextStep, action) {
    fillSlot(nextStep - 1, labelFor(action));
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
    showStatus("水煮過頭，變成『老水』，不能喝了！請按右上角「重新開始」再試一次。", true);
    shakeScene();
    render();
  }

  function handleAction(action) {
    if (state.failed || state.step >= 10) return;
    const step = state.step;

    if (action === "zhi") {
      if (step === 0) succeed(1, action);
      return;
    }
    if (action === "nian") {
      if (step === 1) succeed(2, action);
      else if (step === 0) fail("茶餅還沒烤過，香氣出不來喔。");
      return;
    }
    if (action === "shai") {
      if (step === 2) succeed(3, action);
      else if (step < 2) fail("茶餅還是一整塊，沒辦法篩。");
      return;
    }
    if (action === "re") {
      if (step === 3) { succeed(4, action); return; }
      if (step === 5) { succeed(6, action); return; }
      if (step === 7) { succeed(8, action); return; }
      if (step < 3) { fail("茶粉還沒準備好，先把茶處理好吧。"); return; }
      if (step === 4) { fail("已經一沸了，先加鹽吧。"); return; }
      if (step === 6) { fail("已經二沸了，先取水投茶吧。"); return; }
      if (step === 8) { hardFail(); return; }
      return;
    }
    if (action === "yan") {
      if (step === 4) succeed(5, action);
      else fail("陸羽說要在一沸時加鹽喔。");
      return;
    }
    if (action === "qushui") {
      if (step === 6) succeed(7, action);
      else fail("陸羽說要在二沸時取水、投入茶粉。");
      return;
    }
    if (action === "daohui") {
      if (step === 8) succeed(9, action);
      else fail("還沒到三沸，不需要止沸。");
      return;
    }
    if (action === "fencha") {
      if (step === 9) succeed(10, action);
      else fail("茶還沒煮好，先完成三沸吧。");
      return;
    }
  }

  function resetAll() {
    state.step = 0;
    state.failed = false;
    clearDone();
    resetSlots();
    showStatus(START_MSG, false);
    render();
  }

  actionsEl.addEventListener("click", (event) => {
    const btn = event.target.closest(".dc-action-btn");
    if (!btn) return;
    handleAction(btn.dataset.action);
  });

  actionsEl.addEventListener("dc-drop-action", (event) => handleAction(event.detail));

  restartBtn.addEventListener("click", resetAll);

  showStatus(START_MSG, false);
  render();
}

setupJianCha();

if (window.location.hash) {
  applyRouteFromHash();
} else {
  const activePanelName = document.querySelector(".lesson-panel.active")?.id.replace("-panel", "") || "tang";
  activatePanel(activePanelName, { updateUrl: false });
}
updateProgress();
