<script lang="ts">
  export let hotkey: string
</script>

<kbd class="hotkey" aria-hidden="true">
  <div class="hotkey_float">{hotkey}</div>
</kbd>

<style>
  .hotkey {
    display: block;
    margin-inline-start: -2px;
  }

  .hotkey_float {
    position: absolute;
    inset-inline-end: 9px;
    margin-top: -15px;
    font: var(--hotkey-font);
    font-variant-caps: all-small-caps;
    color: var(--hotkey-color);
    text-transform: uppercase;
  }

  :global(.is-hotkey-disabled) .hotkey {
    display: none;
  }
</style>
