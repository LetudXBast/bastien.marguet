/* Optional interactions: navigation, documents and native POST work without JS. */
(() => {
  "use strict";
  function initMenu() {
    const button = document.querySelector(".menu-toggle");
    const nav = document.getElementById("site-navigation");
    if (!button || !nav) return;
    const mobile = matchMedia("(max-width: 52rem)");
    let open = false;
    function render() {
      button.hidden = !mobile.matches;
      nav.hidden = mobile.matches && !open;
      button.setAttribute("aria-expanded", String(mobile.matches && open));
      button.textContent = open ? "Fermer le menu" : "Menu";
    }
    button.addEventListener("click", () => { open = !open; render(); });
    nav.addEventListener("click", event => {
      if (event.target.closest("a") && mobile.matches) { open = false; render(); }
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && open && mobile.matches) {
        open = false; render(); button.focus();
      }
    });
    document.addEventListener("click", event => {
      if (open && !nav.contains(event.target) && !button.contains(event.target)) { open = false; render(); }
    });
    mobile.addEventListener("change", () => { open = false; render(); });
    render();
  }

  function initContact() {
    const form = document.querySelector(".form-card");
    if (!form) return;
    const email = form.elements.namedItem("email");
    const message = form.elements.namedItem("message");
    const summary = document.getElementById("contact-errors");
    if (!email || !message || !summary) return;
    form.noValidate = true;
    function validate(field) {
      const error = document.getElementById(`${field.id}-error`);
      let text = "";
      if (!field.value.trim()) text = field === email ? "Indiquez une adresse e-mail pour que je puisse vous répondre." : "Décrivez votre demande dans le message.";
      else if (field === email && field.validity.typeMismatch) text = "Vérifiez l’adresse e-mail, par exemple prenom@exemple.fr.";
      error.textContent = text; error.hidden = !text;
      if (text) field.setAttribute("aria-invalid", "true");
      else field.removeAttribute("aria-invalid");
      return !text;
    }
    [email, message].forEach(field => {
      field.addEventListener("blur", () => validate(field));
      field.addEventListener("input", () => {
        if (field.hasAttribute("aria-invalid")) validate(field);
        summary.hidden = true;
      });
    });
    form.addEventListener("submit", event => {
      const invalid = [email, message].filter(field => !validate(field));
      summary.hidden = invalid.length === 0;
      if (invalid.length) {
        event.preventDefault();
        summary.textContent = "Votre message n’a pas été envoyé. Corrigez les champs indiqués ci-dessous.";
        invalid[0].focus();
      }
      // A valid request continues through the existing FormSubmit POST.
    });
  }

  function initCatalogue() {
    const form = document.querySelector("[data-catalogue-filter]");
    if (!form) return;
    const list = document.getElementById("catalogue-results");
    const items = [...document.querySelectorAll("[data-resource]")];
    const status = document.querySelector("[data-result-count]");
    const active = document.querySelector("[data-active-filters]");
    const empty = document.querySelector("[data-empty-results]");
    const pagination = document.querySelector("[data-pagination]");
    const previous = document.querySelector("[data-page-previous]");
    const next = document.querySelector("[data-page-next]");
    const pageStatus = document.querySelector("[data-page-status]");
    const fields = ["q", "niveau", "annee", "type", "tri"];
    const panel = document.querySelector("[data-filter-panel]");
    const panelCount = document.querySelector("[data-filter-count]");
    const mobileFilters = matchMedia("(max-width: 52rem)");
    const adaptFilters = () => { panel.open = !mobileFilters.matches; };
    mobileFilters.addEventListener("change", adaptFilters);
    adaptFilters();
    const field = name => form.elements.namedItem(name);
    const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const pageSize = 20;
    let page = 1;
    let debounce;
    let visible = [];
    function loadURL() {
      const params = new URLSearchParams(location.search);
      for (const name of fields) {
        const input = field(name);
        const value = params.get(name) || (name === "tri" ? "pedagogique" : "");
        input.value = name === "q" || [...input.options].some(option => option.value === value) ? value : "";
      }
      page = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);
    }
    function apply(updateURL = true, revealHash = false) {
      const values = Object.fromEntries(fields.map(name => [name, field(name).value.trim()]));
      const terms = normalize(values.q).split(/\s+/).filter(Boolean);
      const numberedPhrases = terms.flatMap((term, index) => index > 0 && /^\d{1,3}$/.test(term) && /^[a-z]+$/.test(terms[index - 1])
        ? [new RegExp(`\\b${terms[index - 1]}\\s+${term}\\b`)] : []);
      const matches = items.filter(item => {
        const text = normalize(item.dataset.search || item.textContent);
        return terms.every(term => text.includes(term)) && numberedPhrases.every(phrase => phrase.test(text)) &&
          (!values.niveau || item.dataset.level === values.niveau) && (!values.annee || item.dataset.year === values.annee) &&
          (!values.type || item.dataset.category === values.type);
      });
      const title = item => item.querySelector("h2 a")?.textContent || item.textContent;
      if (values.tri === "titre") matches.sort((a, b) => title(a).localeCompare(title(b), "fr", { numeric: true }));
      if (values.tri === "annee") matches.sort((a, b) => (b.dataset.year === "non-date" ? "" : b.dataset.year).localeCompare(a.dataset.year === "non-date" ? "" : a.dataset.year));
      let target = null;
      if (revealHash && location.hash) {
        try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch { /* Invalid fragment. */ }
        const index = matches.indexOf(target);
        if (index >= 0) page = Math.floor(index / pageSize) + 1;
      }
      const pages = Math.max(1, Math.ceil(matches.length / pageSize));
      page = Math.max(1, Math.min(page, pages));
      const start = (page - 1) * pageSize;
      visible = matches.slice(start, start + pageSize);
      items.forEach(item => { item.hidden = true; });
      [...matches, ...items.filter(item => !matches.includes(item))].forEach(item => list.append(item));
      visible.forEach(item => { item.hidden = false; });
      status.textContent = `${matches.length} ressource${matches.length > 1 ? "s" : ""} sur ${items.length}` +
        (matches.length ? ` · Documents ${start + 1} à ${Math.min(start + pageSize, matches.length)}` : "");
      empty.hidden = matches.length !== 0;
      const criteria = [];
      if (values.q) criteria.push(`« ${values.q} »`);
      for (const name of ["niveau", "annee", "type"]) if (values[name]) criteria.push(field(name).selectedOptions[0].textContent);
      active.textContent = criteria.length ? `Filtres : ${criteria.join(" · ")}` : "Toutes les ressources";
      const activeCount = ["niveau", "annee", "type"].filter(name => values[name]).length;
      panelCount.textContent = activeCount ? `(${activeCount} actif${activeCount > 1 ? "s" : ""})` : "";
      pagination.hidden = matches.length <= pageSize;
      previous.disabled = page === 1; next.disabled = page === pages;
      pageStatus.textContent = `Page ${page} sur ${pages}`;
      if (updateURL) {
        const params = new URLSearchParams();
        for (const name of fields) if (values[name] && !(name === "tri" && values[name] === "pedagogique")) params.set(name, values[name]);
        if (page > 1) params.set("page", String(page));
        const query = params.toString();
        history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
      }
      if (revealHash && target && !target.hidden) requestAnimationFrame(() => target.scrollIntoView());
    }
    function changeFilters() { page = 1; apply(); }
    form.addEventListener("submit", event => { event.preventDefault(); clearTimeout(debounce); changeFilters(); });
    form.addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(changeFilters, 400); });
    form.addEventListener("change", () => { clearTimeout(debounce); changeFilters(); });
    form.addEventListener("reset", () => {
      clearTimeout(debounce);
      setTimeout(() => { page = 1; apply(); field("q").focus(); }, 0);
    });
    document.querySelector("[data-clear-results]").addEventListener("click", () => form.reset());
    function goPage(delta) { page += delta; apply(); visible[0]?.querySelector("a")?.focus(); }
    previous.addEventListener("click", () => goPage(-1)); next.addEventListener("click", () => goPage(1));
    window.addEventListener("popstate", () => { loadURL(); apply(false, true); });
    window.addEventListener("hashchange", () => apply(false, true));
    window.addEventListener("pageshow", event => { if (event.persisted) { loadURL(); apply(false); } });
    loadURL(); apply(false, true); form.hidden = false;
  }
  initMenu(); initContact(); initCatalogue();
})();
