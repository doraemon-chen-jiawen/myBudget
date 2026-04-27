const AppError = require("../utils/app-error");
const autoFillDao = require("../dao/auto-fill.dao");

function formatDateKey(d) {
  // UTC date key => YYYY-MM-DD
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseYmdToUtcStart(dateStr) {
  // expects YYYY-MM-DD
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function ymFromYmd(dateStr) {
  // YYYY-MM
  return dateStr.slice(0, 7);
}

function addDaysUtc(date, n) {
  const t = date.getTime();
  const next = new Date(t + n * 24 * 60 * 60 * 1000);
  return next;
}

function validateRecordType(type) {
  if (!["income", "expense"].includes(type)) {
    throw new AppError(400, "E_BAD_REQUEST", "Invalid recordType");
  }
}

/**
 * Auto-fill daily records based on daily budgets.
 *
 * De-dup strategy:
 * - For each day, use auto_fill_logs unique key: (user_id, rule_name, period_type=daily, period_key=YYYY-MM-DD)
 */
async function runForUser(userId, options = {}) {
  if (!userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");

  const ruleName = options.ruleName ?? "budget_daily_auto_fill";
  const recordType = options.recordType ?? "expense";
  validateRecordType(recordType);

  const categorySnapshot = options.categorySnapshot ?? "自动补记（按预算）";
  const note = options.note ?? "自动补记（按预算）";
  const currency = options.currency ?? "CNY";
  const accountId = options.accountId ?? null;
  const familyGroupId = options.familyGroupId ?? null;
  const source = "auto";
  const sourceRefPrefix = options.sourceRefPrefix ?? "auto_fill_daily";

  const today = formatDateKey(new Date());

  const lastDate = await autoFillDao.getLastRecordDate(userId, familyGroupId);
  // startDate = lastDate + 1 day; if no records, start at today (no backfill)
  const startDateStr = lastDate ? formatDateKey(addDaysUtc(parseYmdToUtcStart(String(lastDate)), 1)) : today;

  const start = parseYmdToUtcStart(startDateStr);
  const end = parseYmdToUtcStart(today);

  if (start.getTime() > end.getTime()) {
    return {
      filledDays: 0,
      skippedDays: 0,
      failedDays: 0,
      startDate: startDateStr,
      endDate: today
    };
  }

  const summary = {
    filledDays: 0,
    skippedDays: 0,
    failedDays: 0,
    startDate: startDateStr,
    endDate: today,
    results: []
  };

  // Iterate each day
  let cursor = start;
  while (cursor.getTime() <= end.getTime()) {
    const dateStr = formatDateKey(cursor); // YYYY-MM-DD
    const periodKey = dateStr;

    const conn = await autoFillDao.pool.getConnection();
    try {
      await conn.beginTransaction();

      const already = await autoFillDao.isAutoFilled(conn, userId, ruleName, dateStr);
      if (already) {
        summary.skippedDays += 1;
        summary.results.push({ date: dateStr, status: "skipped", reason: "duplicate" });
        // No write is performed here because the log already exists.
        await conn.rollback();
        cursor = addDaysUtc(cursor, 1);
        conn.release();
        continue;
      }

      const sourceReference = `${sourceRefPrefix}:${dateStr}`;
      const existedRecord = await autoFillDao.existsRecordBySourceRef(conn, userId, source, sourceReference);
      if (existedRecord) {
        await autoFillDao.insertAutoFillLog(conn, {
          userId,
          familyGroupId,
          ruleName,
          periodKey,
          targetDate: dateStr,
          targetMonth: ymFromYmd(dateStr),
          budgetId: null,
          createdRecordId: existedRecord.id,
          status: "skipped",
          errorMessage: "record_already_exists"
        });
        await conn.commit();
        summary.skippedDays += 1;
        summary.results.push({ date: dateStr, status: "skipped", reason: "record_already_exists" });
        cursor = addDaysUtc(cursor, 1);
        conn.release();
        continue;
      }

      const budget = await autoFillDao.findDailyBudget(conn, userId, dateStr);
      if (!budget || budget.planned_amount === null || budget.planned_amount === undefined) {
        await autoFillDao.insertAutoFillLog(conn, {
          userId,
          familyGroupId,
          ruleName,
          periodKey,
          targetDate: dateStr,
          targetMonth: ymFromYmd(dateStr),
          budgetId: budget?.id ?? null,
          createdRecordId: null,
          status: "skipped",
          errorMessage: "no_budget"
        });
        await conn.commit();
        summary.skippedDays += 1;
        summary.results.push({ date: dateStr, status: "skipped", reason: "no_budget" });
        cursor = addDaysUtc(cursor, 1);
        conn.release();
        continue;
      }

      const amount = Number(budget.planned_amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        await autoFillDao.insertAutoFillLog(conn, {
          userId,
          familyGroupId,
          ruleName,
          periodKey,
          targetDate: dateStr,
          targetMonth: ymFromYmd(dateStr),
          budgetId: budget.id,
          createdRecordId: null,
          status: "skipped",
          errorMessage: "budget_amount_not_positive"
        });
        await conn.commit();
        summary.skippedDays += 1;
        summary.results.push({ date: dateStr, status: "skipped", reason: "amount<=0" });
        cursor = addDaysUtc(cursor, 1);
        conn.release();
        continue;
      }

      // Create record
      const record = await autoFillDao.insertRecord(conn, {
        userId,
        familyGroupId,
        recordType,
        amount,
        currency,
        recordDate: dateStr,
        recordMonth: ymFromYmd(dateStr),
        categorySnapshot,
        accountId,
        source,
        sourceReference,
        note
      });

      await autoFillDao.insertAutoFillLog(conn, {
        userId,
        familyGroupId,
        ruleName,
        periodKey,
        targetDate: dateStr,
        targetMonth: ymFromYmd(dateStr),
        budgetId: budget.id,
        createdRecordId: record?.id ?? null,
        status: "success",
        errorMessage: null,
        inputPayload: JSON.stringify({
          recordType,
          categorySnapshot,
          amount
        })
      });

      await conn.commit();
      summary.filledDays += 1;
      summary.results.push({ date: dateStr, status: "success", recordId: record?.id ?? null });
    } catch (e) {
      try {
        // write failed log (if possible)
        await conn.rollback();
        await autoFillDao.insertAutoFillLog(conn, {
          userId,
          familyGroupId,
          ruleName,
          periodKey,
          targetDate: dateStr,
          targetMonth: ymFromYmd(dateStr),
          budgetId: null,
          createdRecordId: null,
          status: "failed",
          errorMessage: e?.message ?? "auto_fill_failed",
          inputPayload: JSON.stringify(options)
        });
        await conn.commit();
      } catch (_) {
        // ignore secondary failure
      }
      summary.failedDays += 1;
      summary.results.push({ date: dateStr, status: "failed" });
    } finally {
      conn.release();
      cursor = addDaysUtc(cursor, 1);
    }
  }

  return summary;
}

module.exports = {
  runForUser
};

