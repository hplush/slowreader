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
  <div class="two-options_center">
    <div class="two-options_option">{@render one()}</div>
    <div class="two-options_option">{@render two()}</div>
  </div>
</div>

<style>
  :global {
    .two-options {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100svh;

      @media (width <= 630px) {
        align-items: flex-end;
      }
    }

    .two-options_center {
      box-sizing: border-box;
      display: flex;
      gap: 16px;
      align-items: flex-start;
      justify-content: center;

      @media (width <= 630px) {
        flex-direction: column-reverse;
        gap: 8px;
      }
    }

    .two-options_option {
      box-sizing: border-box;
      width: 290px;
      max-width: 100%;
      padding: 16px;
      margin: 8px 0;

      &:first-child {
        --current-background: var(--main-land-color);

        background: var(--main-land-color);
        border-radius: calc(16px + var(--button-radius));
      }

      @media (width <= 630px) {
        margin: 0;

        &:first-child {
          margin-bottom: 16px;
        }
      }
    }
  }
</style>
