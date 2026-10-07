// Add your javascript here

const stickyClasses = ["fixed", "h-14"];
const unstickyClasses = ["absolute", "h-20"];
const stickyClassesContainer = [
  "border-neutral-300/50",
  "bg-white/80",
  "dark:border-neutral-600/40",
  "dark:bg-neutral-900/60",
  "backdrop-blur-2xl",
];
const unstickyClassesContainer = ["border-transparent"];
let headerElement = null;

document.addEventListener("DOMContentLoaded", () => {
  headerElement = document.getElementById("header");

  showMode(getMode());
  stickyHeaderFuncionality();
  evaluateHeaderPosition();
  mobileMenuFunctionality();
});

window.stickyHeaderFuncionality = () => {
  window.addEventListener("scroll", () => {
    evaluateHeaderPosition();
  });
};

window.evaluateHeaderPosition = () => {
  if (window.scrollY > 16) {
    headerElement.firstElementChild.classList.add(...stickyClassesContainer);
    headerElement.firstElementChild.classList.remove(
      ...unstickyClassesContainer,
    );
    headerElement.classList.add(...stickyClasses);
    headerElement.classList.remove(...unstickyClasses);
    document.getElementById("menu").classList.add("top-[56px]");
    document.getElementById("menu").classList.remove("top-[75px]");
  } else {
    headerElement.firstElementChild.classList.remove(...stickyClassesContainer);
    headerElement.firstElementChild.classList.add(...unstickyClassesContainer);
    headerElement.classList.add(...unstickyClasses);
    headerElement.classList.remove(...stickyClasses);
    document.getElementById("menu").classList.remove("top-[56px]");
    document.getElementById("menu").classList.add("top-[75px]");
  }
};

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const modes = {
  auto: { icon: "auto", label: "Auto mode", next: "light" },
  light: { icon: "sun", label: "Day mode", next: "dark" },
  dark: { icon: "moon", label: "Night mode", next: "auto" },
};

function getMode() {
  try {
    const theme = sessionStorage.getItem("theme");
    if (theme === "light" || theme === "dark") return theme;
  } catch {}
  return "auto";
}

function setMode(mode) {
  try {
    if (mode === "auto") {
      sessionStorage.removeItem("theme");
    } else {
      sessionStorage.setItem("theme", mode);
    }
  } catch {}
}

function isDark(mode) {
  return mode === "dark" || (mode === "auto" && darkQuery.matches);
}

function applyTheme(mode) {
  document.documentElement.classList.toggle("dark", isDark(mode));
}

function showMode(mode, animate) {
  const root = document.documentElement;
  const icons = Object.values(modes).map((m) =>
    document.getElementById(m.icon),
  );

  for (const icon of icons) {
    icon.classList.remove("setting", "rising");
  }

  let timeout = 0;

  if (animate) {
    timeout = 500;

    const current = modes[root.dataset.theme] ?? modes.auto;
    document.getElementById(current.icon).classList.add("setting");
  }

  setTimeout(() => {
    root.dataset.theme = mode;

    const label = `Theme: ${modes[mode].label}`;
    const toggle = document.getElementById("darkToggle");
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);

    applyTheme(mode);

    if (animate) {
      document.getElementById(modes[mode].icon).classList.add("rising");
    }
  }, timeout);
}

function cycleMode() {
  document.documentElement.classList.add("duration-300");

  const next = modes[getMode()].next;
  setMode(next);
  showMode(next, true);
}

const darkToggle = document.getElementById("darkToggle");
darkToggle.addEventListener("click", cycleMode);
darkToggle.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    cycleMode();
  }
});

darkQuery.addEventListener("change", () => {
  if (getMode() === "auto") {
    document.documentElement.classList.add("duration-300");
    applyTheme("auto");
  }
});

function mobileMenuFunctionality() {
  document.getElementById("openMenu").addEventListener("click", () => {
    openMobileMenu();
  });

  document.getElementById("closeMenu").addEventListener("click", () => {
    closeMobileMenu();
  });
}

window.openMobileMenu = () => {
  document.getElementById("openMenu").classList.add("hidden");
  document.getElementById("closeMenu").classList.remove("hidden");
  document.getElementById("menu").classList.remove("hidden");
  document.getElementById("mobileMenuBackground").classList.add("opacity-0");
  document.getElementById("mobileMenuBackground").classList.remove("hidden");

  setTimeout(() => {
    document
      .getElementById("mobileMenuBackground")
      .classList.remove("opacity-0");
  }, 1);
};

window.closeMobileMenu = () => {
  document.getElementById("closeMenu").classList.add("hidden");
  document.getElementById("openMenu").classList.remove("hidden");
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("mobileMenuBackground").classList.add("hidden");
};
