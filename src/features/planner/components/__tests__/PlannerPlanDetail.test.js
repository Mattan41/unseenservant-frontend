import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import PlannerDateRow from '@/features/planner/components/PlannerDateRow.vue'
import PlannerPlanDetail from '@/features/planner/components/PlannerPlanDetail.vue'
import PlannerUnsavedChangesDialog from '@/features/planner/components/PlannerUnsavedChangesDialog.vue'
import { formatPlanDate } from '@/features/planner/plannerUtils.js'

/**
 * The dates list and its one-at-a-time editor.
 *
 * The rule worth pinning down: opening one date's editor and switching to another
 * must not silently throw the typing away — the dialog asks, and each of its three
 * answers does what it says it does.
 */
const date = (id, day) => ({
  id,
  date: day,
  startTime: null,
  endTime: null,
  note: null,
  createdByUserId: 7,
  version: 0,
  attendances: [],
})

const plan = {
  id: 4,
  campaignId: 1,
  title: 'Session 12',
  description: '',
  status: 'OPEN',
  decidedDateId: null,
  createdByUserId: 7,
  version: 0,
  dates: [date(9, '2026-03-14'), date(10, '2026-03-21')],
  members: [
    { userId: 7, nickname: 'User7', role: 'GM', excluded: false, removedByOwner: false },
    { userId: 8, nickname: 'User8', role: 'PLAYER', excluded: true, removedByOwner: true },
  ],
}

const mountDetail = () =>
  mount(PlannerPlanDetail, { props: { plan, currentUserId: 7, canEditDate: () => true } })

/** The rows, in the order the plan lists them. */
const rows = (wrapper) => wrapper.findAllComponents(PlannerDateRow)

/** The rows whose editor is open — at most one, by design. */
const editingRows = (wrapper) => rows(wrapper).filter((row) => row.props('isEditing'))

/**
 * How many editors are actually *rendered*. Kept separate from `editingRows` on
 * purpose: the prop says what the row was told, this says what a person sees, and the
 * two disagreed once — every row drew the form because the row drew its `editor` slot
 * unconditionally.
 */
const renderedEditors = (wrapper) =>
  wrapper.findAll('form').filter((form) => form.text().includes('Correct this date'))

/** Click "Edit" in one row, the way a person would. */
async function clickEdit(wrapper, index) {
  const button = rows(wrapper)[index]
    .findAll('button')
    .find((candidate) => candidate.text() === 'Edit')
  await button.trigger('click')
}

/** Type into the open editor's note field: the only text input inside a row. */
async function typeNote(wrapper, index, text) {
  await rows(wrapper)[index].find('input[type="text"]').setValue(text)
}

/** One of the dialog's buttons, by its label. */
async function answerDialog(wrapper, label) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === label)
  await button.trigger('click')
}

describe('PlannerPlanDetail — one date at a time', () => {
  it('keeps every date collapsed until its own Edit is clicked', async () => {
    const wrapper = mountDetail()

    expect(rows(wrapper)).toHaveLength(2)
    expect(renderedEditors(wrapper)).toHaveLength(0)

    await clickEdit(wrapper, 0)

    // One editor, inside that date's row, and no trace of one in the other.
    expect(renderedEditors(wrapper)).toHaveLength(1)
    expect(rows(wrapper)[0].find('form').exists()).toBe(true)
    expect(rows(wrapper)[1].find('form').exists()).toBe(false)

    expect(editingRows(wrapper)[0].props('date').id).toBe(9)
    expect(rows(wrapper)[0].text()).toContain('Correct this date')
    // The editor grew inside the row of the day it edits.
    expect(rows(wrapper)[0].text()).toContain(formatPlanDate('2026-03-14'))
  })

  it('switches between dates without asking while nothing is unsaved', async () => {
    const wrapper = mountDetail()

    await clickEdit(wrapper, 0)
    await clickEdit(wrapper, 1)

    expect(wrapper.findComponent(PlannerUnsavedChangesDialog).exists()).toBe(false)
    expect(renderedEditors(wrapper)).toHaveLength(1)
    expect(rows(wrapper)[1].find('form').exists()).toBe(true)
    expect(rows(wrapper)[0].find('form').exists()).toBe(false)
    expect(editingRows(wrapper)[0].props('date').id).toBe(10)
  })

  it('asks before discarding unsaved changes', async () => {
    const wrapper = mountDetail()

    await clickEdit(wrapper, 0)
    await typeNote(wrapper, 0, 'Bring snacks')
    await clickEdit(wrapper, 1)

    expect(wrapper.findComponent(PlannerUnsavedChangesDialog).exists()).toBe(true)
    // The date that was asked for did not open behind the dialog.
    expect(renderedEditors(wrapper)).toHaveLength(1)
    expect(editingRows(wrapper)[0].props('date').id).toBe(9)

    await answerDialog(wrapper, 'Discard changes')

    expect(wrapper.findComponent(PlannerUnsavedChangesDialog).exists()).toBe(false)
    expect(editingRows(wrapper)[0].props('date').id).toBe(10)
    expect(wrapper.emitted('update-date')).toBeUndefined()
  })

  it('saves the draft, then opens the date that was waiting', async () => {
    const wrapper = mountDetail()

    await clickEdit(wrapper, 0)
    await typeNote(wrapper, 0, 'Bring snacks')
    await clickEdit(wrapper, 1)

    await answerDialog(wrapper, 'Save changes')

    const saved = wrapper.emitted('update-date')[0][0]
    expect(saved.date.id).toBe(9)
    expect(saved.change.note).toBe('Bring snacks')
    expect(saved.change.version).toBeUndefined()
    expect(editingRows(wrapper)[0].props('date').id).toBe(10)
  })

  it('stays where it was on "Continue editing" — the draft still there', async () => {
    const wrapper = mountDetail()

    await clickEdit(wrapper, 0)
    await typeNote(wrapper, 0, 'Bring snacks')
    await clickEdit(wrapper, 1)

    await answerDialog(wrapper, 'Continue editing')

    expect(wrapper.findComponent(PlannerUnsavedChangesDialog).exists()).toBe(false)
    expect(renderedEditors(wrapper)).toHaveLength(1)
    expect(editingRows(wrapper)[0].props('date').id).toBe(9)
    expect(rows(wrapper)[0].find('input[type="text"]').element.value).toBe('Bring snacks')
  })

  it('guards Cancel the same way, because it discards too', async () => {
    const wrapper = mountDetail()

    await clickEdit(wrapper, 0)
    await typeNote(wrapper, 0, 'Bring snacks')

    const cancel = rows(wrapper)[0]
      .findAll('button')
      .find((candidate) => candidate.text() === 'Cancel')
    await cancel.trigger('click')

    expect(wrapper.findComponent(PlannerUnsavedChangesDialog).exists()).toBe(true)

    await answerDialog(wrapper, 'Discard changes')
    expect(editingRows(wrapper)).toHaveLength(0)
  })

  it('keeps the offer form independent of the open editor', async () => {
    const wrapper = mountDetail()

    await clickEdit(wrapper, 0)
    await typeNote(wrapper, 0, 'Bring snacks')

    // The form below the list has its own draft: opening an editor leaves it alone.
    const offerForm = wrapper
      .findAll('form')
      .find((form) => form.text().includes('Offer another date'))
    await offerForm.find('input[type="text"]').setValue('A new day')

    expect(rows(wrapper)[0].find('input[type="text"]').element.value).toBe('Bring snacks')
  })
})
