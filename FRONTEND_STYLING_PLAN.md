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
   - All colors (including our own palette): `grep -rnP 'class="[^"]*\b(bg|text|border|ring|from|via|to)-(?!opacity|[trbl]-[0-9])[a-z]+-[0-9]+' src/`
   - Our own palette utilities specifically: `grep -rnP 'class="[^"]*\b(bg|text|border|ring|from|via|to)-(primary|secondary|third)-[0-9]+' src/features/auth/ src/features/campaign/ src/features/character/`
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
## Phase 5 — Dark/Light Mode (design note)

Dark/light mode is planned as an axis orthogonal to color theme, controlled
by a second attribute (proposed: `html[data-mode='light'|'dark']`) alongside
`html[data-theme='green'|'blue'|...]`. Goal: components never use Tailwind's
`dark:` variant classes — every dark/light difference is resolved by which
CSS variable value is active for the current `[data-theme][data-mode]`
combination, the same way `[data-env]` resolves `--primary-*` today.

Two variable/class groups vary independently:

- **Mode-driven neutrals & status colors:** `--color-surface` (variable), the
  `.text-subtle`/`.text-muted`/`.text-secondary`/`.text-default` and
  `.border-subtle`/`.border-default` role classes (introduced in Phase 2, see
  `STYLE_GUIDE.md` §2.3), and new `danger`/`success`/`warning`/`info` tokens
  to replace the hardcoded reds/greens/yellows currently in `.error-message`,
  `.success-message`, and the `.badge-*` classes — all of these need explicit
  light AND dark values for contrast. Whether the role classes stay
  class-based or move to CSS variables at that point is a Phase 5 decision;
  either way the naming (`subtle`/`muted`/`secondary`/`default`) should stay
  consistent with what Phase 2 already established.

- **Theme-driven accent scale:** `--color-primary-*` (and `secondary`/`third`),
  plus a mode-aware rule for which shade `text-on-accent` uses (e.g.
  `shade-700` in light mode, `shade-300` in dark mode) instead of doubling
  every theme's full palette per mode.

Out of scope for current Phase 2 work — to be designed in full when Phase 5
begins. Recorded here so it isn't lost.
