const { ok } = require("../utils/response");
const beadWarehouseService = require("../services/bead-warehouse.service");

// 库存列表 + 统计概览
async function list(req, res) {
  const userId = Number(req.query.userId);
  const data = await beadWarehouseService.getInventoryStats(userId);
  return ok(res, data);
}

// 手动入库
async function stockIn(req, res) {
  const { userId, items, note } = req.body;
  await beadWarehouseService.stockIn(Number(userId), items, note);
  return ok(res, true, "入库成功");
}

// 手动出库
async function stockOut(req, res) {
  const { userId, items, note } = req.body;
  await beadWarehouseService.stockOut(Number(userId), items, note);
  return ok(res, true, "出库成功");
}

// 统计范围设置
async function getStatConfig(req, res) {
  const userId = Number(req.query.userId);
  const data = await beadWarehouseService.getStatConfig(userId);
  return ok(res, data);
}

async function updateStatConfig(req, res) {
  const { userId, configs } = req.body;
  await beadWarehouseService.updateStatConfig(Number(userId), configs);
  return ok(res, true, "统计范围已更新");
}

// 库存日志
async function getLogs(req, res) {
  const { userId, page = 1, pageSize = 20, type } = req.query;
  const data = await beadWarehouseService.getLogs({
    userId: Number(userId),
    page: Number(page),
    pageSize: Number(pageSize),
    type: type || null
  });
  return ok(res, data);
}

// 色卡列表
async function listColors(req, res) {
  const data = await beadWarehouseService.listColors();
  return ok(res, data);
}

// 库存预警设置
async function getAlertSettings(req, res) {
  const userId = Number(req.query.userId);
  const data = await beadWarehouseService.getAlertSettings(userId);
  return ok(res, data);
}

async function saveAlertSettings(req, res) {
  const { userId, lowStockThreshold, outOfStockThreshold } = req.body;
  await beadWarehouseService.saveAlertSettings(
    Number(userId),
    Number(lowStockThreshold),
    Number(outOfStockThreshold)
  );
  return ok(res, true, "预警设置已保存");
}

async function getShortageList(req, res) {
  const userId = Number(req.query.userId);
  const data = await beadWarehouseService.getShortageList(userId);
  return ok(res, data);
}

module.exports = {
  list, stockIn, stockOut, getStatConfig, updateStatConfig,
  getLogs, listColors, getAlertSettings, saveAlertSettings, getShortageList
};
