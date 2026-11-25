<script lang="ts">
  import type { Snippet } from 'svelte'

  import Loader from './loader.svelte'

  let {
    children,
    label,
    track
  }: {
    children: Snippet
    label: string
    track: string
  } = $props()
</script>

<div class="space-loader">
  <div class="space-loader_space" aria-hidden="true" inert>
    {@render children()}
  </div>
  <div class="space-loader_loader">
    <Loader {label} {track} />
    <span class="space-loader_label" aria-hidden="true">{label}</span>
  </div>
</div>

<style lang="postcss">
  :global {
    .space-loader {
      display: grid;
      width: stretch;
    }

    .space-loader_space {
      display: flex;
      grid-area: 1 / 1;
      visibility: hidden;
    }

    .space-loader_loader {
      display: flex;
      flex-direction: column;
      grid-area: 1 / 1;
      gap: var(--control-gap);
      align-items: center;
      justify-content: center;
    }

    .space-loader_label {
      font: var(--secondary-font);
      color: var(--secondary-text-color);
      text-align: center;
    }
  }
</style>
