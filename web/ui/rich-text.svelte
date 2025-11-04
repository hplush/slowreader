<script lang="ts">
  /* We escape and have XSS tests */
  /* eslint svelte/no-at-html-tags: "off" */

  import { parseRichTranslation } from '@slowreader/core'

  let { text, url }: { text: string; url?: string } = $props()
</script>

<div class="rich-text">
  {@html parseRichTranslation(text, url)}
</div>

<style>
  :global {
    .rich-text p {
      padding-top: 0.25rem;

      &:first-child {
        padding-top: 0;
      }
    }

    .rich-text a {
      color: currentcolor;

      &:hover {
        text-decoration: none;
      }
    }
  }
</style>
