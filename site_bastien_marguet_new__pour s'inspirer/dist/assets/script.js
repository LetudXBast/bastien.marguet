/* Enrichissement facultatif : toutes les ressources sont déjà présentes en HTML. */
(() => {
  "use strict";
  const form = document.querySelector("[data-catalogue-filter]");
  if (!form) return;
  const items = Array.from(document.querySelectorAll("[data-resource]"));
  const status = document.querySelector("[data-result-count]");
  const active = document.querySelector("[data-active-filters]");
  const empty = document.querySelector("[data-empty-results]");
  const fields = ["q", "niveau", "annee", "type"];
  const normalize = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const field = name => form.elements.namedItem(name);
  let debounce;
  function loadURL() {
    const params = new URLSearchParams(location.search);
    for (const name of fields) {
      const input = field(name);
      const value = params.get(name) || "";
      input.value = name === "q" || Array.from(input.options).some(o => o.value === value) ? value : "";
    }
  }
  function apply(updateURL = true) {
    const values = Object.fromEntries(fields.map(name => [name, field(name).value.trim()]));
    const terms = normalize(values.q).split(/\s+/).filter(Boolean);
    // Un numéro de sujet reste associé à son intitulé : « interro 1 »
    // ne doit pas sélectionner « interro 2 » au seul motif du niveau BUT 1.
    const numberedPhrases = terms.flatMap((term, index) =>
      index > 0 && /^\d{1,3}$/.test(term) && /^[a-z]+$/.test(terms[index - 1])
        ? [new RegExp(`\\b${terms[index - 1]}\\s+${term}\\b`)] : []);
    let count = 0;
    for (const item of items) {
      const text = normalize(item.dataset.search || item.textContent);
      const matches = terms.every(term => text.includes(term)) && numberedPhrases.every(phrase => phrase.test(text)) &&
        (!values.niveau || item.dataset.level === values.niveau) &&
        (!values.annee || item.dataset.year === values.annee) &&
        (!values.type || item.dataset.category === values.type);
      item.hidden = !matches;
      if (matches) count++;
    }
    status.textContent = `${count} ressource${count > 1 ? "s" : ""} sur ${items.length}`;
    empty.hidden = count !== 0;
    const criteria = [];
    if (values.q) criteria.push(`« ${values.q} »`);
    for (const name of fields.slice(1)) {
      if (values[name]) criteria.push(field(name).selectedOptions[0].textContent);
    }
    active.textContent = criteria.length ? `Filtres : ${criteria.join(" · ")}` : "Toutes les ressources";
    if (updateURL) {
      const params = new URLSearchParams();
      for (const name of fields) if (values[name]) params.set(name, values[name]);
      const query = params.toString();
      history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
    }
  }
  form.addEventListener("submit", event => { event.preventDefault(); clearTimeout(debounce); apply(); });
  form.addEventListener("input", () => { clearTimeout(debounce); debounce = setTimeout(() => apply(), 150); });
  form.addEventListener("change", () => { clearTimeout(debounce); apply(); });
  form.addEventListener("reset", () => {
    clearTimeout(debounce);
    setTimeout(() => { apply(); field("q").focus(); }, 0);
  });
  window.addEventListener("popstate", () => { loadURL(); apply(false); });
  loadURL();
  apply(false);
  form.hidden = false;
})();
