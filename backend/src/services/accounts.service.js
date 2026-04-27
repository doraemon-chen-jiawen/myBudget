const AppError = require("../utils/app-error");
const { requireNonEmptyString, requireNumber, requireOptionalNumber } = require("../utils/validators");
const accountsDao = require("../dao/accounts.dao");

function validateKind(kind) {
  if (!["saving", "finance"].includes(kind)) {
    throw new AppError(400, "E_BAD_REQUEST", "Invalid accountKind");
  }
}

function normalizePayload(userId, kind, payload) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  validateKind(kind);

  const accountName = payload.accountName;
  requireNonEmptyString(payload, "accountName");

  const familyGroupId = payload.familyGroupId ?? null;
  if (familyGroupId !== null && familyGroupId !== undefined && typeof familyGroupId !== "number") {
    throw new AppError(400, "E_BAD_REQUEST", "familyGroupId must be a number");
  }

  return {
    userId,
    familyGroupId,
    accountKind: kind,
    accountName: accountName.trim(),
    bankName: payload.bankName ?? null,
    provider: payload.provider ?? null,
    currency: payload.currency ?? "CNY",
    balance: kind === "saving" ? payload.balance ?? null : null,
    creditLimit: kind === "saving" ? payload.creditLimit ?? null : null,
    lastBalanceUpdatedAt: payload.lastBalanceUpdatedAt ?? null,
    principalAmount: kind === "finance" ? payload.principalAmount ?? null : null,
    expectedAnnualRate: kind === "finance" ? payload.expectedAnnualRate ?? null : null,
    isDefault: payload.isDefault ?? 0,
    isActive: payload.isActive ?? 1
  };
}

async function list({ userId, familyGroupId, accountKind }) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  validateKind(accountKind);
  return accountsDao.listByKind({ userId, familyGroupId, accountKind });
}

async function createSaving(payload) {
  const normalized = normalizePayload(Number(payload.userId), "saving", payload);
  return accountsDao.createAccount(normalized);
}

async function updateSaving(id, userId, payload) {
  const normalized = normalizePayload(userId, "saving", payload);
  return accountsDao.updateAccount(id, userId, normalized);
}

async function deleteSaving(id, userId) {
  return accountsDao.deleteAccount(id, userId, "saving");
}

async function createFinance(payload) {
  const normalized = normalizePayload(Number(payload.userId), "finance", payload);
  return accountsDao.createAccount(normalized);
}

async function updateFinance(id, userId, payload) {
  const normalized = normalizePayload(userId, "finance", payload);
  return accountsDao.updateAccount(id, userId, normalized);
}

async function deleteFinance(id, userId) {
  return accountsDao.deleteAccount(id, userId, "finance");
}

module.exports = {
  list,
  createSaving,
  updateSaving,
  deleteSaving,
  createFinance,
  updateFinance,
  deleteFinance
};

