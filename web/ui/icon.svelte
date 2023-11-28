<script lang="ts">
  export let path: string
</script>

<svg aria-hidden="true" viewBox="0 0 24 24">
  <path d={path} />
</svg>

<style>
  :root {
    --icon-size: 24px;
  }

  svg {
    width: var(--icon-size);
    height: var(--icon-size);
  }

  path {
    fill: currentcolor;
  }
</style>
