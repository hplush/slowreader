<script lang="ts">
  let { compensate = 0, path }: { compensate?: number; path: string } = $props()
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
    --icon-move: 0;
  }

  svg {
    position: relative;
    top: var(--icon-compensate);
    display: block;
    width: var(--icon-size);
    height: var(--icon-size);
    margin: var(--icon-move);
  }

  path {
    fill: currentcolor;
  }
</style>
