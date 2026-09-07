# Frontend Styling Plan — unseenservant-frontend

> Phased migration toward a consistent semantic-class styling system.
> Phase numbering here is the single source of truth for project order.

---

## Phase 1 — Audit & STYLE_GUIDE.md
- Deliverable: `STYLE_GUIDE.md` (color token map, semantic class catalog,
  hard constraints, where-to-add rules)
- Deliverable: `PHASE3_AUDIT_SNAPSHOT.md` (point-in-time component inventory
  from initial audit)

## Phase 2 — Eliminate raw Tailwind color utilities and finish button migration

~250 violations across ~25 files. Split into sequential, reviewable
file-group commits. Each group verified independently against:

```
grep -rnP 'class="[^"]*\b(bg|text|border|ring|from|via|to)-(?!opacity|[trbl]-[0-9])[a-z]+-[0-9]+' src/
```

### File-group order and scope

| Step | Feature / group | Files | Est. violations |
|------|----------------|-------|-----------------|
| 2.1 | auth | `LoginComponent.vue`, `LoginForm.vue`, `OAuthRedirect.vue`, `LogoutView.vue` | ~20 |
| 2.2 | campaign | `CampaignHeader.vue`, `CampaignList.vue`, `CampaignSidebar.vue`, `CampaignSettings.vue`, `CampaignView.vue`, `CampaignsView.vue`, `CreateCampaign.vue`, `EditCampaignModal.vue`, `ImportCharacterModal.vue` | ~45 |
| 2.3 | character | `CharacterList.vue`, `CreateCharacter.vue`, `EditCharacter.vue`, `CharacterView.vue`, `CharactersView.vue` | ~35 |
| 2.4 | spell | `SpellSearch.vue`, `SpellCard.vue`, `SpellDetailModal.vue` | ~30 |
| 2.5 | message | `MessageBoard.vue` | ~6 |
| 2.6 | shared / base components | `BaseCard.vue`, `HeaderComponent.vue`, `FooterComponent.vue`, `NotificationComponent.vue`, `App.vue` | ~30 |
| 2.7 | remaining views | `AboutView.vue`, `UnderConstructionView.vue`, `HomeView.vue`, `UserProfileView.vue` | ~50 |

### Per-step checklist

1. Replace raw color utilities with existing semantic classes where possible
2. Add new semantic classes to `main.css` or `base-button.css` for repeated
   patterns (`.spinner`, `.demo-notice`, `.input-field`, `.section-primary`)
3. Migrate `.button-*` → `<BaseButton>` within the step's files:
   - Step 2.2: `ImportCharacterModal.vue` (`.button-add`) and
     `CampaignView.vue` (`.button-primary`) — both done ✅
   - Step 2.3: `CharacterView.vue` has `.button-primary` and
     `.button-secondary` usages
4. Extract `<BaseModal>` when the overlay pattern is touched (likely in step
   2.2 or 2.3)
5. Replace NotificationComponent hex values with the `.notification-base`
   class (step 2.6)
6. Run both grep checks — must return zero hits for files in that group
   before moving to the next step:
   - Raw Tailwind color utilities: `grep -rnP 'class="[^"]*\b(bg|text|border|ring|from|via|to)-(?!opacity|[trbl]-[0-9])[a-z]+-[0-9]+' src/`
   - Remaining `.button-*` usages: `grep -rn 'class="button' src/`

### New CSS variables (Phase 2 deliverable)
- Add `--color-surface`, `--color-border-default`, `--color-text-muted`
  to `main.css`
- Wire into semantic classes that currently use hard references
  (e.g. `BaseCard.vue` `bg-white` → `bg-[var(--color-surface)]`)

## Phase 3 — Message board / participants redesign
- Redesign collapsible participants panel and message board UI per
  updated design specifications
- Extract `<BaseModal>` for any modal dialogs introduced or refactored
  during this phase

## Phase 4 — Theming
- `--color-surface` and other semantic-role variables already reference
  the primary scale, so they track per-environment automatically
- Implement additional theme-level variables as needed
- Definition of theme switching mechanism (data-env attributes, etc.)
