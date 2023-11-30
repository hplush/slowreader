<script lang="ts">
  export let hotkey: string
</script>

<kbd class="hotkey">{hotkey}</kbd>

<style>
  .hotkey {
    position: relative;
    top: -6px;
    display: block;
    margin-inline: -3px -7px;
    font: var(--hotkey-font);
    color: var(--hotkey-color);
    text-transform: uppercase;
  }

  :global(.is-hotkey-disabled) .hotkey {
    display: none;
  }
</style>
