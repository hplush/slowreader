<script lang="ts">
  import { getHotKeyHint } from 'keyux'

  let { hotkey }: { hotkey: string } = $props()
</script>

<kbd class="hotkey" aria-hidden="true">
  {getHotKeyHint(window, hotkey)}
</kbd>

<style>
  .hotkey {
    position: absolute;
    inset-inline-end: 5px;
    top: 3px;
    font: var(--hotkey-font);
    font-variant-caps: all-small-caps;
    color: var(--hotkey-color);
    text-transform: uppercase;
  }

  :global(.is-hotkey-disabled) .hotkey {
    display: none;
  }
</style>
