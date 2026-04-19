const SPREADSHEET_ID = "1Av7vLaSo1Bf1RJ64TMpL3LYG64P0aK0Gppiq4yG-ElQ";
const SHEET_NAME = "Responses";
const HEADERS = [
  "timestamp",
  "submission_id",
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

const FIELD_RULES = {
  masters_field: [
    "Physics / Chemistry",
    "Biology / Health",
    "Computer Science / Data",
    "Engineering",
    "Social Sciences / Humanities",
    "Other"
  ],
  phd_field: [
    "Physics / Chemistry",
    "Biology / Health",
    "Computer Science / Data",
    "Engineering",
    "Social Sciences / Humanities",
    "Other"
  ],
  current_position: [
    "PhD student",
    "Postdoc",
    "Researcher / Lecturer",
    "Other"
  ],
  phd_type: [
    "",
    "Academic PhD",
    "Industrial PhD (CIFRE or equivalent)",
    "Other / Not sure"
  ],
  clearly_employable: ["Yes", "No"],
  felt_misunderstood: ["Yes", "No"]
};

function doGet(e) {
  const action = sanitizeText_(e && e.parameter ? e.parameter.action : "");

  if (action === "status") {
    return handleStatusRequest_(e);
  }

  return buildOutput_(
    {
      status: "ok",
      service: "phd-survey-collector",
      sheet: SHEET_NAME
    },
    e
  );
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const payload = normalizePayload_(parseRequestData_(e));
    const sheet = getResponsesSheet_();
    ensureHeaders_(sheet);

    if (submissionExists_(sheet, payload.submission_id)) {
      return buildOutput_(
        {
          status: "success",
          recorded: true,
          duplicate: true,
          submission_id: payload.submission_id
        },
        e
      );
    }

    const row = [
      new Date().toISOString(),
      payload.submission_id,
      payload.masters_field,
      payload.phd_field,
      payload.current_position,
      payload.phd_type,
      payload.employability_score,
      payload.clearly_employable,
      payload.target_role,
      payload.main_contribution_1,
      payload.main_contribution_2,
      payload.phd_skill_1,
      payload.phd_skill_2,
      payload.phd_skill_3,
      payload.confidence_in_skills,
      payload.value_for_company,
      payload.recruiter_word_1,
      payload.recruiter_word_2,
      payload.recruiter_word_3,
      payload.felt_misunderstood
    ];

    sheet.appendRow(row);

    return buildOutput_(
      {
        status: "success",
        recorded: true,
        duplicate: false,
        submission_id: payload.submission_id
      },
      e
    );
  } catch (error) {
    return buildOutput_(
      {
        status: "error",
        recorded: false,
        error: error.message || "Unknown error"
      },
      e
    );
  } finally {
    lock.releaseLock();
  }
}

function handleStatusRequest_(e) {
  try {
    const submissionId = sanitizeRequiredText_(
      e && e.parameter ? e.parameter.submission_id : "",
      "submission_id"
    );
    const sheet = getResponsesSheet_();
    ensureHeaders_(sheet);

    return buildOutput_(
      {
        status: "success",
        action: "status",
        submission_id: submissionId,
        found: submissionExists_(sheet, submissionId)
      },
      e
    );
  } catch (error) {
    return buildOutput_(
      {
        status: "error",
        error: error.message || "Unknown error"
      },
      e
    );
  }
}

function parseRequestData_(e) {
  if (!e || !e.postData) {
    throw new Error("No request body was received.");
  }

  const rawBody = e.postData.contents || "";
  if (rawBody) {
    try {
      return JSON.parse(rawBody);
    } catch (error) {
      // Fall through to alternate parsers.
    }
  }

  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }

  if (e.parameter && Object.keys(e.parameter).length) {
    return e.parameter;
  }

  throw new Error("The request body could not be parsed.");
}

function normalizePayload_(payload) {
  const normalized = {
    submission_id: sanitizeText_(payload.submission_id) || Utilities.getUuid(),
    masters_field: sanitizeChoice_(payload.masters_field, FIELD_RULES.masters_field, "masters_field"),
    phd_field: sanitizeChoice_(payload.phd_field, FIELD_RULES.phd_field, "phd_field"),
    current_position: sanitizeChoice_(payload.current_position, FIELD_RULES.current_position, "current_position"),
    phd_type: sanitizeChoice_(payload.phd_type, FIELD_RULES.phd_type, "phd_type"),
    employability_score: sanitizeScale_(payload.employability_score, "employability_score"),
    clearly_employable: sanitizeChoice_(payload.clearly_employable, FIELD_RULES.clearly_employable, "clearly_employable"),
    target_role: sanitizeRequiredText_(payload.target_role, "target_role"),
    main_contribution_1: sanitizeRequiredText_(payload.main_contribution_1, "main_contribution_1"),
    main_contribution_2: sanitizeRequiredText_(payload.main_contribution_2, "main_contribution_2"),
    phd_skill_1: sanitizeRequiredText_(payload.phd_skill_1, "phd_skill_1"),
    phd_skill_2: sanitizeRequiredText_(payload.phd_skill_2, "phd_skill_2"),
    phd_skill_3: sanitizeRequiredText_(payload.phd_skill_3, "phd_skill_3"),
    confidence_in_skills: sanitizeScale_(payload.confidence_in_skills, "confidence_in_skills"),
    value_for_company: sanitizeTwoSentenceText_(payload.value_for_company, "value_for_company"),
    recruiter_word_1: sanitizeRequiredText_(payload.recruiter_word_1, "recruiter_word_1"),
    recruiter_word_2: sanitizeRequiredText_(payload.recruiter_word_2, "recruiter_word_2"),
    recruiter_word_3: sanitizeRequiredText_(payload.recruiter_word_3, "recruiter_word_3"),
    felt_misunderstood: sanitizeChoice_(payload.felt_misunderstood, FIELD_RULES.felt_misunderstood, "felt_misunderstood")
  };

  return normalized;
}

function getResponsesSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaders_(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), HEADERS.length);
  const existingHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].slice(0, HEADERS.length);
  const hasAnyHeaderValue = existingHeaders.some(function(value) {
    return String(value || "").trim() !== "";
  });

  if (!hasAnyHeaderValue) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    return;
  }

  const headersMatch = HEADERS.every(function(header, index) {
    return String(existingHeaders[index] || "").trim() === header;
  });

  if (!headersMatch) {
    throw new Error('The first row of the "Responses" sheet must match the required header order.');
  }
}

function submissionExists_(sheet, submissionId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return false;
  }

  const finder = sheet
    .getRange(2, 2, lastRow - 1, 1)
    .createTextFinder(submissionId)
    .matchEntireCell(true);

  return Boolean(finder.findNext());
}

function sanitizeChoice_(value, allowedValues, fieldName) {
  const sanitized = sanitizeText_(value);
  if (allowedValues.indexOf(sanitized) === -1) {
    throw new Error(fieldName + " contains an invalid value.");
  }
  return sanitized;
}

function sanitizeScale_(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 10) {
    throw new Error(fieldName + " must be an integer between 1 and 10.");
  }
  return parsed;
}

function sanitizeRequiredText_(value, fieldName) {
  const sanitized = sanitizeText_(value);
  if (!sanitized) {
    throw new Error(fieldName + " is required.");
  }
  return sanitized;
}

function sanitizeTwoSentenceText_(value, fieldName) {
  const sanitized = sanitizeRequiredText_(value, fieldName);
  if (countSentences_(sanitized) > 2) {
    throw new Error(fieldName + " must contain no more than 2 sentences.");
  }
  return sanitized;
}

function sanitizeText_(value) {
  return String(value || "").trim();
}

function countSentences_(value) {
  const normalized = sanitizeText_(value).replace(/\s+/g, " ");
  if (!normalized) {
    return 0;
  }

  const matches = normalized.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  return matches ? matches.filter(Boolean).length : 0;
}

function buildOutput_(data, e) {
  const prefix = sanitizeCallbackPrefix_(e && e.parameter ? e.parameter.prefix : "");

  if (prefix) {
    return ContentService
      .createTextOutput(prefix + "(" + JSON.stringify(data) + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function sanitizeCallbackPrefix_(value) {
  const sanitized = sanitizeText_(value);
  if (!sanitized) {
    return "";
  }

  return /^[A-Za-z_$][0-9A-Za-z_$]*(?:\.[A-Za-z_$][0-9A-Za-z_$]*)*$/.test(sanitized)
    ? sanitized
    : "";
}
