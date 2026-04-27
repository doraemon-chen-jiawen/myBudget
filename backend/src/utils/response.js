function ok(res, data, message = "ok") {
  return res.json({
    success: true,
    message,
    data
  });
}

function fail(res, statusCode, code, message, details) {
  return res.status(statusCode).json({
    success: false,
    code,
    message,
    details: details ?? null
  });
}

module.exports = {
  ok,
  fail
};

