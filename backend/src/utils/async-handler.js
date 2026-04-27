/**
 * Wrap async route handlers and forward errors to express error middleware.
 * @param {(req,res,next)=>Promise<any>} fn
 */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;

