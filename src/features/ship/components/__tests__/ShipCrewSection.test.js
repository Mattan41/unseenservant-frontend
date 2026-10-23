import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ShipCrewSection from '@/features/ship/components/ShipCrewSection.vue'

const mounted = []
afterEach(() => {
  while (mounted.length) mounted.pop().unmount()
})

// A signed-in user with one existing crew entry, so entering edit mode renders
// a character row (and therefore the inputs SonarQube flagged).
function mountSection() {
  const wrapper = mount(ShipCrewSection, {
    props: {
      currentUserId: 1,
      crew: [
        {
          userId: 1,
          nickname: 'Me',
          role: 'PLAYER',
          notes: '',
          characters: [{ name: 'Aria', roleOnShip: 'Pilot' }],
          imageUrls: [],
        },
      ],
    },
  })
  mounted.push(wrapper)
  return wrapper
}

function editButton(wrapper) {
  return wrapper.findAll('button').find((button) => /edit my entry/i.test(button.text()))
}

describe('ShipCrewSection', () => {
  it('associates the character row inputs with labels', async () => {
    const wrapper = mountSection()

    await editButton(wrapper).trigger('click')

    // Each input carries an id and a matching <label for>, so it has an
    // accessible name (the SonarQube wcag2-a rule).
    const nameInput = wrapper.get('#crew-character-name-0')
    expect(wrapper.get('label[for="crew-character-name-0"]').text()).toBe('Character name')
    expect(nameInput.attributes('id')).toBe('crew-character-name-0')

    const roleInput = wrapper.get('#crew-character-role-0')
    expect(wrapper.get('label[for="crew-character-role-0"]').text()).toBe('Role on ship')
    expect(roleInput.attributes('id')).toBe('crew-character-role-0')
  })

  it('associates the crew image file input with a label', async () => {
    const wrapper = mountSection()

    await editButton(wrapper).trigger('click')

    const fileInput = wrapper.get('#crew-image-upload')
    expect(fileInput.attributes('type')).toBe('file')
    expect(wrapper.get('label[for="crew-image-upload"]').text()).toBe('Upload crew image')
  })

  it('emits size-error instead of add-image for an image over the limit', async () => {
    const wrapper = mountSection()

    await editButton(wrapper).trigger('click')

    const fileInput = wrapper.get('#crew-image-upload')
    const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'x.png')
    Object.defineProperty(fileInput.element, 'files', { value: [oversized] })

    await fileInput.trigger('change')

    // The parent turns the sentence into a notification, so the component only
    // reports it — and the oversized file is never handed on for upload.
    expect(wrapper.emitted('size-error')).toHaveLength(1)
    expect(wrapper.emitted('size-error')[0][0]).toContain('maximum')
    expect(wrapper.emitted('add-image')).toBeUndefined()
  })
})
