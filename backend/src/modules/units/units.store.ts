export interface LocalUnit {
  id: string
  name: string
  abbreviation: string | null
  status: 'active' | 'archived'
}

/** Seed units matching seed.sql v1.5 (deterministic UUID prefixes). */
export const memoryUnits: LocalUnit[] = [
  { id: 'f1000000-0000-0000-0000-000000000001', name: 'Pieces',    abbreviation: 'pcs' },
  { id: 'f1000000-0000-0000-0000-000000000002', name: 'Kilograms', abbreviation: 'kg' },
  { id: 'f1000000-0000-0000-0000-000000000003', name: 'Grams',     abbreviation: 'g' },
  { id: 'f1000000-0000-0000-0000-000000000004', name: 'Liters',    abbreviation: 'L' },
  { id: 'f1000000-0000-0000-0000-000000000005', name: 'Milliliters', abbreviation: 'mL' },
  { id: 'f1000000-0000-0000-0000-000000000006', name: 'Boxes',     abbreviation: 'box' },
  { id: 'f1000000-0000-0000-0000-000000000007', name: 'Packs',     abbreviation: 'pk' },
  { id: 'f1000000-0000-0000-0000-000000000008', name: 'Bottles',   abbreviation: 'btl' },
  { id: 'f1000000-0000-0000-0000-000000000009', name: 'Cans',      abbreviation: 'can' },
  { id: 'f1000000-0000-0000-0000-000000000010', name: 'Meters',    abbreviation: 'm' },
  { id: 'f1000000-0000-0000-0000-000000000011', name: 'Dozen',     abbreviation: 'dz' },
].map((u) => ({ ...u, status: 'active' as const }))