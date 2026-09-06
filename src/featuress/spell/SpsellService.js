/**
   * Search spells.
   * - Authenticated (has JWT): calls backend GET /api/spells (Spring Page → Open5e shape)
   * - Everyone else (guest mode, anonymous, idle): calls Open5e API v2 directly
   *
   * Always returns Open5e-compatible shape: { count, next, previous, results }