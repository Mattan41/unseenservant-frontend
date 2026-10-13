/**
 * Ship save-payload builder.
 *
 * Pure — no Vue, no store. Shared by the ship sheet's Save and the store's
 * quick-edit (`adjustShipField`) so the PUT shape can never drift between the
 * two. Images are managed by their own endpoints and are deliberately excluded.
 */

/**
 * Build the PUT payload for a ship from its normalized data block.
 *
 * @param {object} ship normalized ship data (including the optimistic-concurrency `version`)
 * @returns {object} ShipDTO fields for `PUT /api/campaigns/{id}/ship`
 */
export function buildShipPayload(ship) {
  const data = ship || {}
  return {
    name: data.name,
    hull: data.hull,
    hullMax: data.hullMax,
    armor: data.armor,
    damage: data.damage,
    driveFuel: data.driveFuel,
    maxDriveFuel: data.maxDriveFuel,
    credits: data.credits,
    upgrades: [...(data.upgrades || [])],
    notes: data.notes,
    version: data.version,
  }
}
