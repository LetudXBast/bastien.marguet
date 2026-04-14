(function () {
  "use strict";

  function normalizePathname(pathname) {
    return pathname.replace(/index\.html$/i, "").replace(/\/+$/, "");
  }

  function initMenuToggle() {
    const btn = document.querySelector(".menu-toggle");
    const navList = document.querySelector(".site-nav ul");
    if (!btn || !navList) return;

    const mq = window.matchMedia("(max-width: 980px)");

    const closeMenu = () => {
      navList.classList.remove("open");
      document.body.classList.remove("menu-open");
      btn.setAttribute("aria-expanded", "false");
    };

    const openMenu = () => {
      navList.classList.add("open");
      document.body.classList.add("menu-open");
      btn.setAttribute("aria-expanded", "true");
    };

    btn.addEventListener("click", () => {
      if (navList.classList.contains("open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    navList.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (link && mq.matches) closeMenu();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    const handleViewportChange = (event) => {
      if (!event.matches) closeMenu();
    };

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handleViewportChange);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(handleViewportChange);
    }
  }

  function initSmoothScroll() {
    const currentPath = normalizePathname(window.location.pathname);
    const header = document.querySelector(".site-header");

    const resolveTarget = (hash) => {
      if (!hash) return null;

      try {
        return document.querySelector(decodeURIComponent(hash));
      } catch {
        return null;
      }
    };

    const scrollToTarget = (target, behavior = "smooth") => {
      if (!(target instanceof Element)) return;

      const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 12;

      window.scrollTo({
        top: Math.max(0, top),
        behavior
      });
    };

    document.querySelectorAll('a[href*="#"]').forEach((link) => {
      const rawHref = link.getAttribute("href");
      if (!rawHref || rawHref === "#") return;

      let url;
      try {
        url = new URL(rawHref, window.location.href);
      } catch {
        return;
      }

      if (!url.hash || normalizePathname(url.pathname) !== currentPath) return;

      link.addEventListener("click", (event) => {
        const target = resolveTarget(url.hash);
        if (!target) return;

        event.preventDefault();
        scrollToTarget(target);
        history.replaceState(null, "", url.hash);
      });
    });

    const syncHashScroll = (behavior = "auto") => {
      const target = resolveTarget(window.location.hash);
      if (!target) return;
      scrollToTarget(target, behavior);
    };

    window.addEventListener("hashchange", () => {
      window.requestAnimationFrame(() => syncHashScroll());
    });

    if (window.location.hash) {
      window.requestAnimationFrame(() => syncHashScroll());
    }
  }

  function initScrollSpy() {
    const currentPath = normalizePathname(window.location.pathname);
    const header = document.querySelector(".site-header");
    const entries = Array.from(document.querySelectorAll(".site-nav a")).map((link) => {
      const explicitTarget = link.dataset.scrollspyTarget?.trim();
      if (explicitTarget) {
        const section = document.getElementById(explicitTarget);
        return section ? { id: explicitTarget, link, section } : null;
      }

      const rawHref = link.getAttribute("href");
      if (!rawHref || !rawHref.includes("#")) return null;

      try {
        const url = new URL(rawHref, window.location.href);
        if (normalizePathname(url.pathname) !== currentPath || url.hash === "#") return null;

        const id = decodeURIComponent(url.hash.slice(1));
        const section = document.getElementById(id);
        return section ? { id, link, section } : null;
      } catch {
        return null;
      }
    });

    const scrollSpyEntries = entries.filter(Boolean);
    if (!scrollSpyEntries.length) return;

    const setActive = (activeId) => {
      scrollSpyEntries.forEach(({ id, link }) => {
        link.classList.toggle("active", id === activeId);
      });
    };

    const onScroll = () => {
      const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
      const marker = headerHeight + 24;
      let activeId = scrollSpyEntries[0].id;

      scrollSpyEntries.forEach(({ id, section }) => {
        if (section.getBoundingClientRect().top <= marker) {
          activeId = id;
        }
      });

      setActive(activeId);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }

  function initTeachingAccordions() {
    const section = document.getElementById("enseignements");
    if (!section) return;

    const groups = Array.from(section.querySelectorAll("[data-teaching-group]"));
    if (!groups.length) return;

    const expandButton = section.querySelector("[data-teaching-expand]");
    const collapseButton = section.querySelector("[data-teaching-collapse]");

    const getTargetFromHash = (hash) => {
      const id = hash ? decodeURIComponent(hash.replace(/^#/, "")) : "";
      return id ? document.getElementById(id) : null;
    };

    const openGroupForTarget = (target) => {
      if (!(target instanceof Element)) return;
      const group = target.closest("[data-teaching-group]");
      if (group) group.open = true;
    };

    const syncActionState = () => {
      const allOpen = groups.every((group) => group.open);
      const allClosed = groups.every((group) => !group.open);

      if (expandButton) expandButton.disabled = allOpen;
      if (collapseButton) collapseButton.disabled = allClosed;
    };

    groups.forEach((group) => {
      const countSlot = group.querySelector("[data-teaching-count]");
      const itemCount = group.querySelectorAll(".courses > .publication-item").length;

      if (countSlot) {
        countSlot.textContent = `${itemCount} enseignement${itemCount > 1 ? "s" : ""}`;
      }

      group.addEventListener("toggle", syncActionState);
    });

    if (expandButton) {
      expandButton.addEventListener("click", () => {
        groups.forEach((group) => {
          group.open = true;
        });
        syncActionState();
      });
    }

    if (collapseButton) {
      collapseButton.addEventListener("click", () => {
        groups.forEach((group) => {
          group.open = false;
        });
        syncActionState();
      });
    }

    section.querySelectorAll(".teaching-chip").forEach((link) => {
      link.addEventListener("click", () => {
        openGroupForTarget(getTargetFromHash(link.getAttribute("href")));
      });
    });

    const syncHashTarget = () => {
      openGroupForTarget(getTargetFromHash(window.location.hash));
      syncActionState();
    };

    window.addEventListener("hashchange", syncHashTarget);
    syncHashTarget();
  }

  function initFormValidation() {
    const form = document.querySelector("form");
    if (!form) return;

    form.addEventListener("submit", (event) => {
      const name = form.querySelector('[name="name"]')?.value.trim();
      const email = form.querySelector('[name="email"]')?.value.trim();
      const message = form.querySelector('[name="message"]')?.value.trim();

      if (!name || !email || !message) {
        event.preventDefault();
        window.alert("Veuillez remplir tous les champs.");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMenuToggle();
    initTeachingAccordions();
    initSmoothScroll();
    initScrollSpy();
    initFormValidation();
  });
})();
