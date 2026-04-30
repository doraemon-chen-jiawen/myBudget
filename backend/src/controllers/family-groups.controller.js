const { ok } = require("../utils/response");
const service = require("../services/family-groups.service");

/**
 * Controller: family groups & members
 */
async function create(req, res) {
  /**
   * POST /api/family-groups
   * body: { ownerUserId, name, description? }
   */
  const created = await service.create(req.body);
  return ok(res, created, "Family group created");
}

async function list(req, res) {
  /**
   * GET /api/family-groups?ownerUserId=...&userId=...
   */
  const data = await service.list({
    ownerUserId: req.query.ownerUserId ?? null,
    userId: req.query.userId ?? null
  });
  return ok(res, data);
}

async function getOne(req, res) {
  /**
   * GET /api/family-groups/:id
   */
  const group = await service.get(req.params.id);
  return ok(res, group);
}

async function update(req, res) {
  /**
   * PUT /api/family-groups/:id
   * body: { ownerUserId, name, description? }
   */
  const updated = await service.update(req.params.id, req.body.ownerUserId, req.body);
  return ok(res, updated, "Family group updated");
}

async function remove(req, res) {
  /**
   * DELETE /api/family-groups/:id
   * body: { ownerUserId }
   */
  await service.remove(req.params.id, req.body.ownerUserId);
  return ok(res, true, "Family group deleted");
}

async function addMember(req, res) {
  /**
   * POST /api/family-groups/:id/members
   * body: { userId, role?, status? }
   */
  const added = await service.addMember(req.params.id, req.body);
  return ok(res, added, "Member added");
}

async function listMembers(req, res) {
  /**
   * GET /api/family-groups/:id/members
   */
  const members = await service.listMembers(req.params.id);
  return ok(res, members);
}

module.exports = {
  create,
  list,
  getOne,
  update,
  remove,
  addMember,
  listMembers
};

