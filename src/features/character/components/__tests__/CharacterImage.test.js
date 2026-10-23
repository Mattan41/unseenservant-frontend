import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CharacterImage from '@/features/character/components/CharacterImage.vue'
import { DEFAULT_CHARACTER_IMAGE } from '@/features/character/dispatchers/systemRegistry.js'
import { OFFWORLDERS_CHARACTER_DEFAULT_IMAGE } from '@/systems/offworlders/constants.js'

const mountImage = (props) => mount(CharacterImage, { props })

describe('CharacterImage', () => {
  it('shows the generic portrait for a character with no image', () => {
    const wrapper = mountImage({ src: '' })

    expect(wrapper.attributes('src')).toBe(DEFAULT_CHARACTER_IMAGE)
  })

  it('chooses the placeholder by system', () => {
    const wrapper = mountImage({ src: '', systemType: 'OFFWORLDERS' })

    expect(wrapper.attributes('src')).toBe(OFFWORLDERS_CHARACTER_DEFAULT_IMAGE)
  })

  it("keeps a caller's placeholder above the system's own", () => {
    const wrapper = mountImage({
      src: '',
      systemType: 'OFFWORLDERS',
      defaultSrc: '/caller-placeholder.svg',
    })

    expect(wrapper.attributes('src')).toBe('/caller-placeholder.svg')
  })

  it('falls back to the system art when a real image fails to load', async () => {
    const wrapper = mountImage({
      src: 'https://example.test/broken.png',
      systemType: 'OFFWORLDERS',
    })

    await wrapper.trigger('error')

    expect(wrapper.attributes('src')).toBe(OFFWORLDERS_CHARACTER_DEFAULT_IMAGE)
  })

  it('leaves a real image alone', () => {
    const wrapper = mountImage({
      src: 'https://example.test/portrait.png',
      systemType: 'OFFWORLDERS',
    })

    expect(wrapper.attributes('src')).toBe('https://example.test/portrait.png')
  })
})
