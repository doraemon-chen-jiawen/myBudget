const AppError = require("../utils/app-error");
const { requireNonEmptyString } = require("../utils/validators");
const dao = require("../dao/family-groups.dao");

function normalize(payload) {
  return {
    ownerUserId: payload.ownerUserId,
    name: payload.name,
    description: payload.description
  };
}

async function create(payload) {
  if (!payload?.ownerUserId) throw new AppError(400, "E_BAD_REQUEST", "Missing ownerUserId");
  requireNonEmptyString(payload, "name");
  return dao.createGroup({
    ownerUserId: Number(payload.ownerUserId),
    name: payload.name.trim(),
    description: payload.description ?? null
  });
}

async function list({ ownerUserId, userId } = {}) {
  if (userId !== undefined && userId !== null) {
    return dao.listGroups({ userId: Number(userId) });
  }
  if (ownerUserId !== undefined && ownerUserId !== null) {
    return dao.listGroups({ ownerUserId: Number(ownerUserId) });
  }
  return dao.listGroups();
}

async function get(id) {
  const group = await dao.getGroup(Number(id));
  if (!group) throw new AppError(404, "E_NOT_FOUND", "Family group not found");
  return group;
}

async function update(id, ownerUserId, payload) {
  if (!ownerUserId) throw new AppError(400, "E_BAD_REQUEST", "Missing ownerUserId");
  requireNonEmptyString(payload, "name");
  const updated = await dao.updateGroup(
    Number(id),
    Number(ownerUserId),
    {
      name: payload.name.trim(),
      description: payload.description ?? null
    }
  );
  if (!updated) throw new AppError(404, "E_NOT_FOUND", "Family group not found");
  return updated;
}

async function remove(id, ownerUserId) {
  const ok = await dao.deleteGroup(Number(id), Number(ownerUserId));
  if (!ok) throw new AppError(404, "E_NOT_FOUND", "Family group not found");
  return true;
}

async function addMember(familyGroupId, payload) {
  if (!payload?.userId) throw new AppError(400, "E_BAD_REQUEST", "Missing userId");
  return dao.addMember({
    familyGroupId: Number(familyGroupId),
    userId: Number(payload.userId),
    role: payload.role ?? "member",
    status: payload.status ?? "active"
  });
}

async function listMembers(familyGroupId) {
  return dao.listMembers(Number(familyGroupId));
}

module.exports = {
  create,
  list,
  get,
  update,
  remove,
  addMember,
  listMembers
};

