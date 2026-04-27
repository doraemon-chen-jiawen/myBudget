const AppError = require("../utils/app-error");
const familyDao = require("../dao/family-groups.dao");
const recordsDao = require("../dao/records.dao");
const autoFillService = require("./auto-fill.service");

function formatTodayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function ymdToYm(ymd) {
  if (!ymd || ymd.length < 7) return null;
  return ymd.slice(0, 7);
}

async function summaryAndAutoFill(familyGroupId) {
  if (!familyGroupId || Number.isNaN(familyGroupId)) {
    throw new AppError(400, "E_BAD_REQUEST", "Missing familyGroupId");
  }

  const group = await familyDao.getGroup(familyGroupId);
  if (!group) throw new AppError(404, "E_NOT_FOUND", "Family group not found");

  const members = await familyDao.listMembers(familyGroupId);
  if (!members || members.length === 0) {
    return {
      familyGroup: group,
      members: [],
      today: formatTodayKey(),
      autoFill: { filledDays: 0, skippedDays: 0, failedDays: 0 }
    };
  }

  const today = formatTodayKey();
  const todayYm = ymdToYm(today);

  const overall = { filledDays: 0, skippedDays: 0, failedDays: 0 };
  const memberSummaries = [];

  // Sequential to reduce DB pressure; can be parallelized later if needed.
  for (const m of members) {
    const userId = m.user_id;

    const autoFillResult = await autoFillService.runForUser(userId, {
      ruleName: "budget_daily_auto_fill",
      recordType: "expense",
      categorySnapshot: "家庭联动补记",
      note: "家庭联动补记",
      familyGroupId,
      // Dedup: use the same prefix as personal auto-fill so records won't duplicate.
      sourceRefPrefix: "budget_daily_auto_fill"
    });

    overall.filledDays += autoFillResult.filledDays ?? 0;
    overall.skippedDays += autoFillResult.skippedDays ?? 0;
    overall.failedDays += autoFillResult.failedDays ?? 0;

    // Return records for [startDate, today] for completeness.
    const dateFrom = autoFillResult.startDate ?? null;
    const dateTo = today;
    const records = dateFrom
      ? await recordsDao.listRecords({
          userId,
          familyGroupId,
          dateFrom,
          dateTo,
          recordType: null,
          recordMonth: null
        })
      : [];

    memberSummaries.push({
      ...m,
      autoFill: autoFillResult,
      records
    });
  }

  return {
    familyGroup: group,
    members: memberSummaries,
    today,
    autoFill: overall
  };
}

module.exports = {
  summaryAndAutoFill
};

