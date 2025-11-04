<script lang="ts">
  let { index }: { index: number } = $props()
</script>

<div style:--popup-shadow-index={index} class="popup-shadow"></div>

<style lang="postcss">
  :global {
    .popup-shadow {
      display: none;

      @media (--popups-stack) {
        position: fixed;
        inset-block: 0;
        inset-inline-end: 0;
        z-index: 8;
        display: block;
        width: calc(var(--popup-size) + 0.375rem * var(--popup-shadow-index));
        box-shadow: var(--popup-shadow);

        @mixin background var(--land-color);
      }
    }
  }
</style>
