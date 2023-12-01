<script lang="ts">
  export let path: string
  export let compensate: number = 0
</script>

<svg
  style:--icon-compensate={`${compensate}px`}
  aria-hidden="true"
  viewBox="0 0 24 24"
>
  <path d={path} />
</svg>

<style>
  :root {
    --icon-size: 16px;
  }

  svg {
    position: relative;
    top: var(--icon-compensate);
    width: var(--icon-size);
    height: var(--icon-size);
  }

  path {
    fill: currentcolor;
  }
</style>
