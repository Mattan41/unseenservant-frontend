import { toValue, watch } from 'vue'
import { recordView } from '@/utils/viewHistory.js'

/**
 * Records that the current user has viewed a record (a campaign, a character),
 * which is what the lists order by (see `viewHistory.js`).
 *
 * Recording lives in the view rather than in a store fetch action on purpose:
 * `campaignStore.fetchCampaign` also runs for side reads — `CharacterView`
 * fetches the campaign only to show a character's campaign name — and such a
 * read must not count as having viewed that campaign.
 *
 * The watcher is immediate and also watches the user id, because the profile
 * loads asynchronously (`App.vue`): on a cold deep link the id is still `null`
 * when the view mounts, and the view is recorded as soon as it arrives.
 *
 * @param {string} kind - one of `VIEW_KINDS` in `viewHistory.js`
 * @param {(() => *)|import('vue').Ref|*} idSource - viewed record's id
 * @param {(() => *)|import('vue').Ref|*} userIdSource - current viewer's id
 */
export function useViewRecency(kind, idSource, userIdSource) {
  watch(
    () => [toValue(idSource), toValue(userIdSource)],
    ([id, userId]) => recordView(kind, id, userId),
    { immediate: true },
  )
}
