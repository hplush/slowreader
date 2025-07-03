<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    one,
    two
  }: {
    one: Snippet
    two: Snippet
  } = $props()
</script>

<div class="two-options">
  <div class="two-options_option">{@render one()}</div>
  <div class="two-options_option">{@render two()}</div>
</div>

<style>
  :global {
    .two-options {
      box-sizing: border-box;
      display: flex;
      gap: 16px;
      align-items: center;
      justify-content: center;
      min-height: 100svh;

      @media (width <= 630px) {
        flex-direction: column;
        padding: 8px 0;
      }
    }

    .two-options_option {
      box-sizing: border-box;
      width: 290px;
      max-width: 100%;
      padding: 16px;

      &:first-child {
        --current-background: var(--main-land-color);

        background: var(--main-land-color);
        border-radius: 24px;
      }
    }
  }
</style>
