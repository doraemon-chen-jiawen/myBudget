const express = require("express");
const multer = require("multer");
const path = require("path");
const asyncHandler = require("../utils/async-handler");
const beadDrawingController = require("../controllers/bead-drawing.controller");
const beadOcrController = require("../controllers/bead-ocr.controller");
const beadWarehouseController = require("../controllers/bead-warehouse.controller");

const router = express.Router();

// 文件上传配置
const upload = multer({
  dest: path.join(__dirname, '../../uploads/bead/'),
  limits: { fileSize: 20 * 1024 * 1024 }
});

// 图纸 CRUD
router.get("/drawings", asyncHandler(beadDrawingController.list));
router.get("/drawings/:id", asyncHandler(beadDrawingController.detail));

// 标签
router.get("/tags", asyncHandler(beadDrawingController.listTags));

// 收藏
router.get("/favorites", asyncHandler(beadDrawingController.listFavorites));
router.post("/favorites", asyncHandler(beadDrawingController.addFavorite));
router.delete("/favorites/:drawingId", asyncHandler(beadDrawingController.removeFavorite));

// 用户转换记录
router.post("/conversions", upload.single('pixelImage'), asyncHandler(beadDrawingController.saveConversion));
router.get("/conversions/enhanced", asyncHandler(beadDrawingController.listConversionsEnhanced));
router.get("/conversions/:id", asyncHandler(beadDrawingController.getConversionDetail));
router.put("/conversions/:id/assembled", asyncHandler(beadDrawingController.updateAssembled));
router.delete("/conversions/:id", asyncHandler(beadDrawingController.deleteConversion));
router.get("/conversions", asyncHandler(beadDrawingController.listConversions));

// OCR 识别
router.post("/ocr/recognize", upload.single('image'), asyncHandler(beadOcrController.recognize));
router.post("/ocr/save", upload.single('pixelImage'), asyncHandler(beadOcrController.saveOcrResult));

// 订单 OCR
router.post("/ocr/order", upload.single('image'), asyncHandler(beadOcrController.recognizeOrder));
router.post("/ocr/order/confirm", asyncHandler(beadOcrController.confirmOrderStockIn));

// 豆仓库存
router.get("/inventory", asyncHandler(beadWarehouseController.list));
router.post("/inventory/stock-in", asyncHandler(beadWarehouseController.stockIn));
router.post("/inventory/stock-out", asyncHandler(beadWarehouseController.stockOut));
router.get("/inventory/stat-config", asyncHandler(beadWarehouseController.getStatConfig));
router.post("/inventory/stat-config", asyncHandler(beadWarehouseController.updateStatConfig));
router.get("/inventory/shortage", asyncHandler(beadWarehouseController.getShortageList));
router.get("/inventory/logs", asyncHandler(beadWarehouseController.getLogs));
router.get("/inventory/alert-settings", asyncHandler(beadWarehouseController.getAlertSettings));
router.post("/inventory/alert-settings", asyncHandler(beadWarehouseController.saveAlertSettings));
router.get("/colors", asyncHandler(beadWarehouseController.listColors));

module.exports = router;
