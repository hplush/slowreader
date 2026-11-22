<script lang="ts">
  import {
    type FeedStats,
    type FeedStatsType,
    getFeedStatsBar,
    i18nFormat,
    organizeMessages as t
  } from '@slowreader/core'

  let {
    href,
    stats,
    variant
  }: {
    href?: string
    stats: FeedStats
    variant: 'legend' | 'stacked'
  } = $props()

  let bar = $derived(getFeedStatsBar(stats))

  function getLabel(type: FeedStatsType, count: number): string {
    if (type === 'liked') {
      return $t.statsLiked({ count })
    } else if (type === 'opened') {
      return $t.statsOpened({ count })
    } else if (type === 'disliked') {
      return $t.statsDisliked({ count })
    } else {
      return $t.statsOther({ count })
    }
  }
</script>

{#snippet number(count: number, label: string, type?: string)}
  <li
    class="feed-stats_number"
    class:is-disliked={type === 'disliked'}
    class:is-liked={type === 'liked'}
    title={label}
  >
    <span aria-hidden="true">
      {$i18nFormat.number(count, { notation: 'compact' })}
    </span>
    <span class="sr-only">{label}</span>
  </li>
{/snippet}

<svelte:element
  this={href ? 'a' : 'div'}
  class="feed-stats"
  class:is-link={!!href}
  class:is-stacked={variant === 'stacked'}
  {href}
>
  <div
    class="feed-stats_bar"
    class:is-thin={variant !== 'legend'}
    aria-hidden="true"
  >
    <div style:--feed-stats-width="{bar.width}%" class="feed-stats_fill">
      {#each bar.parts as part (part.type)}
        <span
          style:flex-grow={part.count}
          class="feed-stats_part"
          class:is-disliked={part.type === 'disliked'}
          class:is-liked={part.type === 'liked'}
          class:is-opened={part.type === 'opened'}
          title={getLabel(part.type, part.count)}
        ></span>
      {/each}
    </div>
  </div>
  {#if variant === 'legend'}
    {#if bar.parts.length > 0}
      <ul class="feed-stats_legend" role="list">
        {#each bar.parts as part (part.type)}
          <li class="feed-stats_item">
            <span
              class="feed-stats_mark"
              class:is-disliked={part.type === 'disliked'}
              class:is-liked={part.type === 'liked'}
              class:is-opened={part.type === 'opened'}
            ></span>
            {getLabel(part.type, part.count)}
          </li>
        {/each}
      </ul>
    {/if}
  {:else}
    <ul class="feed-stats_numbers" role="list">
      {@render number(bar.total, $t.statsSeen(bar.total))}
      {@render number(
        stats.liked,
        $t.statsLiked({ count: stats.liked }),
        'liked'
      )}
      {@render number(
        stats.disliked,
        $t.statsDisliked({ count: stats.disliked }),
        'disliked'
      )}
    </ul>
  {/if}
</svelte:element>

<style lang="postcss">
  :global {
    .feed-stats {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      width: stretch;

      &.is-stacked {
        flex-shrink: 0;
        gap: 0.25rem;
        width: 5rem;
      }

      &.is-link {
        @mixin clickable;

        box-sizing: content-box;
        justify-content: center;
        height: var(--control-height);
        padding-inline: 0.5rem;
        border-radius: calc(var(--base-radius) + var(--slider-padding));

        &:hover,
        &:active,
        &:focus-visible {
          background: --tune-background(--flat-button --flat-button-hover);
        }

        &:active {
          box-shadow: var(--pressed-shadow);
        }
      }
    }

    .feed-stats_bar {
      height: 0.75rem;
      overflow: hidden;
      background: var(--border-color);
      border-radius: var(--base-radius);

      &.is-thin {
        height: 0.375rem;
      }
    }

    .feed-stats_fill {
      display: flex;
      gap: var(--min-size);

      /* Feed with a few posts next to a popular one still shows its parts */
      width: max(var(--feed-stats-width), 0.5rem);
      height: 100%;
    }

    .feed-stats_part,
    .feed-stats_mark {
      background: var(--text-color);

      &.is-liked {
        background: var(--stats-liked-color);
      }

      &.is-opened {
        background: var(--stats-opened-color);
      }

      &.is-disliked {
        background: var(--stats-disliked-color);
      }
    }

    .feed-stats_part {
      position: relative;
      flex-basis: 0;
      min-width: var(--min-size);
    }

    .feed-stats_bar,
    .feed-stats_numbers {
      .feed-stats.is-link:active & {
        translate: 0 1px;
      }
    }

    .feed-stats_numbers {
      overflow: hidden;
      text-overflow: ellipsis;
      font: var(--badge-font);
      font-variant-numeric: tabular-nums;
      color: var(--text-color);
      word-spacing: 0.1875rem;
      white-space: nowrap;
      list-style: none;
    }

    .feed-stats_number {
      display: inline;

      &.is-liked {
        color: var(--success-text-color);
      }

      &.is-disliked {
        color: var(--dangerous-text-color);
      }
    }

    .feed-stats_legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.75rem;
      padding-inline: var(--control-padding);
      font: var(--secondary-font);
      color: var(--secondary-text-color);
      list-style: none;
    }

    .feed-stats_item {
      display: flex;
      gap: 0.375rem;
      align-items: center;
    }

    .feed-stats_mark {
      flex-shrink: 0;
      width: 0.625rem;
      height: 0.625rem;
      border-radius: 0.125rem;
    }
  }
</style>
