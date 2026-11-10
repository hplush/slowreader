<script lang="ts">
  import {
    refreshMessages,
    type RefreshTotalProgress,
    reportLoader,
    navbarMessages as t
  } from '@slowreader/core'

  let progress: RefreshTotalProgress = $props()
  let value = $derived('value' in progress ? progress.value : undefined)

  const RADIUS = 4.8
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
</script>

<svg
  class="navbar-progress"
  class:is-media={progress.stage === 'media'}
  class:is-posts={progress.stage === 'posts'}
  class:is-spinning={value === undefined}
  {@attach () => reportLoader('refresh')}
  aria-label={progress.stage === 'other'
    ? $refreshMessages.other
    : $t.postRefreshing}
  aria-valuenow={value === undefined ? undefined : value * 100}
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
  {#key progress.stage}
    <circle
      class="navbar-progress_circle"
      cx="6"
      cy="6"
      fill="none"
      r={RADIUS}
      stroke-dasharray={CIRCUMFERENCE}
      stroke-dashoffset={CIRCUMFERENCE - (value ?? 0.25) * CIRCUMFERENCE}
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

    .navbar-progress.is-spinning .navbar-progress_circle:last-child {
      transform-box: fill-box;
      transform-origin: center;
      animation: --navbar-progress-spin 1.5s linear infinite;
    }

    @keyframes --navbar-progress-spin {
      to {
        transform: rotate(1turn);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .navbar-progress.is-spinning .navbar-progress_circle:last-child {
        animation: none;
      }
    }
  }
</style>
