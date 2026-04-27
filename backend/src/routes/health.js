const express = require("express");
const { pool } = require("../config/db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS ok");
    res.json({
      success: true,
      message: "Service is running",
      database: rows[0]?.ok === 1 ? "connected" : "unknown"
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
