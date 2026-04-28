const AppError = require("../utils/app-error");
const familyGroupsDao = require("../dao/family-groups.dao");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, "E_UNAUTHORIZED", "Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);

  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());

    if (!payload.userId || payload.exp < Date.now()) {
      throw new AppError(401, "E_UNAUTHORIZED", "Invalid or expired token");
    }

    req.user = { userId: payload.userId };
    next();
  } catch (error) {
    throw new AppError(401, "E_UNAUTHORIZED", "Invalid token");
  }
}

function requireFamilyMember(req, res, next) {
  const { userId } = req.user;
  const familyGroupId = req.params.id || req.body.familyGroupId;

  if (!familyGroupId) {
    throw new AppError(400, "E_BAD_REQUEST", "Missing familyGroupId");
  }

  familyGroupsDao.isFamilyMember(familyGroupId, userId)
    .then(isMember => {
      if (!isMember) {
        throw new AppError(403, "E_FORBIDDEN", "You are not a member of this family group");
      }
      req.familyGroupId = familyGroupId;
      next();
    })
    .catch(next);
}

module.exports = {
  requireAuth,
  requireFamilyMember
};
