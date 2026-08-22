<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    caption,
    children,
    labelled = false,
    note
  }: {
    caption?: string
    children: Snippet
    labelled?: boolean
    note?: Snippet
  } = $props()
</script>

<div class="captioned">
  <div class="captioned_content">
    {@render children()}
  </div>
  {#if caption || note}
    <div class="captioned_bottom">
      {#if caption}
        <p class="captioned_caption" aria-hidden={labelled ? 'true' : null}>
          {caption}
        </p>
      {/if}
      {#if note}
        {@render note()}
      {/if}
    </div>
  {/if}
</div>

<style lang="postcss">
  :global {
    .captioned {
      display: grid;
      flex-grow: 1;
      grid-template-rows: 1fr auto 1fr;
      justify-items: center;
      min-block-size: 100%;
    }

    .captioned_content {
      grid-row: 2;
      inline-size: 100%;
    }

    .captioned_bottom {
      display: flex;
      flex-direction: column;
      grid-row: 3;

      /* The caption belongs to the loader, so the note is further away */
      gap: 1.5rem;
      align-self: start;
      max-inline-size: 20rem;
      padding-block-start: 0.625rem;
    }

    .captioned_caption {
      font: var(--secondary-font);
      color: var(--secondary-text-color);
      text-align: center;
    }
  }
</style>
