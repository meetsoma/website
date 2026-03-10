/**
 * HubFilters — Preact island for interactive hub filtering.
 * Renders type/tier pills and search input.
 * State lives in nanostores so other islands can react.
 */
import { useStore } from '@nanostores/preact';
import {
  $typeFilter,
  $tierFilter,
  $searchQuery,
  $hasActiveFilters,
  resetFilters,
  type HubType,
  type HubTier,
} from '../../stores/hub';

const types: { value: HubType; label: string; glyph: string }[] = [
  { value: 'all', label: 'All', glyph: '⊛' },
  { value: 'protocol', label: 'Protocols', glyph: '🧬' },
  { value: 'muscle', label: 'Muscles', glyph: '◎' },
  { value: 'skill', label: 'Skills', glyph: '◈' },
  { value: 'template', label: 'Templates', glyph: '⟐' },
  { value: 'script', label: 'Scripts', glyph: '⚙' },
];

const tiers: { value: HubTier; label: string }[] = [
  { value: 'all', label: 'All tiers' },
  { value: 'core', label: 'Core' },
  { value: 'official', label: 'Official' },
  { value: 'community', label: 'Community' },
  { value: 'experimental', label: 'Experimental' },
];

export default function HubFilters() {
  const typeFilter = useStore($typeFilter);
  const tierFilter = useStore($tierFilter);
  const searchQuery = useStore($searchQuery);
  const hasFilters = useStore($hasActiveFilters);

  return (
    <div class="hub-filters">
      {/* Type pills */}
      <div class="filter-row">
        <div class="filter-pills">
          {types.map(t => (
            <button
              key={t.value}
              class={`pill ${typeFilter === t.value ? 'active' : ''}`}
              onClick={() => $typeFilter.set(t.value)}
              data-type={t.value}
            >
              <span class="pill-glyph">{t.glyph}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tier + search row */}
      <div class="filter-row filter-row-secondary">
        <select
          class="tier-select"
          value={tierFilter}
          onChange={(e) => $tierFilter.set((e.target as HTMLSelectElement).value as HubTier)}
        >
          {tiers.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <div class="search-wrapper">
          <input
            type="text"
            class="search-input"
            placeholder="Filter by name or tag..."
            value={searchQuery}
            onInput={(e) => $searchQuery.set((e.target as HTMLInputElement).value)}
          />
          {searchQuery && (
            <button class="search-clear" onClick={() => $searchQuery.set('')}>×</button>
          )}
        </div>

        {hasFilters && (
          <button class="reset-btn" onClick={resetFilters}>
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
