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
    date: req.body.date || null
  });
  return ok(res, data, "Quick record created");
}

module.exports = {
  index,
  quickRecord
};
