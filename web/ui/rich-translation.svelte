<script lang="ts">
  /* We escape and have XSS tests */
  /* eslint svelte/no-at-html-tags: "off" */

  import { parseLink, simpleMarkdown } from '../lib/text.js'

  export let text: string
  export let url: string | undefined = undefined
</script>

<div class="rich-translation">
  {#if url}
    {@html parseLink(simpleMarkdown(text), url)}
  {:else}
    {@html simpleMarkdown(text)}
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
