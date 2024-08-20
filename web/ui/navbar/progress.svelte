<script lang="ts">
  import { navbarMessages as t } from '@slowreader/core'

  let { value }: { value: number } = $props()

  const RADIUS = 4.8
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
</script>

<svg
  aria-label={$t.postRefreshing}
  aria-valuenow={value * 100}
  role="progressbar"
  viewBox="0 0 12 12"
>
  <circle cx="6" cy="6" fill="none" r={RADIUS} stroke-width="1.3" />
  <circle
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
  svg {
    width: 12px;
    height: 12px;
  }

  circle:first-child {
    stroke: var(--border-color);
  }

  circle:last-child {
    stroke: var(--text-color);
    transition: stroke-dashoffset 100ms;
  }
</style>
