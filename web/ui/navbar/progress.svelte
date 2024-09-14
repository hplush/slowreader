<script lang="ts">
  import { navbarMessages as t } from '@slowreader/core'

  let { value }: { value: number } = $props()

  const RADIUS = 4.8
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
</script>

<svg
  class="navbar-progress"
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
</svg>

<style>
  :global {
    .navbar-progress {
      width: 12px;
      height: 12px;
    }

    .navbar-progress_circle:first-child {
      stroke: var(--border-color);
    }

    .navbar-progress_circle:last-child {
      stroke: var(--text-color);
      transition: stroke-dashoffset 100ms;
    }
  }
</style>
