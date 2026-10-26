import { describe, it, expect, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ShipCharactersSection from '@/features/ship/components/ShipCharactersSection.vue'

const mounted = []
afterEach(() => {
  while (mounted.length) mounted.pop().unmount()
})

const participants = [
  { id: 'guest_demo', nickname: 'You - Guest', role: 'GM' },
  { id: 'guest_player_1', nickname: 'User1', role: 'PLAYER' },
]

const characters = [
  {
    id: 'guest_char_8',
    ownerId: 'guest_player_1',
    name: 'Kestrel',
    systemType: 'OFFWORLDERS',
    notes: 'Ex-military. Talks little, shoots straight.',
    imageUrls: ['/default-scifi-campaign.svg'],
  },
  {
    id: 'guest_char_9',
    ownerId: 'guest_player_2',
    name: 'Doc',
    systemType: 'OFFWORLDERS',
    notes: '',
    imageUrls: [],
  },
]

function mountSection(props = {}) {
  const wrapper = mount(ShipCharactersSection, {
    props: { characters, participants, ...props },
  })
  mounted.push(wrapper)
  return wrapper
}

describe('ShipCharactersSection', () => {
  it('renders one card per character, with the player who brings it', () => {
    const wrapper = mountSection()

    const cards = wrapper.findAll('li')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('Kestrel')
    expect(cards[0].text()).toContain('played by User1')
    expect(cards[0].text()).toContain('PLAYER')
    // The player's own row is not treated differently: nothing here is editable.
    expect(cards[1].text()).toContain('Doc')
    expect(cards[1].text()).toContain('played by Unknown')
  })

  it('shows a character with no notes as an empty state', () => {
    const wrapper = mountSection()

    expect(wrapper.findAll('li')[0].text()).toContain('Ex-military')
    expect(wrapper.findAll('li')[1].text()).toContain('No notes yet.')
  })

  it("emits open-image with the character's name and image set", async () => {
    const wrapper = mountSection()

    await wrapper.get('li button').trigger('click')

    // The parent opens exactly this set, so a crew card's pictures never step
    // through the ship's own gallery.
    expect(wrapper.emitted('open-image')).toEqual([
      [
        {
          url: '/default-scifi-campaign.svg',
          images: ['/default-scifi-campaign.svg'],
          label: 'Kestrel',
        },
      ],
    ])
  })

  it('hands over the whole set, not only the picture that was clicked', async () => {
    const wrapper = mountSection({
      characters: [{ ...characters[0], imageUrls: ['/a.png', '/b.png'] }],
    })

    await wrapper.get('li button').trigger('click')

    expect(wrapper.emitted('open-image')[0][0]).toEqual({
      url: '/a.png',
      images: ['/a.png', '/b.png'],
      label: 'Kestrel',
    })
  })

  it('offers no way to edit an entry — a crew member is a character', () => {
    const wrapper = mountSection()

    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
    const labels = wrapper.findAll('button').map((button) => button.text())
    expect(labels.some((label) => /edit/i.test(label))).toBe(false)
  })

  it('explains an empty crew when the campaign has no characters', () => {
    const wrapper = mountSection({ characters: [] })

    expect(wrapper.find('li').exists()).toBe(false)
    expect(wrapper.text()).toContain('No characters in this campaign yet.')
  })
})
