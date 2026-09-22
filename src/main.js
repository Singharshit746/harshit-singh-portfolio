import "@fontsource/karla/latin-400.css";
import "@fontsource/karla/latin-500.css";
import "@fontsource/karla/latin-600.css";
import "@fontsource/karla/latin-400-italic.css";
import "@fontsource/newsreader/latin-400.css";
import "@fontsource/newsreader/latin-500.css";
import "@fontsource/newsreader/latin-600.css";
import "./styles.css";

const nav = document.querySelector(".site-nav");
const toggle = document.querySelector(".nav-toggle");
const menu = document.querySelector("#site-menu");
const year = document.querySelector("[data-year]");
const page = [...document.querySelectorAll("main, .site-footer")];

if (year) {
  year.textContent = String(new Date().getFullYear());
}

const menuIsOpen = () => toggle?.getAttribute("aria-expanded") === "true";

const focusableInMenu = () => {
  if (!toggle || !menu) return [];
  return [toggle, ...menu.querySelectorAll("a")];
};

const setPageInert = (locked) => {
  page.forEach((el) => {
    el.inert = locked;
  });
};

const closeMenu = () => {
  if (!toggle || !menu) return;
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open menu");
  menu.dataset.open = "false";
  document.body.classList.remove("menu-open");
  setPageInert(false);
};

const openMenu = () => {
  if (!toggle || !menu) return;
  toggle.setAttribute("aria-expanded", "true");
  toggle.setAttribute("aria-label", "Close menu");
  menu.dataset.open = "true";
  document.body.classList.add("menu-open");
  setPageInert(true);
  menu.querySelector("a")?.focus();
};

toggle?.addEventListener("click", () => {
  if (menuIsOpen()) closeMenu();
  else openMenu();
});

menu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
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
    // Keep the active item on the section in the middle of the viewport.
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
