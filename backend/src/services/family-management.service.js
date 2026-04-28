const AppError = require("../utils/app-error");
const { requireNonEmptyString } = require("../utils/validators");
const usersDao = require("../dao/users.dao");
const familyGroupsDao = require("../dao/family-groups.dao");

async function getUserFamilies(userId) {
  return usersDao.listUserFamilies(userId);
}

async function getFamilyMembers(familyGroupId, userId) {
  const isMember = await familyGroupsDao.isFamilyMember(familyGroupId, userId);
  if (!isMember) {
    throw new AppError(403, "E_FORBIDDEN", "You are not a member of this family group");
  }

  const members = await familyGroupsDao.listMembers(familyGroupId);

  return members.map(m => ({
    ...m,
    isCurrentUser: m.user_id === userId
  }));
}

async function removeFamilyMember(familyGroupId, userId, targetUserId) {
  const isOwner = await isGroupOwner(familyGroupId, userId);
  if (userId !== targetUserId && !isOwner) {
    throw new AppError(403, "E_FORBIDDEN", "You can only remove yourself or you must be group owner");
  }

  const group = await familyGroupsDao.getGroup(familyGroupId);
  if (!group) {
    throw new AppError(404, "E_NOT_FOUND", "Family group not found");
  }

  if (group.owner_user_id === targetUserId) {
    throw new AppError(400, "E_BAD_REQUEST", "Cannot remove group owner");
  }

  const removed = await familyGroupsDao.removeMember(familyGroupId, targetUserId);
  if (!removed) {
    throw new AppError(404, "E_NOT_FOUND", "Member not found");
  }

  return true;
}

async function isGroupOwner(familyGroupId, userId) {
  const group = await familyGroupsDao.getGroup(familyGroupId);
  return group && group.owner_user_id === userId;
}

module.exports = {
  getUserFamilies,
  getFamilyMembers,
  removeFamilyMember,
  isGroupOwner
};
