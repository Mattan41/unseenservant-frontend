/**
 * Offworlders ship export (markdown / plain text).
 *
 * Pure — no Vue, no store. Builds the neutral document model consumed by
 * `src/utils/textExport.js`. Images are deliberately excluded (exempt from
 * export); the ship's notes are markdown source and pass through verbatim, while
 * the ship's sections are plain text and get one heading each.
 */
import { renderDocument } from '@/utils/textExport.js'
import { shipUpgrade } from '@/systems/offworlders/shipConstants.js'

/**
 * Render a ship to markdown or plain text.
 *
 * @param {object} ship normalized ship data block
 * @param {{format?: 'md'|'txt', campaignName?: string}} [options]
 * @returns {string}
 */
export function buildShipExport(ship, { format = 'txt', campaignName = '' } = {}) {
  const data = ship || {}

  const sections = [
    {
      heading: 'Ship',
      fields: [
        { label: 'Hull', value: `${data.hull ?? 0} / ${data.hullMax ?? 0}` },
        { label: 'Armor', value: `${data.armor ?? 0}` },
        { label: 'Damage', value: data.damage || '1D6' },
        { label: 'Drive Fuel', value: `${data.driveFuel ?? 0} / ${data.maxDriveFuel ?? 0}` },
        { label: 'Credits', value: `${data.credits ?? 0}` },
      ],
    },
    {
      heading: 'Upgrades',
      items: (data.upgrades || []).map((name) => {
        const entry = shipUpgrade(name)
        return entry?.description ? `${name} — ${entry.description}` : name
      }),
    },
  ]

  if (data.notes) sections.push({ heading: 'Notes', text: data.notes })

  // Sections: one `## Title` per section in markdown, `TITLE` + body in plain
  // text — the same shape the notes field renders in, but each section keeps its
  // own heading. The body is plain text, so it passes through untouched in both
  // formats. A section with no body carries nothing to export and is skipped.
  for (const section of data.sections || []) {
    if (!section?.body) continue
    sections.push({ heading: section.title || 'Section', text: section.body })
  }

  return renderDocument(
    {
      title: data.name || 'Ship',
      subtitle: campaignName ? `Campaign: ${campaignName}` : 'Offworlders ship',
      sections,
    },
    format,
  )
}
