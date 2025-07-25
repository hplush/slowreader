<script lang="ts">
  // Use CSS `color` of the icon’s parent to change icon’s color
  // To change icon’s size, use --icon-size custom property.
  let { compensate = 0, path }: { compensate?: number; path: string } = $props()
</script>

<svg
  style:--icon-compensate={`${compensate}px`}
  class="icon"
  aria-hidden="true"
  viewBox="0 0 24 24"
>
  <path class="icon_path" d={path} />
</svg>

<style>
  :global {
    :root {
      --icon-size: 1rem;
      --icon-move: 0;
    }

    .icon {
      position: relative;
      top: var(--icon-compensate);
      display: block;
      width: var(--icon-size);
      height: var(--icon-size);
      margin: var(--icon-move);
    }

    .icon_path {
      fill: currentcolor;
    }
  }
</style>
