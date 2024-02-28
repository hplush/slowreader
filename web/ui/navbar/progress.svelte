<script lang="ts">
  export let value: number

  const RADIUS = 50
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
</script>

<svg height="120" viewBox="0 0 120 120" width="120">
  <circle cx="60" cy="60" fill="none" r={RADIUS} stroke-width="16" />
  <circle
    cx="60"
    cy="60"
    fill="none"
    r={RADIUS}
    stroke-dasharray={CIRCUMFERENCE}
    stroke-dashoffset={CIRCUMFERENCE - value * CIRCUMFERENCE}
    stroke-width="16"
    transform="rotate(-90 60 60)"
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
