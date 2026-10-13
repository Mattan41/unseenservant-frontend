import { describe, it, expect, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import ExportMenu from '@/components/base/ExportMenu.vue'

// The panel is teleported to <body>, so assert against the document, not the
// component wrapper.
const menuIn = () => document.querySelector('.export-menu')
const itemsIn = () => Array.from(document.querySelectorAll('.export-menu-item'))

let wrapper

afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

function mountMenu(props = {}) {
  wrapper = mount(ExportMenu, {
    attachTo: document.body,
    props: { formats: [{ id: 'md', label: 'Markdown (.md)' }], ...props },
  })
  return wrapper
}

describe('ExportMenu', () => {
  it('reveals the formats when the trigger is clicked', async () => {
    const menu = mountMenu()
    expect(menuIn()).toBeNull()
    await menu.get('button').trigger('click')
    await nextTick()
    expect(menuIn()).not.toBeNull()
  })

  it('emits the chosen format id and closes the menu', async () => {
    const menu = mountMenu()
    await menu.get('button').trigger('click')
    await nextTick()
    itemsIn()[0].click()
    await nextTick()
    expect(wrapper.emitted('export')[0]).toEqual(['md'])
    expect(menuIn()).toBeNull()
  })

  it('does not open while disabled', async () => {
    const menu = mountMenu({ disabled: true })
    await menu.get('button').trigger('click')
    await nextTick()
    expect(menuIn()).toBeNull()
  })
})
