import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseNoteSections from '@/components/base/BaseNoteSections.vue'

const SECTIONS = [
  { id: 's1', title: 'Cargo', body: 'Two crates of medical supplies.' },
  { id: 's2', title: 'Passengers', body: 'The Voss family.' },
]

const wrappers = []
afterEach(() => {
  while (wrappers.length) wrappers.pop().unmount()
})

function mountList(props = {}) {
  const wrapper = mount(BaseNoteSections, { props: { sections: SECTIONS, ...props } })
  wrappers.push(wrapper)
  return wrapper
}

const buttonByText = (wrapper, text) =>
  wrapper.findAll('button').find((button) => button.text() === text)

/**
 * The shared sections list: one card per section, an inline add form, an inline
 * editor, and no write controls at all when the parent says the viewer may not
 * write. It never talks to a store — every change is an event.
 */
describe('BaseNoteSections — reading', () => {
  it('renders one list item per section, with its title and body', () => {
    const wrapper = mountList()

    const items = wrapper.findAll('li')
    expect(items).toHaveLength(2)
    expect(items[0].find('h5').text()).toBe('Cargo')
    expect(items[0].text()).toContain('Two crates of medical supplies.')
  })

  it('shows the empty state when there are no sections', () => {
    const wrapper = mountList({ sections: [] })

    expect(wrapper.find('.empty-cta').exists()).toBe(true)
    expect(wrapper.text()).toContain('No sections yet.')
    expect(wrapper.findAll('li')).toHaveLength(0)
  })

  it('offers no write controls to a viewer who may not edit', () => {
    const wrapper = mountList({ editable: false })

    expect(buttonByText(wrapper, 'Add section')).toBeFalsy()
    expect(buttonByText(wrapper, 'Edit')).toBeFalsy()
    expect(buttonByText(wrapper, 'Delete')).toBeFalsy()
  })
})

describe('BaseNoteSections — adding', () => {
  it('emits the new section from the inline form', async () => {
    const wrapper = mountList({ editable: true })

    await buttonByText(wrapper, 'Add section').trigger('click')
    await wrapper.find('#new-section-title').setValue('Leads')
    await wrapper.find('#new-section-body').setValue('A rumour about the Dry Dock.')
    await buttonByText(wrapper, 'Add section').trigger('click')

    expect(wrapper.emitted('add')).toHaveLength(1)
    expect(wrapper.emitted('add')[0][0]).toEqual({
      title: 'Leads',
      body: 'A rumour about the Dry Dock.',
    })
  })

  it('closes the form after adding, and refuses an empty section', async () => {
    const wrapper = mountList({ editable: true })

    await buttonByText(wrapper, 'Add section').trigger('click')
    await buttonByText(wrapper, 'Add section').trigger('click')
    expect(wrapper.emitted('add')).toBeUndefined()
    expect(wrapper.find('#new-section-title').exists()).toBe(true)

    await wrapper.find('#new-section-title').setValue('Log')
    await buttonByText(wrapper, 'Add section').trigger('click')

    expect(wrapper.emitted('add')).toHaveLength(1)
    expect(wrapper.find('#new-section-title').exists()).toBe(false)
  })
})

describe('BaseNoteSections — editing and deleting', () => {
  it('emits the edited section, keeping its id', async () => {
    const wrapper = mountList({ editable: true })

    await buttonByText(wrapper, 'Edit').trigger('click')
    await wrapper.find('#section-title-s1').setValue('Cargo hold')
    await wrapper.find('#section-body-s1').setValue('Three crates now.')
    await buttonByText(wrapper, 'Save').trigger('click')

    expect(wrapper.emitted('update')[0][0]).toEqual({
      id: 's1',
      title: 'Cargo hold',
      body: 'Three crates now.',
    })
  })

  it('discards the edit on Cancel', async () => {
    const wrapper = mountList({ editable: true })

    await buttonByText(wrapper, 'Edit').trigger('click')
    await wrapper.find('#section-body-s1').setValue('Abandoned')
    await buttonByText(wrapper, 'Cancel').trigger('click')

    expect(wrapper.emitted('update')).toBeUndefined()
    expect(wrapper.find('#section-body-s1').exists()).toBe(false)
  })

  it('asks before deleting, and emits the id once confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mountList({ editable: true })

    await buttonByText(wrapper, 'Delete').trigger('click')

    expect(confirm).toHaveBeenCalledWith('Delete this section?')
    expect(wrapper.emitted('remove')[0]).toEqual(['s1'])
    confirm.mockRestore()
  })

  it('does not delete when the confirmation is declined', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mountList({ editable: true })

    await buttonByText(wrapper, 'Delete').trigger('click')

    expect(wrapper.emitted('remove')).toBeUndefined()
    confirm.mockRestore()
  })
})
