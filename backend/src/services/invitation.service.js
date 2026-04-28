const AppError = require("../utils/app-error");
const { requireNonEmptyString } = require("../utils/validators");
const invitationDao = require("../dao/invitation-codes.dao");
const familyGroupsDao = require("../dao/family-groups.dao");

async function createCode(userId, familyGroupId, maxUses = 10) {
  const isMember = await familyGroupsDao.isFamilyMember(familyGroupId, userId);
  if (!isMember) {
    throw new AppError(403, "E_FORBIDDEN", "You are not a member of this family group");
  }

  const invitation = await invitationDao.createInvitationCode({
    familyGroupId,
    createdBy: userId,
    maxUses
  });

  return invitation;
}

async function validateCode(code) {
  requireNonEmptyString({ code }, "code");

  const invitation = await invitationDao.findByCode(code);
  if (!invitation) {
    throw new AppError(404, "E_NOT_FOUND", "Invalid or expired invitation code");
  }

  const group = await familyGroupsDao.getGroupByInvitationCode(code);
  if (!group) {
    throw new AppError(404, "E_NOT_FOUND", "Family group not found");
  }

  return {
    invitationId: invitation.id,
    familyGroup: group,
    maxUses: invitation.max_uses,
    usedCount: invitation.used_count
  };
}

async function acceptInvite(userId, code) {
  requireNonEmptyString({ code }, "code");

  const invitation = await invitationDao.findByCode(code);
  if (!invitation) {
    throw new AppError(404, "E_NOT_FOUND", "Invalid or expired invitation code");
  }

  const existingMember = await familyGroupsDao.isFamilyMember(
    invitation.family_group_id,
    userId
  );
  if (existingMember) {
    throw new AppError(409, "E_CONFLICT", "You are already a member of this family group");
  }

  await familyGroupsDao.addMember({
    familyGroupId: invitation.family_group_id,
    userId,
    role: 'member',
    status: 'active'
  });

  await invitationDao.incrementUsedCount(invitation.id);

  const group = await familyGroupsDao.getGroup(invitation.family_group_id);
  const members = await familyGroupsDao.listMembers(invitation.family_group_id);

  return {
    familyGroup: group,
    members
  };
}

async function listCodes(userId, familyGroupId) {
  const isMember = await familyGroupsDao.isFamilyMember(familyGroupId, userId);
  if (!isMember) {
    throw new AppError(403, "E_FORBIDDEN", "You are not a member of this family group");
  }

  return invitationDao.listByFamilyGroup(familyGroupId);
}

async function deleteCode(userId, familyGroupId, invitationId) {
  const isMember = await familyGroupsDao.isFamilyMember(familyGroupId, userId);
  if (!isMember) {
    throw new AppError(403, "E_FORBIDDEN", "You are not a member of this family group");
  }

  const deleted = await invitationDao.deleteCode(invitationId, userId);
  if (!deleted) {
    throw new AppError(404, "E_NOT_FOUND", "Invitation code not found");
  }

  return true;
}

module.exports = {
  createCode,
  validateCode,
  acceptInvite,
  listCodes,
  deleteCode
};
