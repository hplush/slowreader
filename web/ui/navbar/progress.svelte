<script lang="ts">
  import {
    type RefreshTotalProgress,
    reportLoader,
    navbarMessages as t
  } from '@slowreader/core'

  let { stage, value }: RefreshTotalProgress = $props()

  const RADIUS = 4.8
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
</script>

<svg
  class="navbar-progress"
  class:is-media={stage === 'media'}
  class:is-posts={stage === 'posts'}
  {@attach () => reportLoader('refresh')}
  aria-label={$t.postRefreshing}
  aria-valuenow={value * 100}
  role="progressbar"
  viewBox="0 0 12 12"
>
  <circle
    class="navbar-progress_circle"
    cx="6"
    cy="6"
    fill="none"
    r={RADIUS}
    stroke-width="1.3"
  />
  {#key stage}
    <circle
      class="navbar-progress_circle"
      cx="6"
      cy="6"
      fill="none"
      r={RADIUS}
      stroke-dasharray={CIRCUMFERENCE}
      stroke-dashoffset={CIRCUMFERENCE - value * CIRCUMFERENCE}
      stroke-width="1.3"
    />
  {/key}
</svg>

<style>
  :global {
    .navbar-progress {
      width: 0.75rem;
      height: 0.75rem;
    }

    .navbar-progress_circle:first-child {
      stroke: var(--loader-background);
    }

    .navbar-progress_circle:last-child {
      stroke: var(--loader-bar);
      transition: stroke-dashoffset 100ms;
    }

    .navbar-progress.is-posts .navbar-progress_circle:last-child {
      stroke: var(--loader-middle);
    }

    .navbar-progress.is-media .navbar-progress_circle:first-child {
      stroke: var(--loader-middle);
    }
  }
</style>
