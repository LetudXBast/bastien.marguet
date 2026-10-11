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
      btn.setAttribute("aria-label", "Ouvrir le menu");
    };

    const openMenu = () => {
      navList.classList.add("open");
      document.body.classList.add("menu-open");
      btn.setAttribute("aria-expanded", "true");
      btn.setAttribute("aria-label", "Fermer le menu");
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
      if (event.key === "Escape" && navList.classList.contains("open")) {
        closeMenu();
        btn.focus();
      }
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
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : behavior
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

        if (url.origin !== window.location.origin || !url.hash || normalizePathname(url.pathname) !== currentPath) return;

      link.addEventListener("click", (event) => {
        const target = resolveTarget(url.hash);
        if (!target) return;

        event.preventDefault();
        scrollToTarget(target);
        if (link.classList.contains("skip-link")) target.focus({ preventScroll: true });
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
    const getActiveId = (entries, marker) => {
      let activeEntry = null;
      let nextEntry = null;

      entries.forEach((entry) => {
        const top = entry.section.getBoundingClientRect().top;

        if (top <= marker) {
          if (!activeEntry || top > activeEntry.top) {
            activeEntry = { id: entry.id, top };
          }
        } else if (!nextEntry || top < nextEntry.top) {
          nextEntry = { id: entry.id, top };
        }
      });

      return activeEntry?.id ?? nextEntry?.id ?? entries[0]?.id ?? "";
    };

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
        if (id === activeId) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    };

    const onScroll = () => {
      const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
      const marker = headerHeight + 24;
      const activeId = getActiveId(scrollSpyEntries, marker);
      setActive(activeId);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }

  function initResourceTocSpy() {
    const sidebar = document.querySelector(".resource-sidebar");
    if (!sidebar) return;

    const header = document.querySelector(".site-header");
    const tocLinks = Array.from(sidebar.querySelectorAll('.chip[href^="#"]'));
    const entries = tocLinks.map((link) => {
      const rawHref = link.getAttribute("href");
      if (!rawHref) return null;

      const id = decodeURIComponent(rawHref.replace(/^#/, ""));
      const section = document.getElementById(id);
      return section ? { id, link, section } : null;
    }).filter(Boolean);

    if (!entries.length) return;

    const setActive = (activeId) => {
      entries.forEach(({ id, link }) => {
        const isActive = id === activeId;
        link.classList.toggle("active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };

    const onScroll = () => {
      const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
      const marker = headerHeight + 24;
      let activeEntry = null;
      let nextEntry = null;

      entries.forEach((entry) => {
        if (entry.section.hidden) return;
        const top = entry.section.getBoundingClientRect().top;

        if (top <= marker) {
          if (!activeEntry || top > activeEntry.top) {
            activeEntry = { id: entry.id, top };
          }
        } else if (!nextEntry || top < nextEntry.top) {
          nextEntry = { id: entry.id, top };
        }
      });

      setActive(activeEntry?.id ?? nextEntry?.id ?? entries[0].id);
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

  function initResourceSearch() {
    const input = document.getElementById("resource-search");
    const status = document.getElementById("search-status");
    if (!input || !status) return;
    const sections = Array.from(document.querySelectorAll(".resource-section"));
    const groups = Array.from(document.querySelectorAll("[data-teaching-group]"));
    let savedOpen = null;
    const normalize = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
    input.addEventListener("input", () => {
      const words = normalize(input.value.trim()).split(/\s+/).filter(Boolean);
      const matches = (text) => words.every((word) => normalize(text).includes(word));
      if (words.length && !savedOpen) savedOpen = groups.map((group) => group.open);
      let count = 0;
      sections.forEach((section) => {
        const headingMatch = matches(section.querySelector(".section-head")?.textContent || "");
        section.querySelectorAll(".publication-item, .cv-item, .research-item, .media-card, .section-sub, .list-clean > li").forEach((item) => {
          item.hidden = words.length > 0 && !headingMatch && !matches(item.textContent);
        });
        section.hidden = words.length > 0 && !matches(section.textContent);
        if (!section.hidden) count++;
        const link = document.querySelector(`.resource-sidebar a[href="#${section.id}"]`);
        if (link) link.hidden = section.hidden;
      });
      groups.forEach((group, index) => {
        const items = Array.from(group.querySelectorAll(".courses > .publication-item"));
        const headingMatch = matches(group.querySelector("summary").textContent);
        if (words.length && headingMatch) items.forEach((item) => { item.hidden = false; });
        group.hidden = words.length > 0 && !headingMatch && items.every((item) => item.hidden);
        if (words.length) group.open = !group.hidden;
        else if (savedOpen) group.open = savedOpen[index];
      });
      if (!words.length) savedOpen = null;
      status.textContent = !words.length ? "Toutes les ressources sont affichées." : count
        ? `${count} rubrique${count > 1 ? "s" : ""} correspond${count > 1 ? "ent" : ""} à votre recherche.`
        : "Aucun résultat. Essayez un autre mot ou effacez la recherche.";
      window.dispatchEvent(new Event("scroll"));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMenuToggle();
    initTeachingAccordions();
    initSmoothScroll();
    initScrollSpy();
    initResourceTocSpy();
    initResourceSearch();
    initFormValidation();
  });
})();
