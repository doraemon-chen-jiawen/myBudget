const beadWarehouseDao = require("../dao/bead-warehouse.dao");
const { calibrateCode } = require("./bead-ocr.service");

async function getInventoryStats(userId) {
  const [stats, inventory, statDrawings] = await Promise.all([
    beadWarehouseDao.getStats(userId),
    beadWarehouseDao.getInventoryList(userId),
    beadWarehouseDao.getStatDrawingCount(userId)
  ]);
  // 附加需求量数据
  const demandMap = await beadWarehouseDao.getDemandMap(userId);
  for (const item of inventory) {
    item.demand = demandMap[item.color_code] || 0;
  }
  return { stats: { ...stats, statDrawings }, inventory };
}

async function stockIn(userId, items, note) {
  for (const item of items) {
    // 校准色号：A01→A1 等价匹配，不在色卡中的拒绝入库
    const code = calibrateCode(item.colorCode);
    if (!code) continue;
    await beadWarehouseDao.addStock(userId, code, item.quantity);
    await beadWarehouseDao.addLog(userId, code, 'in', item.quantity, 'manual', note || '手动入库');
  }
}

async function stockOut(userId, items, note) {
  for (const item of items) {
    // 校准色号：A01→A1 等价匹配
    const code = calibrateCode(item.colorCode);
    if (!code) continue;
    const current = await beadWarehouseDao.getStock(userId, code);
    if (current < item.quantity) {
      const err = new Error(`库存不足：${code} 当前 ${current}，需出库 ${item.quantity}`);
      err.statusCode = 400;
      throw err;
    }
    await beadWarehouseDao.reduceStock(userId, code, item.quantity);
    await beadWarehouseDao.addLog(userId, code, 'out', item.quantity, 'manual', note || '手动出库');
  }
}

async function getStatConfig(userId) {
  return beadWarehouseDao.getStatOptions(userId);
}

async function updateStatConfig(userId, configs) {
  await beadWarehouseDao.clearStatConfig(userId);
  if (configs && configs.length > 0) {
    await beadWarehouseDao.batchInsertStatConfig(userId, configs);
  }
}

async function getLogs({ userId, page, pageSize, type }) {
  return beadWarehouseDao.getLogs({ userId, page, pageSize, type });
}

async function listColors() {
  return beadWarehouseDao.listColors();
}

async function getAlertSettings(userId) {
  return beadWarehouseDao.getAlertSettings(userId);
}

async function saveAlertSettings(userId, lowStockThreshold, outOfStockThreshold) {
  await beadWarehouseDao.saveAlertSettings(userId, lowStockThreshold, outOfStockThreshold);
}

async function getShortageList(userId) {
  return beadWarehouseDao.getShortageList(userId);
}

module.exports = {
  getInventoryStats, stockIn, stockOut, getStatConfig, updateStatConfig,
  getLogs, listColors, getAlertSettings, saveAlertSettings, getShortageList
};
