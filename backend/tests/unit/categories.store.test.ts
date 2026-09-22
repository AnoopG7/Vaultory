import { describe, expect, it } from 'vitest'
import { findDescendantCategoryIds, findTopLevelCategory, memoryCategories } from '../../src/modules/categories/categories.store'

const ELEC = 'c1000000-0000-0000-0000-000000000001'
const GROCERY = 'c1000000-0000-0000-0000-000000000002'
const MOBILE_ACC = 'c2000000-0000-0000-0000-000000000001'
const AUDIO = 'c2000000-0000-0000-0000-000000000002'
const SNACKS = 'c2000000-0000-0000-0000-000000000003'

describe('findDescendantCategoryIds', () => {
  it('returns the category and all descendants at any depth', () => {
    const ids = findDescendantCategoryIds(ELEC)
    expect(ids).toEqual(new Set([ELEC, MOBILE_ACC, AUDIO]))
  })

  it('returns a single id for a leaf category', () => {
    expect(findDescendantCategoryIds(SNACKS)).toEqual(new Set([SNACKS]))
  })

  it('returns null for an unknown category', () => {
    expect(findDescendantCategoryIds('c1000000-0000-0000-0000-000000009999')).toBeNull()
  })
})

describe('findTopLevelCategory', () => {
  it('walks up to the root ancestor', () => {
    expect(findTopLevelCategory(MOBILE_ACC)?.id).toBe(ELEC)
    expect(findTopLevelCategory(AUDIO)?.id).toBe(ELEC)
    expect(findTopLevelCategory(SNACKS)?.id).toBe(GROCERY)
  })

  it('returns the category itself when it is already top-level', () => {
    expect(findTopLevelCategory(ELEC)?.id).toBe(ELEC)
  })

  it('returns null for an unknown category', () => {
    expect(findTopLevelCategory('c1000000-0000-0000-0000-000000009999')).toBeNull()
  })

  it('seeds categories with the expected structure', () => {
    expect(memoryCategories).toHaveLength(14)
    expect(memoryCategories.filter((c) => c.parent_id).length).toBe(7)
  })
})