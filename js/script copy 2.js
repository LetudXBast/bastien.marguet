// script.js
(function () {
  "use strict";

  const mq = window.matchMedia("(max-width: 768px)");

  /** Menu mobile robuste */
  function initMenuToggle() {
    const btn = document.querySelector(".menu-toggle");
    const navList = document.querySelector(".site-header nav ul");
    if (!btn || !navList) return;

    btn.setAttribute("aria-expanded", "false");

    const openMenu = () => {
      navList.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
      document.body.classList.add("menu-open");
    };

    const closeMenu = () => {
      navList.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    };

    btn.addEventListener("click", () => {
      navList.classList.contains("open") ? closeMenu() : openMenu();
    });

    // fermer si clic sur un lien (mobile)
    navList.addEventListener("click", (e) => {
      if (!mq.matches) return;
      const a = e.target.closest("a");
      if (a) closeMenu();
    });

    // fermer si clic en dehors (mobile)
    document.addEventListener("click", (e) => {
      if (!mq.matches) return;
      if (!navList.classList.contains("open")) return;
      if (!e.target.closest(".site-header")) closeMenu();
    });

    // fermer avec Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });

    // si on change de breakpoint, on remet à plat
    mq.addEventListener("change", closeMenu);
  }

  /** Smooth scroll (vrai) pour les ancres internes */
  function initSmoothScroll() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;

      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /** Dropdown cliquable sur mobile */
  function initMobileDropdown() {
    const trigger = document.querySelector(".dropdown > a");
    const submenu = document.querySelector(".dropdown > .submenu");
    if (!trigger || !submenu) return;

    trigger.addEventListener("click", (e) => {
      if (!mq.matches) return; // desktop : lien normal
      e.preventDefault();
      submenu.classList.toggle("open");
    });
  }

  /** ScrollSpy plus fiable (compare le hash) */
  function initScrollSpy() {
    const sections = [...document.querySelectorAll("section[id]")];
    const navLinks = [...document.querySelectorAll('nav a[href*="#"]')];
    if (!sections.length || !navLinks.length) return;

    let ticking = false;

    const update = () => {
      const scrollPos = window.scrollY + window.innerHeight / 3;
      let currentId = null;

      for (const sec of sections) {
        if (scrollPos >= sec.offsetTop && scrollPos < sec.offsetTop + sec.offsetHeight) {
          currentId = sec.id;
          break;
        }
      }
      if (!currentId) return;

      navLinks.forEach((link) => {
        let hash = "";
        try {
          hash = new URL(link.getAttribute("href"), window.location.href).hash;
        } catch {
          hash = link.getAttribute("href");
        }
        link.classList.toggle("active", hash === `#${currentId}`);
      });

      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    });

    window.addEventListener("resize", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    });

    update();
  }

  /** Validation basique (ok, mais pas indispensable si required partout) */
  function initFormValidation() {
    const form = document.querySelector("form");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      const name = form.querySelector('[name="name"]')?.value.trim();
      const email = form.querySelector('[name="email"]')?.value.trim();
      const message = form.querySelector('[name="message"]')?.value.trim();
      if (!name || !email || !message) {
        e.preventDefault();
        alert("Veuillez remplir tous les champs.");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMenuToggle();
    initSmoothScroll();
    initMobileDropdown();
    initScrollSpy();
    initFormValidation();
  });
})();
