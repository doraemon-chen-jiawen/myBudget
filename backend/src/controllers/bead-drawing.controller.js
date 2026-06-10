const { ok } = require("../utils/response");
const AppError = require("../utils/app-error");
const beadDrawingService = require("../services/bead-drawing.service");

async function list(req, res) {
  const { page = 1, pageSize = 10, keyword, sizes, tagId, userId } = req.query;
  const data = await beadDrawingService.list({
    page: Number(page),
    pageSize: Number(pageSize),
    keyword: keyword || null,
    sizes: sizes ? sizes.split(',') : null,
    tagId: tagId ? Number(tagId) : null,
    userId: userId ? Number(userId) : null
  });
  return ok(res, data);
}

async function detail(req, res) {
  const data = await beadDrawingService.detail(Number(req.params.id));
  return ok(res, data);
}

async function listTags(req, res) {
  const data = await beadDrawingService.listTags();
  return ok(res, data);
}

async function listFavorites(req, res) {
  const { userId, page = 1, pageSize = 20 } = req.query;
  const data = await beadDrawingService.listFavorites({
    userId: Number(userId),
    page: Number(page),
    pageSize: Number(pageSize)
  });
  return ok(res, data);
}

async function addFavorite(req, res) {
  const { userId, drawingId } = req.body;
  await beadDrawingService.addFavorite(Number(userId), Number(drawingId));
  return ok(res, true, "收藏成功");
}

async function removeFavorite(req, res) {
  const userId = Number(req.query.userId);
  const drawingId = Number(req.params.drawingId);
  await beadDrawingService.removeFavorite(userId, drawingId);
  return ok(res, true, "取消收藏成功");
}

async function saveConversion(req, res) {
  const { userId, width, height, name, materials } = req.body;
  const pixelImage = req.file ? `/uploads/bead/${req.file.filename}` : null;
  const data = await beadDrawingService.saveConversion({
    userId: Number(userId),
    width: Number(width),
    height: Number(height),
    name: name || '我的图纸',
    pixelImage,
    materials: typeof materials === 'string' ? JSON.parse(materials) : materials
  });
  return ok(res, data, "保存成功");
}

async function listConversions(req, res) {
  const { userId, page = 1, pageSize = 20 } = req.query;
  const data = await beadDrawingService.listConversions({
    userId: Number(userId),
    page: Number(page),
    pageSize: Number(pageSize)
  });
  return ok(res, data);
}

// V1.2: 增强版转换记录列表（支持尺寸+拼接状态筛选）
async function listConversionsEnhanced(req, res) {
  const { userId, page = 1, pageSize = 20, size, isAssembled } = req.query;
  const data = await beadDrawingService.listConversionsEnhanced({
    userId: Number(userId),
    page: Number(page),
    pageSize: Number(pageSize),
    size: size || null,
    isAssembled: isAssembled !== undefined ? isAssembled : null
  });
  return ok(res, data);
}

// V1.2: 转换记录详情
async function getConversionDetail(req, res) {
  const data = await beadDrawingService.getConversionDetail(Number(req.params.id));
  if (!data) {
    throw new AppError(404, "E_NOT_FOUND", "图纸不存在");
  }
  return ok(res, data);
}

// V1.2: 更新拼接状态
async function updateAssembled(req, res) {
  const { id } = req.params;
  const { isAssembled } = req.body;
  await beadDrawingService.updateAssembled(Number(id), isAssembled);
  return ok(res, true, "状态已更新");
}

// V1.2: 删除转换记录
async function deleteConversion(req, res) {
  const { id } = req.params;
  await beadDrawingService.deleteConversion(Number(id));
  return ok(res, true, "已删除");
}

module.exports = {
  list, detail, listTags, listFavorites, addFavorite, removeFavorite,
  saveConversion, listConversions,
  listConversionsEnhanced, getConversionDetail, updateAssembled, deleteConversion
};