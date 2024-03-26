<script lang="ts">
  /* We escape and have XSS tests */
  /* eslint svelte/no-at-html-tags: "off" */

  import { sanitizeDOM } from '@slowreader/core'

  export let html: string

  let node: HTMLDivElement | undefined

  $: if (node) {
    node.innerHTML = ''
    node.replaceChildren(...sanitizeDOM(html).childNodes)
  }
</script>

<div bind:this={node} class="formatted-text"></div>

<style>
  .formatted-text :global(img) {
    max-width: 100%;
    height: auto;
  }
</style>
