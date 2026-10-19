import "@fontsource/karla/latin-400.css";
import "@fontsource/karla/latin-500.css";
import "@fontsource/newsreader/latin-400.css";
import "@fontsource/newsreader/latin-500.css";
import "./styles.css";

// Mobile nav is a right-edge sheet: 1:1 drag, then a critically damped spring.

const nav = document.querySelector(".site-nav");
const toggle = document.querySelector(".nav-toggle");
const menu = document.querySelector("#site-menu");
const menuHome = menu?.parentElement;
const year = document.querySelector("[data-year]");
const page = [...document.querySelectorAll("main, .site-footer, .brand, .skip-link")];
const scrim = document.createElement("button");

scrim.type = "button";
scrim.className = "menu-scrim";
scrim.setAttribute("aria-label", "Close menu");
scrim.setAttribute("aria-hidden", "true");
scrim.hidden = true;
scrim.tabIndex = -1;
nav?.insertAdjacentElement("afterend", scrim);

if (year) {
  year.textContent = String(new Date().getFullYear());
}

const SHEET_QUERY = "(max-width: 860px)";
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const HYSTERESIS = 10;
const RESPONSE = 0.3;
const DAMPING_RATIO = 1.0;
const SETTLE_POS = 0.6;
const SETTLE_VEL = 14;
const FLICK_VELOCITY = 420;

const omega = (2 * Math.PI) / RESPONSE;
const stiffness = omega * omega;
const damping = 2 * DAMPING_RATIO * omega;

const sheetQuery = window.matchMedia(SHEET_QUERY);
const motionQuery = window.matchMedia(MOTION_QUERY);

let intentOpen = false;
let x = 0;
let vx = 0;
let targetX = 0;
let raf = 0;
let lastTime = 0;
let dragging = false;
let dragPointerId = null;
let dragStartX = 0;
let dragOriginX = 0;
let passedHysteresis = false;
let suppressClick = false;
let samples = [];

const isSheet = () => sheetQuery.matches;
const reduceMotion = () => motionQuery.matches;
const menuIsOpen = () => intentOpen;

const focusableInMenu = () => {
  if (!toggle || !menu) return [];
  return [toggle, ...menu.querySelectorAll("a")];
};

const setPageInert = (locked) => {
  page.forEach((el) => {
    el.inert = locked;
    if (locked) el.setAttribute("aria-hidden", "true");
    else el.removeAttribute("aria-hidden");
  });
};

const setScrim = (on) => {
  const show = on && isSheet();
  scrim.classList.toggle("is-on", show);
  scrim.hidden = !show;
  if (show) scrim.removeAttribute("aria-hidden");
  else scrim.setAttribute("aria-hidden", "true");
};

const panelWidth = () => menu?.offsetWidth || window.innerWidth;

const rubberband = (overshoot, dimension, constant = 0.55) => {
  if (dimension <= 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
};

const constrain = (raw) => {
  const width = panelWidth();
  if (raw < 0) return rubberband(raw, width);
  if (raw > width) return width + rubberband(raw - width, width);
  return raw;
};

const project = (velocity, decelerationRate = 0.998) =>
  (velocity / 1000) * (decelerationRate / (1 - decelerationRate));

const stopSpring = () => {
  if (!raf) return;
  cancelAnimationFrame(raf);
  raf = 0;
  lastTime = 0;
};

const sheetTransform = (nextX) => {
  const width = panelWidth();
  const progress = width <= 0 ? 1 : Math.min(1, Math.max(0, 1 - nextX / width));
  const scale = 0.94 + 0.06 * progress;
  return `translate3d(${nextX}px, 0, 0) scale(${scale})`;
};

const paintSheet = (nextX, moving) => {
  if (!menu) return;
  x = nextX;
  menu.style.transform = sheetTransform(x);
  menu.classList.toggle("is-moving", moving);
};

const releaseVelocity = () => {
  if (samples.length < 2) return 0;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dt = (last.t - first.t) / 1000;
  if (dt <= 0.001) return 0;
  return (last.x - first.x) / dt;
};

const finishClose = () => {
  if (!menu || !toggle || intentOpen) return;
  menu.dataset.open = "false";
  menu.classList.remove("is-moving");
  document.body.classList.remove("menu-open");
  setPageInert(false);
  setScrim(false);
  if (isSheet() && !reduceMotion()) {
    x = panelWidth();
    targetX = x;
    vx = 0;
    menu.style.transform = sheetTransform(x);
  }
};

const stepSpring = (now) => {
  if (!lastTime) lastTime = now;
  const dt = Math.min((now - lastTime) / 1000, 0.048);
  lastTime = now;

  const acc = (targetX - x) * stiffness - vx * damping;
  vx += acc * dt;
  paintSheet(x + vx * dt, true);

  if (Math.abs(targetX - x) < SETTLE_POS && Math.abs(vx) < SETTLE_VEL) {
    vx = 0;
    paintSheet(targetX, false);
    raf = 0;
    lastTime = 0;
    if (targetX > 0) finishClose();
    return;
  }

  raf = requestAnimationFrame(stepSpring);
};

const animateTo = (nextTarget, velocity = vx) => {
  if (!menu) return;
  targetX = nextTarget;
  vx = velocity;
  menu.dataset.open = "true";
  menu.classList.add("is-moving");

  if (reduceMotion() || !isSheet()) {
    stopSpring();
    menu.style.transform = "";
    menu.classList.remove("is-moving");
    if (nextTarget > 0) finishClose();
    return;
  }

  stopSpring();
  raf = requestAnimationFrame(stepSpring);
};

const syncReducedClass = () => {
  if (!menu) return;
  menu.classList.toggle("is-reduced", isSheet() && reduceMotion());
  if (!isSheet() || reduceMotion()) {
    menu.style.transform = "";
  }
};

const placeMenu = () => {
  if (!menu || !menuHome) return;
  if (isSheet()) document.body.append(menu);
  else menuHome.append(menu);
};

const layoutSheet = () => {
  if (!menu || !toggle) return;
  placeMenu();
  syncReducedClass();

  if (!isSheet()) {
    stopSpring();
    intentOpen = false;
    vx = 0;
    menu.dataset.open = "false";
    menu.classList.remove("is-moving");
    menu.style.transform = "";
    document.body.classList.remove("menu-open");
    setPageInert(false);
    setScrim(false);
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
    return;
  }

  if (reduceMotion()) {
    stopSpring();
    menu.style.transform = "";
    menu.classList.remove("is-moving");
    menu.dataset.open = intentOpen ? "true" : "false";
    return;
  }

  if (!intentOpen && !dragging && !raf) {
    x = panelWidth();
    targetX = x;
    vx = 0;
    menu.style.transform = sheetTransform(x);
  }
};

const openMenu = ({ focus = true, velocity = vx } = {}) => {
  if (!toggle || !menu) return;
  intentOpen = true;
  toggle.setAttribute("aria-expanded", "true");
  toggle.setAttribute("aria-label", "Close menu");
  menu.dataset.open = "true";
  document.body.classList.add("menu-open");
  setPageInert(true);
  setScrim(true);
  if (focus) menu.querySelector("a")?.focus();

  if (!isSheet()) return;
  if (reduceMotion()) {
    syncReducedClass();
    menu.style.transform = "";
    return;
  }
  animateTo(0, velocity);
};

const closeMenu = ({ velocity = vx } = {}) => {
  if (!toggle || !menu) return;
  intentOpen = false;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open menu");

  if (!isSheet() || reduceMotion()) {
    menu.dataset.open = "false";
    menu.classList.remove("is-moving");
    document.body.classList.remove("menu-open");
    setPageInert(false);
    setScrim(false);
    syncReducedClass();
    return;
  }

  animateTo(panelWidth(), velocity);
};

const canDragSheet = () => {
  if (!isSheet() || reduceMotion()) return false;
  return intentOpen || raf > 0 || x < panelWidth() - 1;
};

const onPointerDown = (event) => {
  if (!menu || event.button) return;
  if (!canDragSheet()) return;

  dragging = true;
  passedHysteresis = false;
  dragPointerId = event.pointerId;
  dragStartX = event.clientX;
  dragOriginX = x;
  samples = [{ t: performance.now(), x: event.clientX }];
  try {
    menu.setPointerCapture(event.pointerId);
  } catch {
    dragging = false;
    dragPointerId = null;
    return;
  }
  stopSpring();
};

const onPointerMove = (event) => {
  if (!dragging || event.pointerId !== dragPointerId) return;
  const now = performance.now();
  samples.push({ t: now, x: event.clientX });
  samples = samples.filter((sample) => now - sample.t < 48);

  const dx = event.clientX - dragStartX;
  if (!passedHysteresis) {
    if (Math.abs(dx) < HYSTERESIS) return;
    passedHysteresis = true;
  }

  paintSheet(constrain(dragOriginX + dx), true);
};

const onPointerUp = (event) => {
  if (!dragging || event.pointerId !== dragPointerId) return;
  dragging = false;
  dragPointerId = null;

  if (!passedHysteresis) return;

  suppressClick = true;
  vx = releaseVelocity();
  const width = panelWidth();
  let nextOpen = x + project(vx) < width / 2;
  if (Math.abs(vx) > FLICK_VELOCITY) nextOpen = vx < 0;

  if (nextOpen) openMenu({ focus: false, velocity: vx });
  else closeMenu({ velocity: vx });
};

if (toggle && menu) {
  let ignoreToggleClick = false;

  toggle.addEventListener("pointerdown", (event) => {
    if (event.button) return;
    ignoreToggleClick = true;
    if (menuIsOpen()) closeMenu();
    else openMenu();
  });

  toggle.addEventListener("click", (event) => {
    if (ignoreToggleClick) {
      event.preventDefault();
      ignoreToggleClick = false;
      return;
    }
    if (menuIsOpen()) closeMenu();
    else openMenu();
  });

  scrim.addEventListener("click", () => closeMenu());

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (!suppressClick) closeMenu();
    });
  });

  menu.addEventListener("pointerdown", onPointerDown);
  menu.addEventListener("pointermove", onPointerMove);
  menu.addEventListener("pointerup", onPointerUp);
  menu.addEventListener("pointercancel", onPointerUp);
  menu.addEventListener(
    "click",
    (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    },
    true
  );

  layoutSheet();
  sheetQuery.addEventListener("change", layoutSheet);
  motionQuery.addEventListener("change", layoutSheet);
  window.addEventListener("resize", () => {
    if (!isSheet() || reduceMotion() || intentOpen || dragging) return;
    x = panelWidth();
    targetX = x;
    menu.style.transform = sheetTransform(x);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
    toggle?.focus();
    return;
  }

  if (event.key !== "Tab" || !menuIsOpen()) return;

  const items = focusableInMenu();
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return;

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

const sections = [...document.querySelectorAll("main section[id]")];
const navLinks = [...document.querySelectorAll(".site-menu a[href*='#']")];

const setActive = (id) => {
  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const match = href === `#${id}` || href.endsWith(`#${id}`);
    link.classList.toggle("is-active", match);
    if (match) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
};

if (sections.length && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target?.id) setActive(visible.target.id);
    },
    { rootMargin: "-35% 0px -50% 0px", threshold: [0.1, 0.25, 0.5] }
  );
  sections.forEach((section) => observer.observe(section));
}

window.addEventListener(
  "scroll",
  () => {
    nav?.classList.toggle("is-scrolled", window.scrollY > 8);
  },
  { passive: true }
);

const clearPressed = () => {
  document.querySelectorAll(".is-pressed").forEach((el) => el.classList.remove("is-pressed"));
};

document.addEventListener("pointerdown", (event) => {
  if (event.button) return;
  const target = event.target.closest("a, button");
  if (target) target.classList.add("is-pressed");
});

document.addEventListener("pointerup", clearPressed);
document.addEventListener("pointercancel", clearPressed);
document.addEventListener("pointerout", (event) => {
  const from = event.target instanceof Element ? event.target.closest("a, button") : null;
  if (from && !from.contains(event.relatedTarget)) from.classList.remove("is-pressed");
});
