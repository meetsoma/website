/**
 * Hub store — cross-island state for filtering and search.
 * Uses nanostores for framework-agnostic reactivity.
 */
import { atom, computed } from 'nanostores';

export type HubType = 'all' | 'protocol' | 'muscle' | 'skill' | 'template' | 'automation';
export type HubTier = 'all' | 'core' | 'official' | 'community' | 'pro';

/** Active type filter */
export const $typeFilter = atom<HubType>('all');

/** Active tier filter */
export const $tierFilter = atom<HubTier>('all');

/** Search query */
export const $searchQuery = atom('');

/** Tag filter (multiple) */
export const $tagFilter = atom<string[]>([]);

/** Derived: whether any filter is active */
export const $hasActiveFilters = computed(
  [$typeFilter, $tierFilter, $searchQuery, $tagFilter],
  (type, tier, search, tags) =>
    type !== 'all' || tier !== 'all' || search !== '' || tags.length > 0
);

/** Reset all filters */
export function resetFilters() {
  $typeFilter.set('all');
  $tierFilter.set('all');
  $searchQuery.set('');
  $tagFilter.set([]);
}

/** Toggle a tag in the filter */
export function toggleTag(tag: string) {
  const current = $tagFilter.get();
  if (current.includes(tag)) {
    $tagFilter.set(current.filter(t => t !== tag));
  } else {
    $tagFilter.set([...current, tag]);
  }
}
