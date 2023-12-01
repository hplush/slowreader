<script lang="ts">
  export let hotkey: string
</script>

<kbd class="hotkey">
  <div class="hotkey_float">{hotkey}</div>
</kbd>

<style>
  .hotkey {
    display: block;
    margin-inline-start: -4px;
  }

  .hotkey_float {
    position: absolute;
    inset-inline-end: var(--padding-m);
    top: calc(var(--padding-m) - 1px);
    font: var(--hotkey-font);
    color: var(--hotkey-color);
    text-transform: uppercase;
  }

  :global(.is-hotkey-disabled) .hotkey {
    display: none;
  }
</style>
