const { ok } = require("../utils/response");
const homeService = require("../services/home.service");

async function index(req, res) {
  const data = await homeService.getHomeIndex({
    userId: Number(req.query.userId),
    date: req.query.date || null
  });
  return ok(res, data);
}

async function quickRecord(req, res) {
  const data = await homeService.createQuickRecord({
    userId: Number(req.body.userId),
    key: req.body.key,
    date: req.body.date || null,
    amount: req.body.amount != null ? Number(req.body.amount) : null
  });
  return ok(res, data, "Quick record created");
}

async function adjustQuickRecord(req, res) {
  const data = await homeService.adjustQuickRecord({
    userId: Number(req.body.userId),
    key: req.body.key,
    date: req.body.date || null,
    delta: Number(req.body.delta)
  });
  return ok(res, data, "Quick record adjusted");
}

async function userStats(req, res) {
  const data = await homeService.getUserStats(Number(req.query.userId));
  return ok(res, data);
}

async function dailyQuote(req, res) {
  const data = await homeService.getDailyQuote();
  return ok(res, data);
}

module.exports = {
  index,
  quickRecord,
  adjustQuickRecord,
  userStats,
  dailyQuote
};
