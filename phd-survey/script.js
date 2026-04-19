const APP_CONFIG = {
  appScriptUrl: "https://script.google.com/macros/s/AKfycbz6UW7cIb7mtocT-eZSt42cL8l-4XbOLaecWXNJajrEajmC8cDS3zdl3BLgcGk0xbQGrA/exec",
  storageKey: "phd-valuable-skills-survey-v1",
  totalQuestions: 13,
  verificationAttempts: 3,
  verificationDelayMs: 700,
  jsonpTimeoutMs: 6000
};

const NEUTRAL_INPUT_PLACEHOLDER = "Enter your answer";
const NEUTRAL_TEXTAREA_PLACEHOLDER = "Write your answer here";

// Survey configuration
const SURVEY_STEPS = [
  {
    id: "masters_field",
    category: "Background information",
    prompt: "What was your Master's field?",
    type: "choice",
    options: [
      "Physics / Chemistry",
      "Biology / Health",
      "Computer Science / Data",
      "Engineering",
      "Social Sciences / Humanities",
      "Other"
    ]
  },
  {
    id: "phd_field",
    category: "Background information",
    prompt: "What is your PhD field?",
    type: "choice",
    options: [
      "Physics / Chemistry",
      "Biology / Health",
      "Computer Science / Data",
      "Engineering",
      "Social Sciences / Humanities",
      "Other"
    ]
  },
  {
    id: "current_position",
    category: "Background information",
    prompt: "What is your current position?",
    type: "choice",
    options: [
      "PhD student",
      "Postdoc",
      "Researcher / Lecturer",
      "Other"
    ]
  },
  {
    id: "phd_type",
    category: "Background information",
    prompt: "What type of PhD are you doing / did you do?",
    type: "choice",
    optional: true,
    note: "Optional question. You can leave it blank if it does not apply.",
    options: [
      "Academic PhD",
      "Industrial PhD (CIFRE or equivalent)",
      "Other / Not sure"
    ]
  },
  {
    id: "employability_score",
    category: "Main questions",
    prompt: "On a scale from 1 to 10, how employable do you feel outside academia today?",
    type: "scale",
    scaleLabels: ["Less employable", "More employable"],
    min: 1,
    max: 10
  },
  {
    id: "clearly_employable",
    category: "Main questions",
    prompt: "Do you consider yourself clearly employable outside academia today?",
    type: "choice",
    options: ["Yes", "No"]
  },
  {
    id: "target_role",
    category: "Main questions",
    prompt: "If yes, for which type of role (be as precise as possible)?",
    type: "text",
    placeholder: NEUTRAL_INPUT_PLACEHOLDER,
    dynamicNote: (answers) =>
      answers.clearly_employable === "No"
        ? "If not clearly employable yet, you can indicate a role you think might fit you in the future."
        : ""
  },
  {
    id: "main_contributions",
    category: "Main questions",
    prompt: "In that role, what would be your two main contributions?",
    type: "multiText",
    fields: [
      {
        id: "main_contribution_1",
        label: "Contribution 1",
        placeholder: NEUTRAL_INPUT_PLACEHOLDER
      },
      {
        id: "main_contribution_2",
        label: "Contribution 2",
        placeholder: NEUTRAL_INPUT_PLACEHOLDER
      }
    ]
  },
  {
    id: "phd_skills",
    category: "Main questions",
    prompt: "List your 3 main skills developed during your PhD.",
    type: "multiText",
    fields: [
      {
        id: "phd_skill_1",
        label: "Skill 1",
        placeholder: NEUTRAL_INPUT_PLACEHOLDER
      },
      {
        id: "phd_skill_2",
        label: "Skill 2",
        placeholder: NEUTRAL_INPUT_PLACEHOLDER
      },
      {
        id: "phd_skill_3",
        label: "Skill 3",
        placeholder: NEUTRAL_INPUT_PLACEHOLDER
      }
    ]
  },
  {
    id: "confidence_in_skills",
    category: "Main questions",
    prompt: "How confident are you in these skills?",
    type: "scale",
    scaleLabels: ["Less confident", "More confident"],
    min: 1,
    max: 10
  },
  {
    id: "value_for_company",
    category: "Main questions",
    prompt: "In 2 sentences max: what value do you bring to a company?",
    type: "textarea",
    placeholder: NEUTRAL_TEXTAREA_PLACEHOLDER,
    note: "Maximum: 2 sentences."
  },
  {
    id: "recruiter_words",
    category: "Main questions",
    prompt: "In your opinion, what 3 words do recruiters associate with PhD graduates?",
    type: "multiText",
    fields: [
      {
        id: "recruiter_word_1",
        label: "Word 1",
        placeholder: NEUTRAL_INPUT_PLACEHOLDER
      },
      {
        id: "recruiter_word_2",
        label: "Word 2",
        placeholder: NEUTRAL_INPUT_PLACEHOLDER
      },
      {
        id: "recruiter_word_3",
        label: "Word 3",
        placeholder: NEUTRAL_INPUT_PLACEHOLDER
      }
    ]
  },
  {
    id: "felt_misunderstood",
    category: "Main questions",
    prompt: "Have you ever explained your PhD to a non-expert and felt misunderstood?",
    type: "choice",
    options: ["Yes", "No"]
  }
];

const PAYLOAD_KEYS = [
  "masters_field",
  "phd_field",
  "current_position",
  "phd_type",
  "employability_score",
  "clearly_employable",
  "target_role",
  "main_contribution_1",
  "main_contribution_2",
  "phd_skill_1",
  "phd_skill_2",
  "phd_skill_3",
  "confidence_in_skills",
  "value_for_company",
  "recruiter_word_1",
  "recruiter_word_2",
  "recruiter_word_3",
  "felt_misunderstood"
];

// State management
const appElement = document.getElementById("survey-app");
let state = loadState();

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  if (!state.submissionId) {
    state.submissionId = generateSubmissionId();
    persistState();
  }

  window.addEventListener("pageshow", handlePageShow);
  window.addEventListener("popstate", handlePopState);
  render();
}

function defaultState() {
  return {
    started: false,
    currentQuestionIndex: 0,
    answers: {},
    submissionId: "",
    touched: false,
    isSubmitting: false,
    submitError: "",
    submittedAt: ""
  };
}

function loadState() {
  const fallback = defaultState();

  try {
    const raw = sessionStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    return {
      ...fallback,
      ...parsed,
      currentQuestionIndex: sanitizeQuestionIndex(parsed.currentQuestionIndex),
      answers: parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {}
    };
  } catch (error) {
    return fallback;
  }
}

function persistState() {
  sessionStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(state));
}

function sanitizeQuestionIndex(value) {
  const index = Number(value);
  if (!Number.isInteger(index) || index < 0) {
    return 0;
  }

  return Math.min(index, SURVEY_STEPS.length - 1);
}

function getCurrentStep() {
  return SURVEY_STEPS[state.currentQuestionIndex];
}

function resetTouchState() {
  state.touched = false;
}

// Rendering logic
function render() {
  syncHistoryState();

  if (state.submittedAt) {
    appElement.innerHTML = renderThankYouScreen();
    bindThankYouEvents();
    return;
  }

  if (!state.started) {
    appElement.innerHTML = renderWelcomeScreen();
    bindWelcomeEvents();
    return;
  }

  const step = getCurrentStep();
  appElement.innerHTML = renderQuestionScreen(step, state.currentQuestionIndex);
  bindQuestionEvents();
  refreshQuestionState();
}

function renderWelcomeScreen() {
  return `
    <section class="survey-card" aria-labelledby="survey-title">
      <header class="hero-header">
        <div class="eyebrow-row">
          <span class="eyebrow">Workshop survey</span>
          <span class="badge">13 questions</span>
        </div>
        <h1 id="survey-title" class="hero-title">PhD: Valuable Skills, Invisible Value</h1>
        <p class="hero-subtitle">
          This short survey explores how PhD researchers perceive their employability, skills,
          and ability to express their value outside academia.
        </p>
        <p class="hero-subtitle">
          This survey is shared as part of the workshop presented during
          <a class="survey-link" href="https://intcha26.sciencesconf.org/" target="_blank" rel="noopener noreferrer">INTCHA 2026</a>.
        </p>
        <p class="hero-subtitle">
          It takes about 3 to 5 minutes. Responses are anonymous unless explicitly stated otherwise.
        </p>
      </header>

      <div class="hero-grid" aria-hidden="true">
        <div class="meta-card">
          <span class="meta-label">Format</span>
          <span class="meta-value">One question at a time</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Duration</span>
          <span class="meta-value">3-5 minutes</span>
        </div>
        <div class="meta-card">
          <span class="meta-label">Privacy</span>
          <span class="meta-value">Anonymous by default</span>
        </div>
      </div>

      <div class="hero-actions">
        <p class="hero-note">Once a step is validated, earlier answers stay locked.</p>
        <button type="button" class="primary-button" id="start-survey-button">Start survey</button>
      </div>
    </section>
  `;
}

function renderQuestionScreen(step, index) {
  const questionNumber = index + 1;
  const progressValue = Math.round((questionNumber / APP_CONFIG.totalQuestions) * 100);
  const validation = validateStep(step, state.answers);
  const showValidation = state.touched && !validation.valid;
  const isLastQuestion = index === SURVEY_STEPS.length - 1;
  const stepNote = resolveStepNote(step);

  return `
    <section class="survey-card" aria-labelledby="question-title">
      <header class="card-header">
        <div class="eyebrow-row">
          <span class="eyebrow">${escapeHtml(step.category)}</span>
          ${step.optional ? '<span class="badge">Optional</span>' : ""}
        </div>

        <div class="progress-block">
          <div class="progress-meta">
            <span>Question ${questionNumber} of ${APP_CONFIG.totalQuestions}</span>
            <span>${progressValue}%</span>
          </div>
          <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressValue}">
            <span class="progress-fill" style="width: ${progressValue}%"></span>
          </div>
        </div>

        <h1 id="question-title" class="card-title">${escapeHtml(step.prompt)}</h1>
        ${stepNote ? `<p class="card-note">${escapeHtml(stepNote)}</p>` : ""}
      </header>

      <form id="survey-form" class="question-form" novalidate>
        ${renderStepFields(step)}

        <div class="message-area">
          <p class="inline-message ${showValidation ? "is-visible" : ""}" data-role="validation-message">
            ${showValidation ? escapeHtml(validation.message) : ""}
          </p>
          <p class="submit-message ${state.submitError ? "is-error" : ""}" data-role="submit-message">
            ${state.submitError ? escapeHtml(state.submitError) : ""}
          </p>
        </div>

        <div class="actions">
          <p class="submission-note">Progress is saved for this browser tab only.</p>
          <button
            type="submit"
            class="primary-button"
            data-role="next-button"
            ${validation.valid && !state.isSubmitting ? "" : "disabled"}
          >
            ${state.isSubmitting ? "Submitting..." : isLastQuestion ? "Submit survey" : "Continue"}
          </button>
        </div>
      </form>
    </section>
  `;
}

function renderStepFields(step) {
  switch (step.type) {
    case "choice":
      return renderChoiceField(step);
    case "scale":
      return renderScaleField(step);
    case "text":
      return renderTextField(step);
    case "multiText":
      return renderMultiTextField(step);
    case "textarea":
      return renderTextareaField(step);
    default:
      return "";
  }
}

function renderChoiceField(step) {
  const selectedValue = readAnswer(step.id);
  const singleColumn = step.options.length <= 3;

  return `
    <fieldset class="field-group">
      <legend class="sr-only">${escapeHtml(step.prompt)}</legend>
      <div class="choice-grid ${singleColumn ? "is-single-column" : ""}">
        ${step.options
          .map((option) => {
            const optionId = `${step.id}-${slugify(option)}`;
            const checked = selectedValue === option ? "checked" : "";
            return `
              <label class="choice-card" for="${optionId}">
                <input
                  class="choice-input"
                  type="radio"
                  id="${optionId}"
                  name="${step.id}"
                  value="${escapeHtml(option)}"
                  ${checked}
                >
                <span class="choice-content">${escapeHtml(option)}</span>
              </label>
            `;
          })
          .join("")}
      </div>
      ${
        step.optional
          ? `
            <div class="actions">
              <button type="button" class="secondary-button optional-button" data-action="clear-optional">
                Clear selection
              </button>
            </div>
          `
          : ""
      }
    </fieldset>
  `;
}

function renderScaleField(step) {
  const selectedValue = readAnswer(step.id);
  const values = Array.from({ length: step.max - step.min + 1 }, (_, offset) => String(step.min + offset));
  const scaleLabels = Array.isArray(step.scaleLabels) ? step.scaleLabels : ["Lower", "Higher"];

  return `
    <fieldset class="field-group">
      <legend class="sr-only">${escapeHtml(step.prompt)}</legend>
      <div class="scale-shell">
        <div class="scale-labels">
          <span>${escapeHtml(scaleLabels[0])}</span>
          <span>${escapeHtml(scaleLabels[1])}</span>
        </div>
        <div class="scale-grid">
          ${values
            .map((value) => {
              const inputId = `${step.id}-${value}`;
              const checked = selectedValue === value ? "checked" : "";
              return `
                <label class="scale-card" for="${inputId}">
                  <input
                    class="scale-input"
                    type="radio"
                    id="${inputId}"
                    name="${step.id}"
                    value="${value}"
                    ${checked}
                  >
                  <span class="scale-content">${value}</span>
                </label>
              `;
            })
            .join("")}
        </div>
      </div>
    </fieldset>
  `;
}

function renderTextField(step) {
  return `
    <div class="field-stack">
      <div class="field-block">
        <label class="field-label" for="${step.id}">Your answer</label>
        <input
          class="text-input"
          type="text"
          id="${step.id}"
          name="${step.id}"
          placeholder="${escapeHtml(step.placeholder || "")}"
          value="${escapeHtml(readAnswer(step.id))}"
          autocomplete="off"
          maxlength="240"
        >
      </div>
    </div>
  `;
}

function renderMultiTextField(step) {
  return `
    <div class="field-stack">
      ${step.fields
        .map(
          (field) => `
            <div class="field-block">
              <label class="field-label" for="${field.id}">${escapeHtml(field.label)}</label>
              <input
                class="text-input"
                type="text"
                id="${field.id}"
                name="${field.id}"
                placeholder="${escapeHtml(field.placeholder || "")}"
                value="${escapeHtml(readAnswer(field.id))}"
                autocomplete="off"
                maxlength="220"
              >
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTextareaField(step) {
  const value = readAnswer(step.id);
  const sentenceCount = countSentences(value);

  return `
    <div class="field-stack">
      <div class="field-block">
        <label class="field-label" for="${step.id}">Your answer</label>
        <textarea
          class="text-area"
          id="${step.id}"
          name="${step.id}"
          rows="6"
          placeholder="${escapeHtml(step.placeholder || "")}"
          maxlength="700"
        >${escapeHtml(value)}</textarea>
        <div class="textarea-meta">
          <span>${escapeHtml(step.note || "")}</span>
          <span class="sentence-counter ${sentenceCount > 2 ? "is-over" : ""}" data-role="sentence-counter">
            ${getSentenceCounterLabel(sentenceCount)}
          </span>
        </div>
      </div>
    </div>
  `;
}

function renderThankYouScreen() {
  return `
    <section class="survey-card is-success" aria-labelledby="thank-you-title">
      <div class="success-block">
        <span class="success-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5.5 12.5L10 17L18.5 8.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>
        </span>

        <div>
          <div class="eyebrow-row">
            <span class="eyebrow">Submission complete</span>
          </div>
          <h1 id="thank-you-title" class="hero-title">Thank you for your response.</h1>
          <p class="hero-subtitle">
            Your response has been recorded successfully for this workshop survey.
          </p>
          <p class="hero-subtitle">
            This contribution was collected in the context of
            <a class="survey-link" href="https://intcha26.sciencesconf.org/" target="_blank" rel="noopener noreferrer">INTCHA 2026</a>.
          </p>
        </div>

        <div class="success-panel">
          <p>This browser session is now locked to help avoid duplicate submissions.</p>
        </div>

        <p class="hero-note">
          You can safely close this page. Refreshing will keep the confirmation screen.
        </p>
      </div>
    </section>
  `;
}

// Validation logic
function validateStep(step, answers) {
  switch (step.type) {
    case "choice":
      return validateChoiceStep(step, answers);
    case "scale":
      return validateScaleStep(step, answers);
    case "text":
      return validateTextStep(step, answers);
    case "multiText":
      return validateMultiTextStep(step, answers);
    case "textarea":
      return validateTextareaStep(step, answers);
    default:
      return { valid: true, message: "" };
  }
}

function validateChoiceStep(step, answers) {
  const value = normalizeText(readAnswer(step.id, answers));

  if (step.optional && value === "") {
    return { valid: true, message: "" };
  }

  if (!step.options.includes(value)) {
    return {
      valid: false,
      message: step.optional ? "Select one option or leave this question blank." : "Please select one option to continue."
    };
  }

  return { valid: true, message: "" };
}

function validateScaleStep(step, answers) {
  const value = Number(readAnswer(step.id, answers));
  const isValid = Number.isInteger(value) && value >= step.min && value <= step.max;

  return isValid
    ? { valid: true, message: "" }
    : { valid: false, message: "Please choose one value to continue." };
}

function validateTextStep(step, answers) {
  const value = normalizeText(readAnswer(step.id, answers));
  return value
    ? { valid: true, message: "" }
    : { valid: false, message: "Please enter a response before continuing." };
}

function validateMultiTextStep(step, answers) {
  const allFilled = step.fields.every((field) => normalizeText(readAnswer(field.id, answers)));
  return allFilled
    ? { valid: true, message: "" }
    : { valid: false, message: "Please complete all fields before continuing." };
}

function validateTextareaStep(step, answers) {
  const value = normalizeText(readAnswer(step.id, answers));

  if (!value) {
    return { valid: false, message: "Please enter a response before continuing." };
  }

  const sentenceCount = countSentences(value);
  if (sentenceCount > 2) {
    return { valid: false, message: "Please keep this answer to two sentences maximum." };
  }

  return { valid: true, message: "" };
}

// Navigation logic
function bindWelcomeEvents() {
  const startButton = document.getElementById("start-survey-button");
  if (!startButton) {
    return;
  }

  startButton.addEventListener("click", startSurvey);
}

function bindQuestionEvents() {
  const form = document.getElementById("survey-form");
  if (!form) {
    return;
  }

  form.addEventListener("submit", handleQuestionSubmit);
  form.addEventListener("input", handleFieldInput);
  form.addEventListener("change", handleFieldChange);
  form.addEventListener("focusout", handleFieldBlur);

  const clearButton = form.querySelector('[data-action="clear-optional"]');
  if (clearButton) {
    clearButton.addEventListener("click", handleOptionalClear);
  }
}

function bindThankYouEvents() {
  syncHistoryState();
}

function startSurvey() {
  state.started = true;
  state.currentQuestionIndex = 0;
  state.submitError = "";
  state.submittedAt = "";
  if (!state.submissionId) {
    state.submissionId = generateSubmissionId();
  }
  resetTouchState();
  persistState();
  render();
}

function handleFieldInput(event) {
  updateAnswerFromInput(event.target);
  state.submitError = "";

  if (event.target.name === "value_for_company") {
    state.touched = true;
  }

  persistState();
  refreshQuestionState();
}

function handleFieldChange(event) {
  updateAnswerFromInput(event.target);
  state.touched = true;
  state.submitError = "";
  persistState();
  refreshQuestionState();
}

function handleFieldBlur(event) {
  if (!isFormField(event.target)) {
    return;
  }

  state.touched = true;
  refreshQuestionState();
}

function handleOptionalClear() {
  const step = getCurrentStep();
  if (!step || !step.optional) {
    return;
  }

  state.answers[step.id] = "";
  state.submitError = "";
  resetTouchState();
  persistState();
  render();
}

async function handleQuestionSubmit(event) {
  event.preventDefault();

  const step = getCurrentStep();
  const validation = validateStep(step, state.answers);
  state.touched = true;
  refreshQuestionState();

  if (!validation.valid || state.isSubmitting) {
    return;
  }

  commitCurrentStep(step);
  state.submitError = "";
  persistState();

  const isLastQuestion = state.currentQuestionIndex === SURVEY_STEPS.length - 1;
  if (isLastQuestion) {
    await submitSurvey();
    return;
  }

  state.currentQuestionIndex += 1;
  resetTouchState();
  persistState();
  render();
}

function handlePageShow(event) {
  if (event.persisted) {
    state = loadState();
    render();
  }
}

function handlePopState() {
  syncHistoryState();
  render();
}

function syncHistoryState() {
  try {
    history.replaceState(
      {
        survey: true,
        started: state.started,
        step: state.submittedAt ? "submitted" : state.started ? state.currentQuestionIndex : "welcome"
      },
      document.title
    );
  } catch (error) {
    // Ignore history API errors in restrictive environments.
  }
}

function refreshQuestionState() {
  const step = getCurrentStep();
  if (!step) {
    return;
  }

  const validation = validateStep(step, state.answers);
  const validationMessage = appElement.querySelector('[data-role="validation-message"]');
  const submitMessage = appElement.querySelector('[data-role="submit-message"]');
  const nextButton = appElement.querySelector('[data-role="next-button"]');
  const sentenceCounter = appElement.querySelector('[data-role="sentence-counter"]');

  if (validationMessage) {
    const visible = state.touched && !validation.valid;
    validationMessage.textContent = visible ? validation.message : "";
    validationMessage.classList.toggle("is-visible", visible);
  }

  if (submitMessage) {
    submitMessage.textContent = state.submitError || "";
    submitMessage.classList.toggle("is-error", Boolean(state.submitError));
  }

  if (nextButton) {
    nextButton.disabled = !validation.valid || state.isSubmitting;
    nextButton.textContent = state.isSubmitting
      ? "Submitting..."
      : state.currentQuestionIndex === SURVEY_STEPS.length - 1
        ? "Submit survey"
        : "Continue";
  }

  if (sentenceCounter && step.type === "textarea") {
    const sentenceCount = countSentences(readAnswer(step.id));
    sentenceCounter.textContent = getSentenceCounterLabel(sentenceCount);
    sentenceCounter.classList.toggle("is-over", sentenceCount > 2);
  }
}

// Submission logic
async function submitSurvey() {
  state.isSubmitting = true;
  state.submitError = "";
  persistState();
  refreshQuestionState();

  const payload = buildSubmissionPayload();

  try {
    const attempt = await submitPayload(payload);

    if (attempt.outcome === "success") {
      finalizeSuccessfulSubmission();
      return;
    }

    const wasRecorded = await verifySubmissionRecorded(payload.submission_id);
    if (wasRecorded) {
      finalizeSuccessfulSubmission();
      return;
    }

    throw new Error(
      attempt.message || "We could not confirm your submission. Please try again."
    );
  } catch (error) {
    state.isSubmitting = false;
    state.submitError = error.message || "We could not confirm your submission. Please try again.";
    persistState();
    refreshQuestionState();
  }
}

function finalizeSuccessfulSubmission() {
  state.isSubmitting = false;
  state.submitError = "";
  state.submittedAt = new Date().toISOString();
  persistState();
  render();
}

async function submitPayload(payload) {
  try {
    return await submitWithReadableResponse(payload);
  } catch (error) {
    if (!isLikelyCrossOriginIssue(error)) {
      return {
        outcome: "uncertain",
        message: "We could not confirm your submission automatically."
      };
    }

    await submitWithNoCorsFallback(payload);
    return { outcome: "uncertain" };
  }
}

async function submitWithReadableResponse(payload) {
  // `text/plain` keeps the request "simple", which avoids a preflight request
  // that Google Apps Script web apps do not reliably handle for static sites.
  const response = await fetch(APP_CONFIG.appScriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload),
    redirect: "follow",
    cache: "no-store"
  });

  const rawText = await response.text();
  const parsed = parseSubmissionResponse(rawText);

  if (parsed && parsed.status === "success") {
    return {
      outcome: "success",
      parsed
    };
  }

  if (parsed && parsed.status === "error") {
    return {
      outcome: "error",
      message: parsed.error || "The survey response could not be recorded."
    };
  }

  if (response.ok) {
    return {
      outcome: "uncertain"
    };
  }

  return {
    outcome: "uncertain",
    message: "We could not confirm your submission automatically."
  };
}

async function submitWithNoCorsFallback(payload) {
  await fetch(APP_CONFIG.appScriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload),
    redirect: "follow",
    cache: "no-store",
    keepalive: true
  });
}

async function verifySubmissionRecorded(submissionId) {
  for (let attempt = 0; attempt < APP_CONFIG.verificationAttempts; attempt += 1) {
    try {
      const result = await requestSubmissionStatus(submissionId);
      if (result && result.status === "success" && result.found === true) {
        return true;
      }
    } catch (error) {
      // Retry quietly; the final failure will be handled by the caller.
    }

    if (attempt < APP_CONFIG.verificationAttempts - 1) {
      await wait(APP_CONFIG.verificationDelayMs);
    }
  }

  return false;
}

function requestSubmissionStatus(submissionId) {
  return new Promise((resolve, reject) => {
    const callbackName = `surveyStatusCallback_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const script = document.createElement("script");
    const statusUrl = new URL(APP_CONFIG.appScriptUrl);
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Status check timed out."));
    }, APP_CONFIG.jsonpTimeoutMs);

    statusUrl.searchParams.set("action", "status");
    statusUrl.searchParams.set("submission_id", submissionId);
    statusUrl.searchParams.set("prefix", callbackName);

    function cleanup() {
      window.clearTimeout(timeoutId);
      delete window[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };

    script.async = true;
    script.src = statusUrl.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error("Status check failed."));
    };

    document.body.appendChild(script);
  });
}

function parseSubmissionResponse(rawText) {
  const trimmed = normalizeText(rawText);
  if (!trimmed) {
    return null;
  }

  const direct = tryParseJson(trimmed);
  if (direct) {
    return direct;
  }

  const jsonStart = trimmed.indexOf("{");
  const jsonEnd = trimmed.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd <= jsonStart) {
    return null;
  }

  return tryParseJson(trimmed.slice(jsonStart, jsonEnd + 1));
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function buildSubmissionPayload() {
  const payload = {
    submission_id: state.submissionId
  };

  PAYLOAD_KEYS.forEach((key) => {
    const value = state.answers[key];

    if (key === "employability_score" || key === "confidence_in_skills") {
      payload[key] = value ? Number(value) : "";
      return;
    }

    payload[key] = typeof value === "string" ? value : "";
  });

  return payload;
}

// Helper utilities
function updateAnswerFromInput(target) {
  if (!isFormField(target) || !target.name) {
    return;
  }

  if (target.type === "radio") {
    state.answers[target.name] = target.value;
    return;
  }

  state.answers[target.name] = target.value;
}

function commitCurrentStep(step) {
  if (step.type === "multiText") {
    step.fields.forEach((field) => {
      state.answers[field.id] = normalizeText(readAnswer(field.id));
    });
    return;
  }

  if (step.type === "text" || step.type === "textarea") {
    state.answers[step.id] = normalizeText(readAnswer(step.id));
    return;
  }

  if (step.optional && !readAnswer(step.id)) {
    state.answers[step.id] = "";
    return;
  }

  state.answers[step.id] = String(readAnswer(step.id));
}

function resolveStepNote(step) {
  if (typeof step.dynamicNote === "function") {
    return step.dynamicNote(state.answers);
  }

  return step.note || "";
}

function readAnswer(key, answers = state.answers) {
  const value = answers[key];
  return typeof value === "string" ? value : "";
}

function normalizeText(value) {
  return String(value || "").trim();
}

function countSentences(value) {
  const normalized = normalizeText(value).replace(/\s+/g, " ");
  if (!normalized) {
    return 0;
  }

  const matches = normalized.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  return matches ? matches.map((entry) => entry.trim()).filter(Boolean).length : 0;
}

function getSentenceCounterLabel(sentenceCount) {
  if (sentenceCount === 0) {
    return "0 / 2 sentences";
  }

  return `${sentenceCount} / 2 sentences`;
}

function isLikelyCrossOriginIssue(error) {
  if (error instanceof TypeError) {
    return true;
  }

  return /fetch|network|cors|load/i.test(String(error && error.message));
}

function isFormField(target) {
  return target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(target.tagName);
}

function wait(durationMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function generateSubmissionId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `phd-${window.crypto.randomUUID()}`;
  }

  return `phd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
