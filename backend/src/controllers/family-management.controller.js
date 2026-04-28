const { ok } = require("../utils/response");
const familyManagementService = require("../services/family-management.service");

async function listUserFamilies(req, res) {
  const userId = req.user.userId;

  const families = await familyManagementService.getUserFamilies(userId);
  return ok(res, families);
}

async function listMembers(req, res) {
  const userId = req.user.userId;
  const familyGroupId = req.params.id;

  const members = await familyManagementService.getFamilyMembers(familyGroupId, userId);
  return ok(res, members);
}

async function removeMember(req, res) {
  const userId = req.user.userId;
  const familyGroupId = req.params.id;
  const { targetUserId } = req.body;

  await familyManagementService.removeFamilyMember(familyGroupId, userId, targetUserId);
  return ok(res, true, "Member removed");
}

module.exports = {
  listUserFamilies,
  listMembers,
  removeMember
};
