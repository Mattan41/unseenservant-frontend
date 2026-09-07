# Phase 3 Audit Snapshot

> Snapshot from the initial audit — reflects component state before
> Phase 3 refactoring. Not maintained afterward.

---

## Component / File Inventory

| Component | File | Type | Store access? |
|-----------|------|------|---------------|
| BaseButton | `src/components/base/BaseButton.vue` | Dumb | No |
| BaseCard | `src/components/base/BaseCard.vue` | Dumb | No |
| HeaderComponent | `src/components/HeaderComponent.vue` | Layout | Yes (exempt) |
| FooterComponent | `src/components/FooterComponent.vue` | Layout | No (exempt) |
| NotificationComponent | `src/components/NotificationComponent.vue` | Layout | Yes (exempt) |
| CampaignHeader | `src/features/campaign/components/CampaignHeader.vue` | Dumb | No |
| CampaignList | `src/features/campaign/components/CampaignList.vue` | Smart | Yes — should be dumb |
| CampaignSidebar | `src/features/campaign/components/CampaignSidebar.vue` | Dumb | No |
| CampaignSettings | `src/features/campaign/components/CampaignSettings.vue` | Smart | Yes — should be dumb |
| CreateCampaign | `src/features/campaign/components/CreateCampaign.vue` | Smart | Yes — should be dumb |
| EditCampaignModal | `src/features/campaign/components/EditCampaignModal.vue` | Smart | Yes — should be dumb |
| ImportCharacterModal | `src/features/campaign/components/ImportCharacterModal.vue` | Smart | Yes — should be dumb |
| CampaignImage | `src/features/campaign/components/CampaignImage.vue` | Dumb | No |
| CharacterList | `src/features/character/components/CharacterList.vue` | Smart | Yes — should be dumb |
| CreateCharacter | `src/features/character/components/CreateCharacter.vue` | Smart | Yes — should be dumb |
| EditCharacter | `src/features/character/components/EditCharacter.vue` | Smart | Yes — should be dumb |
| CharacterImage | `src/features/character/components/CharacterImage.vue` | Dumb | No |
| MessageBoard | `src/features/message/components/MessageBoard.vue` | Smart | Yes — should be dumb |
| SpellSearch | `src/features/spell/components/SpellSearch.vue` | Dumb | No (uses storeToRefs via props/emit) |
| SpellCard | `src/features/spell/components/SpellCard.vue` | Dumb | No |
| SpellDetailModal | `src/features/spell/components/SpellDetailModal.vue` | Dumb | No |
| CampaignView | `src/features/campaign/views/CampaignView.vue` | View | Yes (exempt) |
| CampaignsView | `src/features/campaign/views/CampaignsView.vue` | View | Yes (exempt) |
| CharacterView | `src/features/character/views/CharacterView.vue` | View | Yes (exempt) |
| CharactersView | `src/features/character/views/CharactersView.vue` | View | Yes (exempt) |
| UserProfileView | `src/features/user/UserProfileView.vue` | View | Yes (exempt) |
| HomeView | `src/views/HomeView.vue` | View | Yes (exempt) |
| AboutView | `src/views/AboutView.vue` | View | No (exempt) |
| UnderConstructionView | `src/views/UnderConstructionView.vue` | View | No (exempt) |
| LoginComponent | `src/features/auth/LoginComponent.vue` | View-like | Yes (exempt — is top-level auth entry) |
| LoginForm | `src/features/auth/LoginForm.vue` | Smart | Yes (auth-specific) |
| OAuthRedirect | `src/features/auth/OAuthRedirect.vue` | View | Yes (exempt) |
| LogoutView | `src/features/auth/LogoutView.vue` | View | Yes (exempt) |

View components and layout components (Header, Footer, NotificationComponent)
are exempt from the dumb-component rule per ARCHITECTURE.md. Components
marked "should be dumb" above are feature components with store access —
fixing those is a separate architectural concern outside the scope of this
colour/style migration.
