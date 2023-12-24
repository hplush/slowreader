<script lang="ts">
  /* We escape and have XSS tests */
  /* eslint svelte/no-at-html-tags: "off" */

  import { simpleMarkdown } from '../lib/text.js'

  export let text: string
</script>

<div class="rich-translation">{@html simpleMarkdown(text)}</div>

<style>
  .rich-translation :global(p) {
    padding-top: var(--padding-m);

    &:first-child {
      padding-top: 0;
    }
  }
</style>
