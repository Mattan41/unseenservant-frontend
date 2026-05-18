import apiClient from '@/api/apiClient';

const CampaignService = {
  async fetchAllCampaigns() {
    const response = await apiClient.get('api/campaigns');
    return response.data;
  },

  async fetchAllCampaignsForCurrentUser() {
    const response = await apiClient.get('api/campaigns/me');
    return response.data;
  },

  async createCampaign(name, description) {
    const response = await apiClient.post('api/campaigns', {name, description});
    return response.data;
  },

  async fetchCampaign(id) {
    const response = await apiClient.get(`api/campaigns/${id}`);
    return response.data;
  },

  // Method for searching users to add to campaign uses the users endpoint
  async searchUsers(query) {
    const response = await apiClient.get(`api/users/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },


  // this method updates the campaign name and description together
  async updateCampaignInfo(campaignId, {name, description}) {
    const response = await apiClient.put(`api/campaigns/${campaignId}`, {name, description});
    return response.data;
  },

  async uploadCampaignImage(campaignId, imageFile) {
    const formData = new FormData();
    formData.append('file', imageFile);
    const response = await apiClient.post(`api/campaigns/${campaignId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async deleteCampaign(campaignId) {
    const response = await apiClient.delete(`api/campaigns/${campaignId}`);
    return response.data;
  },

  // method for transferring ownership of a campaign, send the new owner id, as well as the campaign id
  async transferCampaignOwnership(campaignId, newOwnerId) {
    const response = await apiClient.patch(`api/campaigns/${campaignId}/owner`, {newOwnerId});
    return response.data;
  },

  async addParticipants(campaignId, participantsToAdd) {
    const response = await apiClient.patch(`api/campaigns/${campaignId}/participants`, {
      participantsToAdd: participantsToAdd,
      participantIdsToRemove: []
    });
    return response.data;
  },

  async removeParticipants(campaignId, participantIdsToRemove) {
    const response = await apiClient.patch(`api/campaigns/${campaignId}/participants`, {
      participantsToAdd: [],
      participantIdsToRemove: participantIdsToRemove
    });
    return response.data;
  },

  async updateParticipantNickname(campaignId, participantId, nickname) {
    const response = await apiClient.patch(`api/campaigns/${campaignId}/participants/${participantId}/nickname`,
      nickname,
      {
        headers: {'Content-Type': 'text/plain'}
      }
    );
    return response.data;
  },

  async updateParticipantRole(campaignId, participantId, role) {
    const response = await apiClient.patch(`api/campaigns/${campaignId}/participants/${participantId}/role`, role, {
      headers: {'Content-Type': 'text/plain'}
    });
    return response.data;
  },

  async fetchCharactersForCampaign(campaignId) {
    const response = await apiClient.get(`api/characters?campaignId=${campaignId}`);
    return response.data;
  },

  async addCharacterToCampaign(characterId, campaignId) {
    const response = await apiClient.patch(`api/characters/${characterId}/campaign`,
      {campaignId: campaignId}, {});
    return response.data;
  },

  async removeCharacterFromCampaign(characterId) {
    const response = await apiClient.delete(`api/characters/${characterId}/campaign`);
    return response.data;
  }


};

export default CampaignService;
