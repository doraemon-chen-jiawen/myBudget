const AppError = require("../utils/app-error");

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: "E_NOT_FOUND",
    message: "Route not found",
    details: {
      path: req.originalUrl
    }
  });
}

function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV !== "test") {
    console.error("[ERROR]", err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      details: err.details ?? null
    });
  }

  // mysql2: ER_DUP_ENTRY, ER_PARSE_ERROR, etc.
  const statusCode = err?.statusCode || 500;
  const code = err?.code || "E_INTERNAL";
  const message = err?.message || "Internal server error";

  return res.status(statusCode).json({
    success: false,
    code,
    message,
    details: null
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
