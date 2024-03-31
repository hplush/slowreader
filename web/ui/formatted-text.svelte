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
  /** images */
  .formatted-text :global(img) {
    max-width: 100%;
    height: auto;
    padding: 0.3rem 0;
  }

  /* .formatted-text :global(image) { */

  /* } */

  /** layout */

  /* .formatted-text :global(div) { */

  /* } */

  /* .formatted-text :global(span) { */

  /* } */

  /** headers
    step 1.2 between each heading
  */
  .formatted-text :global(h1) {
    margin: 0.67rem 0;
    font-size: 2.986rem;
  }

  .formatted-text :global(h2) {
    margin: 0.83rem 0;
    font-size: 2.488rem;
  }

  .formatted-text :global(h3) {
    margin: 1rem 0;
    font-size: 2.074rem;
  }

  .formatted-text :global(h4) {
    margin: 1.33rem 0;
    font-size: 1.728rem;
  }

  .formatted-text :global(h5) {
    margin: 1.67rem 0;
    font-size: 1.44rem;
  }

  .formatted-text :global(h6) {
    margin: 1.95rem 0;
    font-size: 1rem;
  }

  /* !** inline text formatting *! */

  /* .formatted-text :global(a) { */

  /* } */

  /* .formatted-text :global(em) { */

  /* } */

  /* .formatted-text :global(mark) { */

  /* } */

  /* .formatted-text :global(p) { */

  /* } */

  /* .formatted-text :global(q) { */

  /* } */

  /* .formatted-text :global(strong) { */

  /* } */

  /* .formatted-text :global(sub) { */

  /* } */

  /* .formatted-text :global(sup) { */

  /* } */

  /* .formatted-text :global(small) { */

  /* } */

  /* .formatted-text :global(i) { */

  /* } */

  /* .formatted-text :global(b) { */

  /* } */

  /* .formatted-text :global(bdi) { */

  /* } */

  /* .formatted-text :global(bdo) { */

  /* } */

  /* .formatted-text :global(cite) { */

  /* } */

  /* .formatted-text :global(data) { */

  /* } */

  /* .formatted-text :global(del) { */

  /* } */

  /* .formatted-text :global(ins) { */

  /* } */

  /* .formatted-text :global(s) { */

  /* } */

  /* .formatted-text :global(samp) { */

  /* } */

  /* !** behavioral *! */

  /* .formatted-text :global(br) { */

  /* } */

  /* .formatted-text :global(hr) { */

  /* } */

  /* !** lists *! */

  /* .formatted-text :global(ul) { */

  /* } */

  /* .formatted-text :global(ol) { */

  /* } */

  /* .formatted-text :global(li) { */

  /* } */

  /* !** content *! */

  /* .formatted-text :global(blockquote) { */

  /* } */

  /* .formatted-text :global(caption) { */

  /* } */

  /* .formatted-text :global(figcaption) { */

  /* } */

  /* .formatted-text :global(figure) { */

  /* } */

  /* .formatted-text :global(abbr) { */

  /* } */

  /* .formatted-text :global(address) { */

  /* } */

  /* .formatted-text :global(datalist) { */

  /* } */

  /* .formatted-text :global(dd) { */

  /* } */

  /* .formatted-text :global(dl) { */

  /* } */

  /* .formatted-text :global(details) { */

  /* } */

  /* .formatted-text :global(summary) { */

  /* } */

  /* .formatted-text :global(dfn) { */

  /* } */

  /* .formatted-text :global(kbd) { */

  /* } */

  /* .formatted-text :global(rt) { */

  /* } */

  /* .formatted-text :global(ruby) { */

  /* } */

  /* .formatted-text :global(rp) { */

  /* } */

  /* !** media *! */

  /* .formatted-text :global(video) { */

  /* } */

  /* .formatted-text :global(audio) { */

  /* } */

  /* .formatted-text :global(source) { */

  /* } */

  /* !** @deprecated *! */

  /* .formatted-text :global(center) { */

  /* } */

  /* .formatted-text :global(dir) { */

  /* } */

  /* !** code block *! */

  /* .formatted-text :global(pre) { */

  /* } */

  /* .formatted-text :global(pre > code) { */

  /* } */

  /* .formatted-text :global(code) { */

  /* } */

  /* .formatted-text :global(p > code) { */

  /* } */

  /* !** table *! */

  /* .formatted-text :global(table) { */

  /* } */

  /* .formatted-text :global(tbody) { */

  /* } */

  /* .formatted-text :global(td) { */

  /* } */

  /* .formatted-text :global(tfoot) { */

  /* } */

  /* .formatted-text :global(th) { */

  /* } */

  /* .formatted-text :global(thead) { */

  /* } */

  /* .formatted-text :global(tr) { */

  /* } */

  /* .formatted-text :global(col) { */

  /* } */

  /* .formatted-text :global(colgroup) { */

  /* } */
</style>
