const { ok } = require("../utils/response");
const invitationService = require("../services/invitation.service");

async function create(req, res) {
  const userId = req.user.userId;
  const { familyGroupId, maxUses } = req.body;

  const invitation = await invitationService.createCode(userId, familyGroupId, maxUses);
  return ok(res, invitation, "Invitation code created");
}

async function validate(req, res) {
  const { code } = req.body;

  const result = await invitationService.validateCode(code);
  return ok(res, result);
}

async function accept(req, res) {
  const userId = req.user.userId;
  const { code } = req.body;

  const result = await invitationService.acceptInvite(userId, code);
  return ok(res, result, "Invitation accepted");
}

async function list(req, res) {
  const userId = req.user.userId;
  const familyGroupId = req.params.id;

  const codes = await invitationService.listCodes(userId, familyGroupId);
  return ok(res, codes);
}

async function remove(req, res) {
  const userId = req.user.userId;
  const familyGroupId = req.params.id;
  const invitationId = req.params.invitationId;

  await invitationService.deleteCode(userId, familyGroupId, invitationId);
  return ok(res, true, "Invitation code deleted");
}

module.exports = {
  create,
  validate,
  accept,
  list,
  remove
};
