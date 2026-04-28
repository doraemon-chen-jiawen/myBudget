const { request } = require("./request");

const familyAPI = {
  async getUserFamilies() {
    return request({
      url: "/family-management/user/families",
      method: "GET"
    });
  },

  async createFamily(data) {
    return request({
      url: "/family-groups",
      method: "POST",
      data
    });
  },

  async getFamilyMembers(familyGroupId) {
    return request({
      url: `/family-management/${familyGroupId}/members`,
      method: "GET"
    });
  },

  async removeMember(familyGroupId, targetUserId) {
    return request({
      url: `/family-management/${familyGroupId}/members`,
      method: "DELETE",
      data: { targetUserId }
    });
  }
};

const invitationAPI = {
  async createCode(familyGroupId, maxUses) {
    return request({
      url: "/invitations",
      method: "POST",
      data: { familyGroupId, maxUses }
    });
  },

  async validateCode(code) {
    return request({
      url: "/invitations/validate",
      method: "POST",
      data: { code },
      showLoading: false
    });
  },

  async acceptInvite(code) {
    return request({
      url: "/invitations/accept",
      method: "POST",
      data: { code }
    });
  },

  async listCodes(familyGroupId) {
    return request({
      url: `/invitations/${familyGroupId}`,
      method: "GET"
    });
  },

  async deleteCode(familyGroupId, invitationId) {
    return request({
      url: `/invitations/${familyGroupId}/${invitationId}`,
      method: "DELETE"
    });
  }
};

module.exports = {
  familyAPI,
  invitationAPI
};
