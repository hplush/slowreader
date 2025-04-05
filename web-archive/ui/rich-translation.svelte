<script lang="ts">
  /* We escape and have XSS tests */
  /* eslint svelte/no-at-html-tags: "off" */

  import { parseLink, parseRichTranslation } from '@slowreader/core'

  let { text, url }: { text: string; url?: string } = $props()
</script>

<div class="rich-translation">
  {#if url}
    {@html parseLink(parseRichTranslation(text), url)}
  {:else}
    {@html parseRichTranslation(text)}
  {/if}
</div>

<style>
  :global {
    .rich-translation p {
      padding-top: 4px;

      &:first-child {
        padding-top: 0;
      }
    }
  }
</style>
