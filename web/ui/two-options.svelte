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
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100svh;
    }

    .two-options_option {
      width: 250px;
    }
  }
</style>
