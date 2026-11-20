<script lang="ts">
  import {
    commonMessages,
    i18nFormat,
    coachMessages as t,
    type UsageCategory
  } from '@slowreader/core'

  let { categories }: { categories: readonly UsageCategory[] } = $props()

  function perDay(minutes: number): string {
    return $t.usagePerDay({
      minutes: $i18nFormat.number(minutes, {
        maximumFractionDigits: 0,
        maximumSignificantDigits: 1,
        roundingPriority: 'morePrecision'
      })
    })
  }
</script>

{#if categories.length > 0}
  <ul class="usage-categories" aria-label={$t.usageCategories} role="list">
    {#each categories as category (category.id)}
      <li>
        <div class="usage-categories_title">
          <span class="usage-categories_name">{category.title}</span>
          <span>{perDay(category.minutesPerDay)}</span>
        </div>
        <div class="usage-categories_bar">
          {#each category.parts as part (part.type)}
            {@const label = $t.usageCategoryPart({
              duration: perDay(part.minutesPerDay),
              type: $commonMessages[part.type]
            })}
            <span
              style:--usage-width="max({part.width}%, var(--min-size))"
              class="usage-categories_part"
              class:is-fast={part.type === 'fast'}
              class:is-slow={part.type === 'slow'}
              title={label}
            >
              <span class="sr-only">{label}</span>
            </span>
          {/each}
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  :global {
    .usage-categories {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .usage-categories_title {
      display: flex;
      gap: 0.5rem;
      justify-content: space-between;
      font: var(--secondary-font);
      color: var(--secondary-text-color);
    }

    .usage-categories_name {
      flex-shrink: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .usage-categories_bar {
      display: flex;
      height: 0.75rem;
      overflow: hidden;
      background: var(--border-color);
      border-radius: var(--base-radius);
    }

    .usage-categories_part {
      position: relative;
      width: var(--usage-width);

      &.is-slow {
        background: var(--usage-slow-color);
      }

      &.is-fast {
        background: var(--usage-fast-color);
      }
    }
  }
</style>
