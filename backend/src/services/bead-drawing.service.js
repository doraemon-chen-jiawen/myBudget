const beadDrawingDao = require("../dao/bead-drawing.dao");

async function list({ page, pageSize, keyword, sizes, tagId, userId }) {
  return beadDrawingDao.findDrawings({ page, pageSize, keyword, sizes, tagId, userId });
}

async function detail(id) {
  return beadDrawingDao.findDrawingById(id);
}

async function listTags() {
  return beadDrawingDao.findAllTags();
}

async function listFavorites({ userId, page, pageSize }) {
  return beadDrawingDao.findFavorites({ userId, page, pageSize });
}

async function addFavorite(userId, drawingId) {
  return beadDrawingDao.addFavorite(userId, drawingId);
}

async function removeFavorite(userId, drawingId) {
  return beadDrawingDao.removeFavorite(userId, drawingId);
}

async function saveConversion({ userId, width, height, name, pixelImage, pixelData, materials }) {
  return beadDrawingDao.saveConversion({ userId, width, height, name, pixelImage, pixelData, materials });
}

async function listConversions({ userId, page, pageSize }) {
  return beadDrawingDao.listConversions({ userId, page, pageSize });
}

async function listConversionsEnhanced({ userId, page, pageSize, size, isAssembled }) {
  return beadDrawingDao.listConversionsEnhanced({ userId, page, pageSize, size, isAssembled });
}

async function getConversionDetail(id) {
  return beadDrawingDao.getConversionDetail(id);
}

async function updateAssembled(id, isAssembled) {
  return beadDrawingDao.updateAssembled(id, isAssembled);
}

async function deleteConversion(id) {
  return beadDrawingDao.deleteConversion(id);
}

module.exports = {
  list, detail, listTags, listFavorites, addFavorite, removeFavorite,
  saveConversion, listConversions,
  listConversionsEnhanced, getConversionDetail, updateAssembled, deleteConversion
};
