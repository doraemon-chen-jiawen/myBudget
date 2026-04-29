const AppError = require("../utils/app-error");
const { ymdToYm, requireNumber } = require("../utils/validators");
const recordsDao = require("../dao/records.dao");

function validateRecordType(type) {
  const allowed = ["income", "expense"];
  if (!allowed.includes(type)) throw new AppError(400, "E_BAD_REQUEST", "Invalid recordType");
}

function requirePositiveAmount(amount, allowNegative = false) {
  if (amount === undefined || amount === null) {
    throw new AppError(400, "E_BAD_REQUEST", "Missing amount");
  }
  const n = Number(amount);
  if (Number.isNaN(n)) throw new AppError(400, "E_BAD_REQUEST", "amount must be a number");
  if (!allowNegative && n <= 0) throw new AppError(400, "E_BAD_REQUEST", "amount must be > 0");
  return n;
}

function normalize(payload) {
  const recordDate = payload.recordDate;
  if (!recordDate) throw new AppError(400, "E_BAD_REQUEST", "Missing recordDate");

  const recordMonth = payload.recordMonth ?? ymdToYm(recordDate);
  if (!recordMonth) throw new AppError(400, "E_BAD_REQUEST", "Cannot derive recordMonth from recordDate");

  validateRecordType(payload.recordType);
  const allowNegative = payload.source === "retract";
  const nAmount = requirePositiveAmount(payload.amount, allowNegative);
  // Ensure numeric fields are numbers for mysql placeholders.
  requireNumber({ amount: nAmount }, "amount");

  return {
    userId: payload.userId,
    familyGroupId: payload.familyGroupId ?? null,
    recordType: payload.recordType,
    amount: nAmount,
    currency: payload.currency ?? "CNY",
    recordDate,
    recordMonth,
    frequentItemId: payload.frequentItemId ?? null,
    categorySnapshot: payload.categorySnapshot ?? null,
    accountId: payload.accountId ?? null,
    note: payload.note ?? null,
    source: payload.source ?? "manual",
    sourceReference: payload.sourceReference ?? null
  };
}

async function list({ userId, familyGroupId, recordType, recordMonth, dateFrom, dateTo }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  return recordsDao.listRecords({
    userId,
    familyGroupId: familyGroupId ?? null,
    recordType: recordType ?? null,
    recordMonth: recordMonth ?? null,
    dateFrom: dateFrom ?? null,
    dateTo: dateTo ?? null
  });
}

async function create(payload) {
  if (!payload?.userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  return recordsDao.createRecord(normalize(payload));
}

async function update(id, userId, payload) {
  if (!id) throw new AppError(400, "E_BAD_REQUEST", "Missing id");
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const normalized = normalize({ ...payload, userId });
  return recordsDao.updateRecord(id, userId, normalized);
}

async function remove(id, userId) {
  const ok = await recordsDao.deleteRecord(id, userId);
  if (!ok) throw new AppError(404, "E_NOT_FOUND", "Record not found");
  return true;
}

module.exports = {
  list,
  create,
  update,
  remove
};

