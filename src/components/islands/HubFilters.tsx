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
import { iconSvg } from '../../lib/icons';

const types: { value: HubType; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'all' },
  { value: 'protocol', label: 'Protocols', icon: 'protocols' },
  { value: 'muscle', label: 'Muscles', icon: 'muscles' },
  { value: 'skill', label: 'Skills', icon: 'skills' },
  { value: 'template', label: 'Templates', icon: 'templates' },
  { value: 'automation', label: 'Automations', icon: 'automations' },
];

const tiers: { value: HubTier; label: string }[] = [
  { value: 'all', label: 'All tiers' },
  { value: 'core', label: 'Core' },
  { value: 'official', label: 'Official' },
  { value: 'community', label: 'Community' },
  { value: 'pro', label: 'Pro' },
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
              <span class="pill-glyph" dangerouslySetInnerHTML={{ __html: iconSvg[t.icon] || '' }} />
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
