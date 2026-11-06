import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ShipSheet from '@/features/ship/components/ShipSheet.vue'
import { useUnsavedChanges } from '@/utils/useUnsavedChanges.js'

// The sheet registers a route guard, and nothing here is about routing.
vi.mock('@/utils/useUnsavedChanges.js', () => ({
  useUnsavedChanges: vi.fn(),
  confirmDiscardUnsavedChanges: vi.fn(() => true),
}))

/** A normalized ship block, as `normalizeShipData` hands it to the sheet. */
const SHIP = {
  id: 3,
  campaignId: 1,
  name: 'The Desert Rose',
  hull: 15,
  hullMax: 15,
  armor: 0,
  damage: '1D6',
  driveFuel: 4,
  maxDriveFuel: 4,
  credits: 100,
  upgrades: ['Fuel Tanks'],
  notes: 'A borrowed freighter.',
  imageUrl: '',
  imageUrls: [],
  version: 4,
  updatedAt: '2026-11-05T09:00:00Z',
}

const wrappers = []
afterEach(() => {
  while (wrappers.length) wrappers.pop().unmount()
})

function mountSheet(props = {}) {
  const wrapper = mount(ShipSheet, {
    props: { ship: { ...SHIP }, updateSource: 'fetch', ...props },
  })
  wrappers.push(wrapper)
  return wrapper
}

const buttonByText = (wrapper, text) =>
  wrapper.findAll('button').find((button) => button.text() === text)

const nameInput = (wrapper) => wrapper.find('#ship-name')

async function startEditing(wrapper) {
  await buttonByText(wrapper, 'Edit ship').trigger('click')
}

/**
 * The edit-mode bugs this pins down: a background refresh must not close the
 * editor or drop the draft, while the sheet's own writes still move it on, and a
 * save must carry the version the draft was based on (so an external change
 * conflicts instead of being silently overwritten).
 */
describe('ShipSheet — background refresh vs own writes', () => {
  it('keeps the editor open, and the unsaved edits, when a background refresh lands', async () => {
    const wrapper = mountSheet()
    await startEditing(wrapper)
    await nameInput(wrapper).setValue('Draft name')

    // The activity poll refetches the ship (source 'fetch'): somebody else
    // changed it, and the load replaces `ship` while the user is typing.
    await wrapper.setProps({
      ship: { ...SHIP, credits: 999, version: 5, updatedAt: '2026-11-06T10:00:00Z' },
      updateSource: 'fetch',
    })

    expect(nameInput(wrapper).exists()).toBe(true)
    expect(nameInput(wrapper).element.value).toBe('Draft name')
    expect(buttonByText(wrapper, 'Save ship')).toBeTruthy()
  })

  it('leaves edit mode and adopts the saved ship when its own save returns', async () => {
    const wrapper = mountSheet()
    await startEditing(wrapper)
    await nameInput(wrapper).setValue('Renamed')

    await wrapper.setProps({
      ship: { ...SHIP, name: 'Renamed', version: 5 },
      updateSource: 'save',
    })

    expect(nameInput(wrapper).exists()).toBe(false)
    expect(buttonByText(wrapper, 'Edit ship')).toBeTruthy()
  })

  it('keeps the draft through its own image operation and saves against the new version', async () => {
    const wrapper = mountSheet()
    await startEditing(wrapper)
    await nameInput(wrapper).setValue('Korven II')

    await wrapper.setProps({
      ship: { ...SHIP, imageUrls: [...SHIP.imageUrls, '/new.png'], version: 5 },
      updateSource: 'image',
    })

    expect(nameInput(wrapper).element.value).toBe('Korven II')

    await buttonByText(wrapper, 'Save ship').trigger('click')
    expect(wrapper.emitted('save')[0][0].version).toBe(5)
  })

  it('saves against the version the draft was based on, so an external change conflicts', async () => {
    const wrapper = mountSheet()
    await startEditing(wrapper)
    await nameInput(wrapper).setValue('Mine')

    // Somebody else changes the ship mid-edit; the poll brings it in.
    await wrapper.setProps({
      ship: { ...SHIP, name: 'Theirs', version: 9 },
      updateSource: 'fetch',
    })

    await buttonByText(wrapper, 'Save ship').trigger('click')

    // Not the version now sitting in the store (9): the draft's own, so the API
    // answers 409 instead of quietly overwriting the other person's change.
    expect(wrapper.emitted('save')[0][0].version).toBe(SHIP.version)
    expect(wrapper.emitted('save')[0][0].name).toBe('Mine')
  })

  it('discards the edits when the conflict banner Reload is used', async () => {
    const wrapper = mountSheet({ conflict: true })
    await startEditing(wrapper)
    await nameInput(wrapper).setValue('Abandoned')

    await buttonByText(wrapper, 'Reload').trigger('click')

    expect(wrapper.emitted('reload')).toHaveLength(1)
    expect(nameInput(wrapper).exists()).toBe(false)
  })
})

describe('ShipSheet — view-mode profile image', () => {
  it('offers a "Change image" button without entering edit mode', () => {
    // No `startEditing` call: the sheet is in view mode.
    const wrapper = mountSheet()

    expect(buttonByText(wrapper, 'Change image')).toBeTruthy()
    expect(wrapper.find('#ship-profile-image-input').exists()).toBe(true)
  })
})

/**
 * Sections sit beside the notes field and save on their own: the sheet emits the
 * whole list and the parent persists it, so a section edit never has to wait for
 * (or interfere with) the sheet's own Save.
 */
describe('ShipSheet — sections', () => {
  const SECTIONS = [
    { id: 's1', title: 'Cargo', body: 'Two crates of medical supplies.' },
    { id: 's2', title: 'Leads', body: 'A rumour about the Dry Dock.' },
  ]

  it('renders the ship sections in the order they arrived', () => {
    const wrapper = mountSheet({ ship: { ...SHIP, sections: SECTIONS } })

    const titles = wrapper.findAll('li h5').map((heading) => heading.text())
    expect(titles).toEqual(['Cargo', 'Leads'])
  })

  it('emits the whole list with the new section appended', async () => {
    const wrapper = mountSheet({ ship: { ...SHIP, sections: SECTIONS } })

    await buttonByText(wrapper, 'Add note').trigger('click')
    await wrapper.find('#new-section-title').setValue('Passengers')
    await wrapper.find('#new-section-body').setValue('The Voss family.')
    await buttonByText(wrapper, 'Add note').trigger('click')

    const emitted = wrapper.emitted('save-sections')
    expect(emitted).toHaveLength(1)
    expect(emitted[0][0]).toHaveLength(3)
    expect(emitted[0][0][2]).toMatchObject({ title: 'Passengers', body: 'The Voss family.' })
    expect(emitted[0][0][2].id).toBeTruthy()
  })

  it('emits the list without the deleted section', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mountSheet({ ship: { ...SHIP, sections: SECTIONS } })

    await buttonByText(wrapper, 'Delete').trigger('click')

    expect(wrapper.emitted('save-sections')[0][0]).toEqual([SECTIONS[1]])
    confirm.mockRestore()
  })

  it('counts a note being typed as unsaved work', async () => {
    const wrapper = mountSheet({ ship: { ...SHIP, sections: SECTIONS } })
    const isDirty = useUnsavedChanges.mock.calls.at(-1)[0]

    expect(isDirty()).toBe(false)

    await buttonByText(wrapper, 'Add note').trigger('click')
    await wrapper.find('#new-section-title').setValue('Passengers')

    expect(isDirty()).toBe(true)
  })

  it('keeps the editor open, and the unsaved edits, when a section save lands', async () => {
    const wrapper = mountSheet({ ship: { ...SHIP, sections: SECTIONS } })
    await startEditing(wrapper)
    await nameInput(wrapper).setValue('Draft name')

    // The section save replaced the store's ship; the draft must survive it and
    // follow the new version, exactly as it does for an image operation.
    await wrapper.setProps({
      ship: { ...SHIP, sections: [...SECTIONS, { id: 's3', title: 'Log', body: 'Day one.' }], version: 5 },
      updateSource: 'section',
    })

    expect(nameInput(wrapper).element.value).toBe('Draft name')

    await buttonByText(wrapper, 'Save ship').trigger('click')
    expect(wrapper.emitted('save')[0][0].version).toBe(5)
  })
})
