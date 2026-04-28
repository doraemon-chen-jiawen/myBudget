const { familyAPI, invitationAPI } = require("../../utils/family");

Page({
  data: {
    currentTab: "groups",
    tabs: [
      { key: "groups", label: "我的家庭" },
      { key: "invite", label: "邀请成员" },
      { key: "join", label: "加入家庭" }
    ],
    activeTabIndex: 0,
    userFamilies: [],
    selectedFamilyIndex: 0,
    familyMembers: [],
    invitationCodes: [],
    showCreateModal: false,
    showCreateFamilyModal: false,
    createForm: { maxUses: 10 },
    createFamilyForm: { name: "", description: "" },
    copiedCode: "",
    joinForm: { code: "" },
    joinPreview: null,
    loading: false
  },

  onLoad() {
    this.loadUserFamilies();
  },

  onShow() {
    this.loadUserFamilies();
  },

  onTabChange(e) {
    const index = e.currentTarget.dataset.index;
    const tab = this.data.tabs[index];
    this.setData({ activeTabIndex: index, currentTab: tab.key });

    if (tab.key === "groups") {
      this.loadUserFamilies();
    } else if (tab.key === "invite" && this.data.userFamilies.length > 0) {
      this.loadInvitationCodes();
    }
  },

  async loadUserFamilies() {
    const userId = wx.getStorageSync("userId");
    if (!userId) return;

    try {
      this.setData({ loading: true });
      const families = await familyAPI.getUserFamilies();
      this.setData({ userFamilies: families, loading: false });

      if (families && families.length > 0) {
        await this.loadFamilyMembers(families[0].id);
      }
    } catch (error) {
      console.error("加载家庭群组失败:", error);
      this.setData({ loading: false });
    }
  },

  async loadFamilyMembers(familyGroupId) {
    try {
      const members = await familyAPI.getFamilyMembers(familyGroupId);
      this.setData({ familyMembers: members });
    } catch (error) {
      console.error("加载家庭成员失败:", error);
    }
  },

  onSelectFamily(e) {
    const index = e.currentTarget.dataset.index;
    const family = this.data.userFamilies[index];
    this.setData({ selectedFamilyIndex: index });
    this.loadFamilyMembers(family.id);
  },

  onCreateFamily() {
    this.setData({
      showCreateFamilyModal: true,
      createFamilyForm: { name: "", description: "" }
    });
  },

  onCloseCreateFamilyModal() {
    this.setData({ showCreateFamilyModal: false });
  },

  onCreateFamilyFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`createFamilyForm.${field}`]: e.detail.value });
  },

  async onCreateFamilyConfirm() {
    const { name, description } = this.data.createFamilyForm;

    if (!name || !name.trim()) {
      wx.showToast({ title: "请输入家庭名称", icon: "none" });
      return;
    }

    const userId = wx.getStorageSync("userId");
    try {
      this.setData({ loading: true });
      await familyAPI.createFamily({ ownerUserId: userId, name: name.trim(), description: description.trim() });
      this.setData({ loading: false, showCreateFamilyModal: false });
      wx.showToast({ title: "家庭群组创建成功", icon: "success" });
      await this.loadUserFamilies();
    } catch (error) {
      console.error("创建家庭群组失败:", error);
      this.setData({ loading: false });
      wx.showToast({ title: "创建失败", icon: "none" });
    }
  },

  onRemoveMember(e) {
    const { userId: targetUserId, nickname } = e.currentTarget.dataset;
    const family = this.data.userFamilies[this.data.selectedFamilyIndex];

    wx.showModal({
      title: "确认移除",
      content: `确定要移除成员"${nickname}"吗？`,
      confirmColor: "#FF6B6B",
      success: async (res) => {
        if (res.confirm) {
          try {
            await familyAPI.removeMember(family.id, targetUserId);
            wx.showToast({ title: "已移除成员", icon: "success" });
            await this.loadFamilyMembers(family.id);
          } catch (error) {
            wx.showToast({ title: "移除失败", icon: "none" });
          }
        }
      }
    });
  },

  async loadInvitationCodes() {
    if (this.data.userFamilies.length === 0) return;

    const family = this.data.userFamilies[this.data.selectedFamilyIndex];
    try {
      const codes = await invitationAPI.listCodes(family.id);
      this.setData({ invitationCodes: codes });
    } catch (error) {
      console.error("加载邀请码失败:", error);
    }
  },

  onOpenCreateModal() {
    this.setData({
      showCreateModal: true,
      createForm: { maxUses: 10 }
    });
  },

  onCloseCreateModal() {
    this.setData({ showCreateModal: false, createForm: { maxUses: 10 } });
  },

  onCreateFormInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`createForm.${field}`]: e.detail.value });
  },

  async onCreateInvitationCode() {
    const family = this.data.userFamilies[this.data.selectedFamilyIndex];
    const { maxUses } = this.data.createForm;

    if (!family) {
      wx.showToast({ title: "请先选择家庭群组", icon: "none" });
      return;
    }

    try {
      this.setData({ loading: true });
      await invitationAPI.createCode(family.id, maxUses);
      this.setData({ loading: false, showCreateModal: false });
      wx.showToast({ title: "邀请码创建成功", icon: "success" });
      await this.loadInvitationCodes();
    } catch (error) {
      console.error("创建邀请码失败:", error);
      this.setData({ loading: false });
      wx.showToast({ title: "创建失败", icon: "none" });
    }
  },

  onCopyCode(e) {
    const { code } = e.currentTarget.dataset;
    wx.setClipboardData({
      data: code,
      success: () => {
        this.setData({ copiedCode: code });
        wx.showToast({ title: "已复制邀请码", icon: "success" });
      }
    });
  },

  async onDeleteCode(e) {
    const { id, code } = e.currentTarget.dataset;
    const family = this.data.userFamilies[this.data.selectedFamilyIndex];

    wx.showModal({
      title: "确认删除",
      content: `确定要删除邀请码"${code}"吗？`,
      confirmColor: "#FF6B6B",
      success: async (res) => {
        if (res.confirm) {
          try {
            await invitationAPI.deleteCode(family.id, id);
            wx.showToast({ title: "已删除邀请码", icon: "success" });
            await this.loadInvitationCodes();
          } catch (error) {
            wx.showToast({ title: "删除失败", icon: "none" });
          }
        }
      }
    });
  },

  onJoinFormInput(e) {
    this.setData({ "joinForm.code": e.detail.value });
  },

  async onValidateCode() {
    const { code } = this.data.joinForm;

    if (!code || code.length !== 8) {
      wx.showToast({ title: "请输入8位邀请码", icon: "none" });
      return;
    }

    try {
      this.setData({ loading: true, joinPreview: null });
      const preview = await invitationAPI.validateCode(code);
      this.setData({ loading: false, joinPreview: preview });
    } catch (error) {
      console.error("验证邀请码失败:", error);
      this.setData({ loading: false });
      wx.showToast({ title: "邀请码无效或已过期", icon: "none" });
    }
  },

  async onAcceptInvite() {
    const { code } = this.data.joinForm;

    if (!code) {
      wx.showToast({ title: "请输入邀请码", icon: "none" });
      return;
    }

    wx.showModal({
      title: "确认加入",
      content: "确定要加入这个家庭群组吗？加入后可以共享记账数据。",
      confirmColor: "#6FCF97",
      success: async (res) => {
        if (res.confirm) {
          try {
            this.setData({ loading: true });
            await invitationAPI.acceptInvite(code);
            this.setData({ loading: false, joinForm: { code: "" }, joinPreview: null });
            wx.showToast({ title: "已加入家庭群组", icon: "success" });
            await this.loadUserFamilies();

            this.setData({
              activeTabIndex: 0,
              currentTab: "groups"
            });
          } catch (error) {
            console.error("加入失败:", error);
            this.setData({ loading: false });
            const msg = error.data?.message || error.message || "加入失败";
            wx.showToast({ title: msg, icon: "none" });
          }
        }
      }
    });
  },

  onShareInvitation() {
    wx.showToast({
      title: "分享功能开发中",
      icon: "none"
    });
  }
});
