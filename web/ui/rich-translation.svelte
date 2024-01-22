<script lang="ts">
  /* We escape and have XSS tests */
  /* eslint svelte/no-at-html-tags: "off" */

  import { parseLink, parseRichTranslation } from '@slowreader/core'

  export let text: string
  export let url: string | undefined = undefined
</script>

<div class="rich-translation">
  {#if url}
    {@html parseLink(parseRichTranslation(text), url)}
  {:else}
    {@html parseRichTranslation(text)}
  {/if}
</div>

<style>
  .rich-translation :global(p) {
    padding-top: 4px;

    &:first-child {
      padding-top: 0;
    }
  }
</style>
