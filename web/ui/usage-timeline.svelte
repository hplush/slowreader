<script lang="ts">
  import {
    commonMessages,
    formatDuration,
    formatShortHour,
    formatTime,
    i18nFormat,
    coachMessages as t,
    type UsageMark,
    type UsagePart
  } from '@slowreader/core'

  let { marks, parts }: { marks: UsageMark[]; parts: UsagePart[] } = $props()

  function describe(part: UsagePart): string {
    let type = $commonMessages[part.type]
    let duration = formatDuration($i18nFormat, (part.to - part.from) / 1000)
    let from = formatTime($i18nFormat, part.from)
    let to = formatTime($i18nFormat, part.to)
    if (from === to) return $t.usagePartAt({ duration, time: from, type })
    return $t.usagePart({ duration, from, to, type })
  }
</script>

<div class="usage-timeline">
  <ol class="usage-timeline_line" aria-label={$t.usageSessions} role="list">
    {#each parts as part, index (index)}
      {@const label = describe(part)}
      <li
        style:inset-inline-start="min({part.left}%, 100% - 3 * var(--min-size))"
        style:width="{part.width}%"
        class="usage-timeline_part"
        class:is-fast={part.type === 'fast'}
        class:is-slow={part.type === 'slow'}
        title={label}
      >
        <span class="sr-only">{label}</span>
      </li>
    {/each}
  </ol>
  <div class="usage-timeline_scale" aria-hidden="true">
    <span class="usage-timeline_mark is-start">{$t.usageDayAgo}</span>
    {#each marks as mark (mark.time)}
      <span style:inset-inline-start="{mark.left}%" class="usage-timeline_mark">
        {formatShortHour($i18nFormat, mark.time)}
      </span>
    {/each}
    <span class="usage-timeline_mark is-end">{$t.usageNow}</span>
  </div>
</div>

<style>
  :global {
    .usage-timeline {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .usage-timeline_line {
      position: relative;
      height: 0.75rem;
      overflow: hidden;
      background: var(--border-color);
      border-radius: var(--base-radius);
    }

    .usage-timeline_part {
      position: absolute;
      top: 0;
      bottom: 0;
      box-sizing: border-box;
      min-width: calc(3 * var(--min-size));

      &.is-slow {
        background: var(--usage-slow-color);
      }

      &.is-fast {
        background: var(--usage-fast-color);
      }
    }

    .usage-timeline_scale {
      position: relative;
      height: 1lh;
      font: var(--tertiary-font);
      color: var(--secondary-text-color);
    }

    .usage-timeline_mark {
      position: absolute;
      top: 0;
      white-space: nowrap;
      translate: -50% 0;

      &.is-start {
        inset-inline-start: 0;
        translate: none;
      }

      &.is-end {
        inset-inline-end: 0;
        translate: none;
      }
    }
  }
</style>
