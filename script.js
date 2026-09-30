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

/* ── 複習頁測驗 ────────────────────────────────────────────────────────
   Three graded levels (生詞 / 語法 / 文化) plus an ungraded open-practice
   card. Every question type funnels through recordFirstAttempt() so the
   per-level and final scores only ever reflect each item's FIRST answer —
   "再試一次" lets the learner see the right answer and keep practicing,
   but doesn't change the score that's already been counted. */
function setupReview() {
  const restartBtn = document.getElementById("rvRestart");
  const l1FillBlock = document.getElementById("rvL1FillBlock");
  const l1ConfuseBlock = document.getElementById("rvL1ConfuseBlock");
  const l1Tip = document.getElementById("rvL1Tip");
  const l2Container = document.getElementById("rvL2Container");
  const l3Grid = document.getElementById("rvL3Grid");
  const l3Tip = document.getElementById("rvL3Tip");
  const locked2 = document.getElementById("rvLocked2");
  const locked3 = document.getElementById("rvLocked3");
  const finalEl = document.getElementById("rvFinal");
  const finalScoreEl = document.getElementById("rvFinalScore");
  const finalMsgEl = document.getElementById("rvFinalMsg");
  const openInput = document.getElementById("rvOpenInput");
  const openSubmit = document.getElementById("rvOpenSubmit");
  const openAnswer = document.getElementById("rvOpenAnswer");
  const scoreEls = {
    l1: document.getElementById("rvScore1"),
    l2: document.getElementById("rvScore2"),
    l3: document.getElementById("rvScore3"),
  };

  if (
    !restartBtn || !l1FillBlock || !l1ConfuseBlock || !l1Tip || !l2Container ||
    !l3Grid || !l3Tip || !locked2 || !locked3 || !finalEl || !finalScoreEl || !finalMsgEl ||
    !openInput || !openSubmit || !openAnswer
  ) return;

  /* ── Data ──────────────────────────────────────────────────────────── */
  const L1_POOL = ["繁榮", "擴散", "核心", "納入", "擺脫", "媒介", "攪打", "流傳", "調控", "提倡", "精緻", "秩序", "境界"];
  const L1_FILL = [
    { sentence: "這個城市過去二十年發展快速，經濟越來越＿＿。", answer: "繁榮" },
    { sentence: "病毒很快就＿＿到其他國家。", answer: "擴散" },
    { sentence: "這份報告的＿＿問題是學生缺乏學習動機。", answer: "核心" },
    { sentence: "學校決定把茶文化課程＿＿正式課程中。", answer: "納入" },
    { sentence: "他想＿＿工作壓力，所以每天去散步。", answer: "擺脫" },
    { sentence: "語言是文化交流的重要＿＿。", answer: "媒介" },
    { sentence: "做蛋糕時要把蛋白＿＿到出現泡沫。", answer: "攪打" },
    { sentence: "這首詩從唐代一直＿＿到今天。", answer: "流傳" },
    { sentence: "冷氣會自動＿＿室內溫度。", answer: "調控" },
    { sentence: "老師＿＿大家每天閱讀二十分鐘。", answer: "提倡" },
  ];
  const L1_CONFUSE_OPTIONS = ["體現", "體悟", "實踐"];
  const L1_CONFUSE = [
    { sentence: "他在山上住了一個月，＿＿到生活不需要那麼多東西。", answer: "體悟" },
    { sentence: "這幅畫＿＿了宋人對美感的追求。", answer: "體現" },
    { sentence: "知道道理還不夠，還要在生活中＿＿。", answer: "實踐" },
  ];
  const L1_TIP = "體悟：心裡真正明白。體現：把特點表現出來。實踐：實際去做。";

  const L2_REORDER = {
    title: "1. 對（於）…而言｜句子重組",
    explain: "用來表達「從某人或某事物的角度來看」。",
    chunks: ["而言", "學生", "對於", "考試壓力很大"],
    answer: ["對於", "學生", "而言", "考試壓力很大"],
  };

  const L2_FILL_BANK = ["整理茶事", "核心", "點茶", "節制", "簡樸", "學生的需求", "中心", "泡沫", "茶館"];
  const L2_FILL_QUESTIONS = [
    { template: "陸羽的《茶經》以＿＿為＿＿。", answer: ["整理茶事", "核心"], ordered: true },
    { template: "宋代文人以＿＿為一種生活美學的追求。", answer: ["點茶"], ordered: true },
    { template: "儒家提倡以＿＿、＿＿為核心。", answer: ["節制", "簡樸"], ordered: false },
    { template: "這門課以＿＿為＿＿。", answer: ["學生的需求", "中心"], ordered: true },
  ];
  const L2_FILL_TIP = "以＋A＋為＋B 表示把 A 當作 B。B 通常是「核心、中心、主要考量」這類表示重要位置的詞。";

  const L2_MATCH = {
    title: "3. 透過…｜配對方式與結果",
    explain: "用來表達「藉由某種方式，達到某種目的或產生某種結果」。",
    pairs: [
      { left: "透過喝茶", right: "培養好品格" },
      { left: "透過觀察水、火與茶的變化", right: "體悟自然的秩序" },
      { left: "透過茶筅攪打", right: "製造綿密的泡沫" },
      { left: "透過印刷術普及", right: "茶書、茶詩廣泛流傳" },
    ],
  };

  const L2_REWRITE = [
    {
      original: "因為黑色背景最能襯托白色泡沫，所以宋代流行黑色茶碗。",
      options: [
        "宋代之所以流行黑色茶碗，是因為黑色背景最能襯托白色泡沫。",
        "黑色背景之所以最能襯托白色泡沫，是因為宋代流行黑色茶碗。",
        "宋代流行黑色茶碗之所以，是因為黑色背景最能襯托白色泡沫。",
      ],
      answerIndex: 0,
    },
    {
      original: "陸羽寫了《茶經》，所以被尊稱為「茶聖」。",
      options: [
        "陸羽之所以寫了《茶經》，是因為他被尊稱為「茶聖」。",
        "陸羽之所以被尊稱為「茶聖」，是因為他寫了《茶經》。",
        "陸羽被尊稱為「茶聖」，是因為之所以他寫了《茶經》。",
      ],
      answerIndex: 1,
    },
  ];
  const L2_REWRITE_HINT = "「之所以」後面接結果，「是因為」後面接原因。";

  const L2_SELECT = {
    sentence: "宋代點茶不是把茶粉投入鍋中煮，而是＿＿。",
    options: ["第一沸時加鹽", "直接在茶碗中沖泡", "把茶餅烤到微焦"],
    answerIndex: 1,
    hint: "A 和 C 都是唐代煎茶的步驟。宋代點茶改成直接在茶碗中沖泡。",
  };

  const L3_CARDS = [
    { text: "把茶餅烤到微焦", answer: "唐代" },
    { text: "第一沸加鹽", answer: "唐代" },
    { text: "在鍑中煮茶", answer: "唐代" },
    { text: "陸羽寫《茶經》", answer: "唐代" },
    { text: "用茶筅攪打出泡沫", answer: "宋代" },
    { text: "流行黑色茶碗", answer: "宋代" },
    { text: "與插花、焚香、掛畫並列為生活四藝", answer: "宋代" },
    { text: "印刷術普及讓茶知識流傳", answer: "宋代" },
    { text: "要把茶碾成細粉", answer: "兩者" },
    { text: "把茶當成修心的媒介", answer: "兩者" },
  ];

  const TOTALS = { l1: L1_FILL.length + L1_CONFUSE.length, l2: 12, l3: L3_CARDS.length };
  const score = { l1: 0, l2: 0, l3: 0 };
  const resolved = { l1: 0, l2: 0, l3: 0 };

  /* ── Helpers ───────────────────────────────────────────────────────── */
  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function pickDistractors(pool, correct, count) {
    return shuffle(pool.filter((w) => w !== correct)).slice(0, count);
  }

  function recordFirstAttempt(levelKey, correct) {
    resolved[levelKey] += 1;
    if (correct) score[levelKey] += 1;
    if (resolved[levelKey] >= TOTALS[levelKey]) {
      const el = scoreEls[levelKey];
      if (el) {
        el.hidden = false;
        el.textContent = `${score[levelKey]} / ${TOTALS[levelKey]}`;
      }
      if (levelKey === "l1") {
        locked2.hidden = true;
        l2Container.hidden = false;
      }
      if (levelKey === "l2") {
        locked3.hidden = true;
        l3Grid.hidden = false;
      }
      if (levelKey === "l3") l3Tip.hidden = false;
      maybeShowFinal();
    }
  }

  function maybeShowFinal() {
    if (resolved.l1 < TOTALS.l1 || resolved.l2 < TOTALS.l2 || resolved.l3 < TOTALS.l3) return;
    const total = score.l1 + score.l2 + score.l3;
    const max = TOTALS.l1 + TOTALS.l2 + TOTALS.l3;
    finalScoreEl.textContent = `${total} / ${max}`;
    const pct = total / max;
    finalMsgEl.textContent =
      pct >= 0.9 ? "太厲害了！你已經掌握唐宋茶文化的生詞、語法和文化重點。" :
      pct >= 0.7 ? "表現不錯！回頭看看答錯的題目，會更完整喔。" :
      "繼續加油！可以按右上角「重新開始」再練習一次。";
    finalEl.hidden = false;
  }

  /* ── Shared multiple-choice renderer ──────────────────────────────────
     Used by L1's fill-in-blank, L1's confusable-word set, and L2's
     rewrite-choice / select-choice patterns — they're all "one prompt,
     pick the right option" underneath. */
  function renderMCQuestion(container, { numberLabel, promptHtml, options, correctAnswer, levelKey, wrongHint, onResolved }) {
    const card = document.createElement("div");
    card.className = "rv-question";
    card.innerHTML = `<p class="rv-sentence"></p><div class="rv-options"></div><div class="rv-feedback" hidden></div>`;
    const sentenceEl = card.querySelector(".rv-sentence");
    if (numberLabel) {
      const num = document.createElement("span");
      num.className = "rv-question-num";
      num.textContent = numberLabel;
      sentenceEl.appendChild(num);
    }
    const promptSpan = document.createElement("span");
    promptSpan.innerHTML = promptHtml;
    sentenceEl.appendChild(promptSpan);

    const optionsEl = card.querySelector(".rv-options");
    const feedbackEl = card.querySelector(".rv-feedback");
    let firstDone = false;
    let solved = false;

    function reset() {
      optionsEl.querySelectorAll("button").forEach((b) => {
        b.disabled = false;
        b.classList.remove("is-correct", "is-wrong");
      });
      feedbackEl.hidden = true;
      feedbackEl.innerHTML = "";
    }

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rv-option-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => {
        if (solved) return;
        const correct = opt === correctAnswer;
        if (!firstDone) {
          firstDone = true;
          recordFirstAttempt(levelKey, correct);
          if (onResolved) onResolved(correct);
        }
        optionsEl.querySelectorAll("button").forEach((b) => { b.disabled = true; });
        feedbackEl.hidden = false;
        if (correct) {
          solved = true;
          btn.classList.add("is-correct");
          feedbackEl.className = "rv-feedback is-correct";
          feedbackEl.textContent = "✓ 答對了！";
        } else {
          btn.classList.add("is-wrong");
          optionsEl.querySelectorAll("button").forEach((b) => {
            if (b.textContent === correctAnswer) b.classList.add("is-correct");
          });
          feedbackEl.className = "rv-feedback is-wrong";
          const msg = document.createElement("span");
          msg.textContent = `✗ 正確答案是「${correctAnswer}」${wrongHint ? "　" + wrongHint : ""}`;
          feedbackEl.appendChild(msg);
          const retry = document.createElement("button");
          retry.type = "button";
          retry.className = "rv-retry-btn";
          retry.textContent = "再試一次";
          retry.addEventListener("click", reset);
          feedbackEl.appendChild(retry);
        }
      });
      optionsEl.appendChild(btn);
    });

    container.appendChild(card);
  }

  /* ── Grammar pattern block wrapper (title + collapsible explanation) ── */
  function renderPattern(container, title, explain, buildBody) {
    const wrap = document.createElement("div");
    wrap.className = "rv-pattern";
    wrap.innerHTML = `
      <div class="rv-pattern-title">${title}</div>
      <button class="rv-explain-toggle" type="button">句式說明 ▾</button>
      <div class="rv-explain-body" hidden>${explain}</div>
      <div class="rv-pattern-body"></div>
    `;
    wrap.querySelector(".rv-explain-toggle").addEventListener("click", () => {
      const body = wrap.querySelector(".rv-explain-body");
      body.hidden = !body.hidden;
    });
    buildBody(wrap.querySelector(".rv-pattern-body"));
    container.appendChild(wrap);
  }

  /* ── 2.1 Sentence reorder ──────────────────────────────────────────── */
  function renderReorder(body) {
    body.innerHTML = `
      <div class="rv-answer-row"></div>
      <div class="rv-chunk-pool"></div>
      <button class="rv-check-btn" type="button" disabled>檢查</button>
      <div class="rv-feedback" hidden></div>
    `;
    const answerRow = body.querySelector(".rv-answer-row");
    const pool = body.querySelector(".rv-chunk-pool");
    const checkBtn = body.querySelector(".rv-check-btn");
    const feedbackEl = body.querySelector(".rv-feedback");
    const chunks = shuffle(L2_REORDER.chunks);
    let picked = [];
    let firstDone = false;
    let solved = false;

    function renderChunks() {
      pool.innerHTML = "";
      chunks.forEach((c) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "rv-chunk";
        btn.textContent = c;
        if (picked.includes(c)) btn.classList.add("is-used");
        btn.addEventListener("click", () => {
          if (solved || picked.includes(c)) return;
          picked.push(c);
          renderChunks();
          renderAnswer();
        });
        pool.appendChild(btn);
      });
    }

    function renderAnswer() {
      answerRow.innerHTML = "";
      picked.forEach((c, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "rv-chunk";
        btn.textContent = c;
        btn.addEventListener("click", () => {
          if (solved) return;
          picked.splice(i, 1);
          renderChunks();
          renderAnswer();
        });
        answerRow.appendChild(btn);
      });
      checkBtn.disabled = picked.length !== L2_REORDER.answer.length;
    }

    checkBtn.addEventListener("click", () => {
      const correct = picked.length === L2_REORDER.answer.length && picked.every((c, i) => c === L2_REORDER.answer[i]);
      if (!firstDone) {
        firstDone = true;
        recordFirstAttempt("l2", correct);
      }
      feedbackEl.hidden = false;
      if (correct) {
        solved = true;
        checkBtn.disabled = true;
        feedbackEl.className = "rv-feedback is-correct";
        feedbackEl.textContent = "✓ 答對了！";
      } else {
        feedbackEl.className = "rv-feedback is-wrong";
        feedbackEl.innerHTML = "";
        const msg = document.createElement("span");
        msg.textContent = `✗ 正確答案是「${L2_REORDER.answer.join("")}」`;
        feedbackEl.appendChild(msg);
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "rv-retry-btn";
        retry.textContent = "再試一次";
        retry.addEventListener("click", () => {
          picked = [];
          renderChunks();
          renderAnswer();
          feedbackEl.hidden = true;
          feedbackEl.innerHTML = "";
        });
        feedbackEl.appendChild(retry);
      }
    });

    renderChunks();
    renderAnswer();
  }

  /* ── 2.2 Word-bank fill ────────────────────────────────────────────── */
  function renderWordbankFill(body) {
    body.innerHTML = `
      <div class="rv-wordbank"></div>
      <div class="rv-fill-questions"></div>
      <button class="rv-check-btn" type="button" disabled>檢查</button>
      <div class="rv-feedback" hidden></div>
    `;
    const bankEl = body.querySelector(".rv-wordbank");
    const qWrap = body.querySelector(".rv-fill-questions");
    const checkBtn = body.querySelector(".rv-check-btn");
    const feedbackEl = body.querySelector(".rv-feedback");
    const bankWords = shuffle(L2_FILL_BANK);
    const filled = L2_FILL_QUESTIONS.map((q) => new Array(q.answer.length).fill(null));
    const locked = L2_FILL_QUESTIONS.map(() => false);
    let lastResults = null;
    let activeSlot = null;
    let solved = false;
    let firstCheckDone = false;

    function isWordUsed(w) {
      return filled.some((arr) => arr.includes(w));
    }

    function evaluate(qi) {
      const q = L2_FILL_QUESTIONS[qi];
      const given = filled[qi];
      return q.ordered
        ? given.every((w, i) => w === q.answer[i])
        : given.slice().sort().join() === q.answer.slice().sort().join();
    }

    function renderBank() {
      bankEl.innerHTML = "";
      bankWords.forEach((w) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "rv-bank-word";
        btn.textContent = w;
        if (isWordUsed(w)) btn.classList.add("is-used");
        btn.addEventListener("click", () => {
          if (solved || isWordUsed(w) || !activeSlot) return;
          filled[activeSlot.qi][activeSlot.bi] = w;
          activeSlot = null;
          renderAll();
        });
        bankEl.appendChild(btn);
      });
    }

    function renderQuestions() {
      qWrap.innerHTML = "";
      L2_FILL_QUESTIONS.forEach((q, qi) => {
        const p = document.createElement("p");
        p.className = "rv-sentence";
        const num = document.createElement("span");
        num.className = "rv-question-num";
        num.textContent = `${qi + 1}.`;
        p.appendChild(num);
        const parts = q.template.split("＿＿");
        parts.forEach((part, idx) => {
          p.appendChild(document.createTextNode(part));
          if (idx < parts.length - 1) {
            const slot = document.createElement("button");
            slot.type = "button";
            slot.className = "rv-fill-slot";
            const word = filled[qi][idx];
            slot.textContent = word || "＿＿";
            if (word) slot.classList.add("is-filled");
            if (activeSlot && activeSlot.qi === qi && activeSlot.bi === idx) slot.classList.add("is-active");
            if (lastResults) {
              if (lastResults[qi] === true) slot.classList.add("is-correct");
              else if (lastResults[qi] === false) slot.classList.add("is-wrong");
            }
            slot.disabled = locked[qi];
            slot.addEventListener("click", () => {
              if (solved || locked[qi]) return;
              if (word) {
                filled[qi][idx] = null;
                activeSlot = null;
              } else {
                activeSlot = { qi, bi: idx };
              }
              renderAll();
            });
            p.appendChild(slot);
          }
        });
        qWrap.appendChild(p);
      });
    }

    function renderAll() {
      renderBank();
      renderQuestions();
      checkBtn.disabled = !filled.every((arr) => arr.every((w) => w !== null));
    }

    checkBtn.addEventListener("click", () => {
      const results = L2_FILL_QUESTIONS.map((_, qi) => evaluate(qi));
      if (!firstCheckDone) {
        firstCheckDone = true;
        results.forEach((ok) => recordFirstAttempt("l2", ok));
      }
      results.forEach((ok, qi) => { if (ok) locked[qi] = true; });
      lastResults = results;
      const allOk = results.every(Boolean);
      renderAll();
      feedbackEl.hidden = false;
      feedbackEl.innerHTML = "";
      const msg = document.createElement("span");
      msg.textContent = (allOk ? "✓ 全部正確！" : "✗ 有些還不對。") + L2_FILL_TIP;
      feedbackEl.className = allOk ? "rv-feedback is-correct" : "rv-feedback is-wrong";
      feedbackEl.appendChild(msg);
      if (allOk) {
        solved = true;
        checkBtn.disabled = true;
      } else {
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "rv-retry-btn";
        retry.textContent = "再試一次";
        retry.addEventListener("click", () => {
          results.forEach((ok, qi) => { if (!ok) filled[qi] = filled[qi].map(() => null); });
          lastResults = null;
          renderAll();
          feedbackEl.hidden = true;
        });
        feedbackEl.appendChild(retry);
      }
    });

    renderAll();
  }

  /* ── 2.3 Matching ──────────────────────────────────────────────────── */
  function renderMatching(body) {
    body.innerHTML = `
      <div class="rv-match-wrap">
        <div class="rv-match-col" data-col="left"></div>
        <div class="rv-match-col" data-col="right"></div>
      </div>
      <button class="rv-check-btn" type="button" disabled>檢查</button>
      <div class="rv-feedback" hidden></div>
    `;
    const leftCol = body.querySelector('[data-col="left"]');
    const rightCol = body.querySelector('[data-col="right"]');
    const checkBtn = body.querySelector(".rv-check-btn");
    const feedbackEl = body.querySelector(".rv-feedback");

    const leftItems = L2_MATCH.pairs.map((p, i) => ({ text: p.left, idx: i }));
    const rightItems = shuffle(L2_MATCH.pairs.map((p, i) => ({ text: p.right, idx: i })));
    const pairing = {};
    const reversePairing = {};
    const lockedCorrect = new Set();
    let selectedLeft = null;
    let lastResults = null;
    let solved = false;
    let firstCheckDone = false;

    function renderMatch() {
      leftCol.innerHTML = "";
      leftItems.forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "rv-match-item";
        btn.textContent = item.text;
        const isPaired = pairing[item.idx] !== undefined;
        if (isPaired) btn.classList.add(`rv-pair-${item.idx % 4}`);
        if (selectedLeft === item.idx) btn.classList.add("is-selected");
        if (lastResults && lastResults[item.idx] === true) btn.classList.add("is-correct");
        if (lastResults && lastResults[item.idx] === false) btn.classList.add("is-wrong");
        btn.disabled = solved || lockedCorrect.has(item.idx);
        btn.addEventListener("click", () => {
          if (solved || lockedCorrect.has(item.idx)) return;
          if (isPaired) {
            const r = pairing[item.idx];
            delete pairing[item.idx];
            delete reversePairing[r];
            selectedLeft = null;
            lastResults = null;
          } else {
            selectedLeft = selectedLeft === item.idx ? null : item.idx;
          }
          renderMatch();
        });
        leftCol.appendChild(btn);
      });

      rightCol.innerHTML = "";
      rightItems.forEach((item) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "rv-match-item";
        btn.textContent = item.text;
        const pairedLeft = reversePairing[item.idx];
        const isPaired = pairedLeft !== undefined;
        if (isPaired) btn.classList.add(`rv-pair-${pairedLeft % 4}`);
        if (lastResults && isPaired && lastResults[pairedLeft] === true) btn.classList.add("is-correct");
        if (lastResults && isPaired && lastResults[pairedLeft] === false) btn.classList.add("is-wrong");
        btn.disabled = solved || (isPaired && lockedCorrect.has(pairedLeft));
        btn.addEventListener("click", () => {
          if (solved) return;
          if (isPaired) {
            if (lockedCorrect.has(pairedLeft)) return;
            delete pairing[pairedLeft];
            delete reversePairing[item.idx];
            lastResults = null;
            renderMatch();
            return;
          }
          if (selectedLeft === null) return;
          pairing[selectedLeft] = item.idx;
          reversePairing[item.idx] = selectedLeft;
          selectedLeft = null;
          lastResults = null;
          renderMatch();
        });
        rightCol.appendChild(btn);
      });

      checkBtn.disabled = Object.keys(pairing).length !== leftItems.length;
    }

    checkBtn.addEventListener("click", () => {
      const results = {};
      leftItems.forEach((item) => {
        results[item.idx] = pairing[item.idx] === item.idx;
      });
      if (!firstCheckDone) {
        firstCheckDone = true;
        Object.values(results).forEach((ok) => recordFirstAttempt("l2", ok));
      }
      leftItems.forEach((item) => { if (results[item.idx]) lockedCorrect.add(item.idx); });
      lastResults = results;
      const allOk = Object.values(results).every(Boolean);
      renderMatch();
      feedbackEl.hidden = false;
      feedbackEl.innerHTML = "";
      if (allOk) {
        solved = true;
        feedbackEl.className = "rv-feedback is-correct";
        feedbackEl.textContent = "✓ 全部配對正確！";
      } else {
        feedbackEl.className = "rv-feedback is-wrong";
        feedbackEl.textContent = "✗ 紅色的配對不正確，請點一下解除配對，再試一次。";
      }
    });

    renderMatch();
  }

  /* ── Level 3 culture card ──────────────────────────────────────────── */
  function renderCultureCard(container, item) {
    const card = document.createElement("div");
    card.className = "rv-culture-card";
    card.innerHTML = `<p class="rv-culture-text"></p><div class="rv-culture-options"></div>`;
    card.querySelector(".rv-culture-text").textContent = item.text;
    const optsEl = card.querySelector(".rv-culture-options");
    let firstDone = false;
    let solved = false;

    ["唐代", "宋代", "兩者"].forEach((label) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "rv-culture-btn";
      btn.textContent = label;
      btn.addEventListener("click", () => {
        if (solved) return;
        const correct = label === item.answer;
        if (!firstDone) {
          firstDone = true;
          recordFirstAttempt("l3", correct);
        }
        optsEl.querySelectorAll("button").forEach((b) => { b.disabled = true; });
        if (correct) {
          solved = true;
          btn.classList.add("is-correct");
          return;
        }
        btn.classList.add("is-wrong");
        optsEl.querySelectorAll("button").forEach((b) => {
          if (b.textContent === item.answer) b.classList.add("is-correct");
        });
        const feedbackEl = document.createElement("div");
        feedbackEl.className = "rv-feedback is-wrong";
        const msg = document.createElement("span");
        msg.textContent = `✗ 正確答案是「${item.answer}」`;
        feedbackEl.appendChild(msg);
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "rv-retry-btn";
        retry.textContent = "再試一次";
        retry.addEventListener("click", () => {
          optsEl.querySelectorAll("button").forEach((b) => { b.disabled = false; b.classList.remove("is-correct", "is-wrong"); });
          feedbackEl.remove();
        });
        feedbackEl.appendChild(retry);
        card.appendChild(feedbackEl);
      });
      optsEl.appendChild(btn);
    });

    container.appendChild(card);
  }

  /* ── Build (and rebuild, on restart) ──────────────────────────────── */
  function build() {
    score.l1 = 0; score.l2 = 0; score.l3 = 0;
    resolved.l1 = 0; resolved.l2 = 0; resolved.l3 = 0;
    scoreEls.l1.hidden = true;
    scoreEls.l2.hidden = true;
    scoreEls.l3.hidden = true;
    l1Tip.hidden = true;
    l3Tip.hidden = true;
    finalEl.hidden = true;
    locked2.hidden = false;
    locked3.hidden = false;
    l2Container.hidden = true;
    l3Grid.hidden = true;
    openAnswer.hidden = true;
    openInput.value = "";

    l1FillBlock.innerHTML = "";
    L1_FILL.forEach((q, qi) => {
      const options = shuffle([q.answer, ...pickDistractors(L1_POOL, q.answer, 3)]);
      renderMCQuestion(l1FillBlock, {
        numberLabel: `${qi + 1}.`,
        promptHtml: q.sentence.replace("＿＿", '<span class="rv-blank"></span>'),
        options,
        correctAnswer: q.answer,
        levelKey: "l1",
      });
    });

    l1ConfuseBlock.innerHTML = "";
    let confuseDone = 0;
    L1_CONFUSE.forEach((q, qi) => {
      renderMCQuestion(l1ConfuseBlock, {
        numberLabel: `${L1_FILL.length + qi + 1}.`,
        promptHtml: q.sentence.replace("＿＿", '<span class="rv-blank"></span>'),
        options: L1_CONFUSE_OPTIONS,
        correctAnswer: q.answer,
        levelKey: "l1",
        onResolved: () => {
          confuseDone += 1;
          if (confuseDone === L1_CONFUSE.length) {
            l1Tip.hidden = false;
            l1Tip.textContent = L1_TIP;
          }
        },
      });
    });

    l2Container.innerHTML = "";
    renderPattern(l2Container, L2_REORDER.title, L2_REORDER.explain, renderReorder);
    renderPattern(l2Container, "2. 以…為…｜詞卡填空", "用來表達「把某人或某事物當作……」。", renderWordbankFill);
    renderPattern(l2Container, L2_MATCH.title, L2_MATCH.explain, renderMatching);
    renderPattern(l2Container, "4. （之）所以…是因為…｜選出正確的改寫", "用來說明某個結果或現象的原因。", (b) => {
      L2_REWRITE.forEach((q, qi) => {
        renderMCQuestion(b, {
          numberLabel: `第 ${qi + 1} 題`,
          promptHtml: `原句：${q.original}`,
          options: q.options,
          correctAnswer: q.options[q.answerIndex],
          levelKey: "l2",
          wrongHint: L2_REWRITE_HINT,
        });
      });
    });
    renderPattern(l2Container, "5. 不是…而是…｜選擇", "用來表達「否定 A，強調 B」。", (b) => {
      renderMCQuestion(b, {
        promptHtml: L2_SELECT.sentence.replace("＿＿", '<span class="rv-blank"></span>'),
        options: L2_SELECT.options,
        correctAnswer: L2_SELECT.options[L2_SELECT.answerIndex],
        levelKey: "l2",
        wrongHint: L2_SELECT.hint,
      });
    });

    l3Grid.innerHTML = "";
    shuffle(L3_CARDS).forEach((item) => renderCultureCard(l3Grid, item));
  }

  restartBtn.addEventListener("click", build);
  openSubmit.addEventListener("click", () => { openAnswer.hidden = false; });

  build();
}

setupReview();

if (window.location.hash) {
  applyRouteFromHash();
} else {
  const activePanelName = document.querySelector(".lesson-panel.active")?.id.replace("-panel", "") || "tang";
  activatePanel(activePanelName, { updateUrl: false });
}
updateProgress();
