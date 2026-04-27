const AppError = require("./app-error");

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function requireField(obj, field, code = "E_BAD_REQUEST") {
  if (obj?.[field] === undefined || obj?.[field] === null) {
    throw new AppError(400, code, `Missing required field: ${field}`);
  }
}

function requireNonEmptyString(obj, field) {
  if (!isNonEmptyString(obj?.[field])) {
    throw new AppError(400, "E_BAD_REQUEST", `Field '${field}' must be a non-empty string`);
  }
}

function requireNumber(obj, field) {
  const v = obj?.[field];
  if (typeof v !== "number" || Number.isNaN(v)) {
    throw new AppError(400, "E_BAD_REQUEST", `Field '${field}' must be a number`);
  }
}

function requireOptionalNumber(obj, field) {
  const v = obj?.[field];
  if (v === undefined || v === null) return;
  requireNumber(obj, field);
}

/**
 * Normalize YYYY-MM-DD -> YYYY-MM
 * @param {string} ymd
 */
function ymdToYm(ymd) {
  if (!isNonEmptyString(ymd) || ymd.length < 7) return null;
  // YYYY-MM-DD => YYYY-MM
  return ymd.slice(0, 7);
}

module.exports = {
  requireField,
  requireNonEmptyString,
  requireNumber,
  requireOptionalNumber,
  ymdToYm
};

