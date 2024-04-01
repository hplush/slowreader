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
    padding: 0.3em 0;
    margin: 0 auto;
  }

  /* .formatted-text :global(image) { */

  /* } */

  /** layout */

  .formatted-text :global(p) {
    margin: 0 0 0.857em;
  }

  /* .formatted-text :global(div) { */

  /* } */

  /* .formatted-text :global(span) { */

  /* } */

  /** headers
    step 1.125 between each heading
  */
  .formatted-text :global(h1) {
    margin: 1em 0;
    font-size: 1.476em;
  }

  .formatted-text :global(h2) {
    margin: 1em 0;
    font-size: 1.429em;
  }

  .formatted-text :global(h3) {
    margin: 1em 0;
    font-size: 1.296em;
  }

  .formatted-text :global(h4) {
    margin: 1em 0;
    font-size: 1.215em;
  }

  .formatted-text :global(h5) {
    margin: 1em 0;
    font-size: 1.138em;
  }

  .formatted-text :global(h6) {
    margin: 1em 0;
    font-size: 1.067em;
  }

  /* !** inline text formatting *! */
  .formatted-text :global(a) {
    color: oklch(49.77% 0.224 271.1);
    word-wrap: break-word;
    transition: color 0.2s ease-in-out;
  }

  .formatted-text :global(a:visited) {
    color: oklch(42.09% 0.193 328.36);
  }

  .formatted-text :global(a:hover) {
    color: oklch(37.73% 0.224 271.1);
    transition: color 0.2s ease-in-out;
  }

  .formatted-text :global(a:active) {
    color: oklch(57.97% 0.224 271.1);
  }

  .formatted-text :global(em) {
    font-style: italic;
    font-weight: 600;
  }

  /* .formatted-text :global(mark) { */

  /*  background-color: #ff0; */

  /*  color: #000; */

  /* } */

  /* .formatted-text :global(q) { */

  /*  quotes: '"' '"'; */

  /* } */

  /* .formatted-text :global(strong) { */

  /*  font-weight: bold; */

  /* } */

  /* .formatted-text :global(sub) { */

  /*  vertical-align: sub; */

  /*  font-size: smaller; */

  /* } */

  /* .formatted-text :global(sup) { */

  /*  vertical-align: super; */

  /*  font-size: smaller; */

  /* } */

  /* .formatted-text :global(small) { */

  /*  font-size: 80%; */

  /* } */

  /* .formatted-text :global(i) { */

  /*  font-style: italic; */

  /* } */

  /* .formatted-text :global(b) { */

  /*  font-weight: bold; */

  /* } */

  /* .formatted-text :global(bdi) { */

  /*  direction: rtl; */

  /*  unicode-bidi: isolate; */

  /* } */

  /* .formatted-text :global(bdo) { */

  /*  direction: rtl; */

  /*  unicode-bidi: bidi-override; */

  /* } */

  /* .formatted-text :global(cite) { */

  /*  font-style: italic; */

  /* } */

  /* .formatted-text :global(data) { */

  /*  color: #333; */

  /* } */

  /* .formatted-text :global(del) { */

  /*  text-decoration: line-through; */

  /* } */

  /* .formatted-text :global(ins) { */

  /*  text-decoration: underline; */

  /* } */

  /* .formatted-text :global(s) { */

  /*  text-decoration: line-through; */

  /* } */

  /* .formatted-text :global(samp) { */

  /*  font-family: monospace; */

  /* } */

  /* !** behavioral *! */

  /* .formatted-text :global(br) { */

  /* } */

  /* .formatted-text :global(hr) { */

  /* } */

  /* !** lists *! */

  .formatted-text :global(ul) {
    padding-inline-start: 1.25em;
    list-style-type: disc;
  }

  .formatted-text :global(ol) {
    padding-inline-start: 1.25em;
    list-style-type: decimal;
  }

  .formatted-text :global(li) {
    margin-bottom: 0.625em;
  }

  /* !** content *! */

  .formatted-text :global(blockquote) {
    padding: 0.625em 1.25em;
    margin: 0 0 1.25em;
    border-inline-start: 0.3125em solid var(--border-color);
  }

  .formatted-text :global(caption) {
    padding: 0.625em;
    font-style: italic;
    text-align: center;
  }

  .formatted-text :global(figcaption) {
    font-style: italic;
    text-align: center;
  }

  .formatted-text :global(figure) {
    margin: 1em 2.5em;
  }

  /* .formatted-text :global(abbr) { */

  /* } */

  /* .formatted-text :global(address) { */

  /* } */

  /* .formatted-text :global(datalist) { */

  /* } */

  .formatted-text :global(dd) {
    margin-inline-start: 2.5em;
  }

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

  .formatted-text :global(video) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 0 auto;
  }

  .formatted-text :global(audio) {
    display: block;
    width: 100%;
    margin: 1em 0;
  }

  /* .formatted-text :global(source) { */

  /* } */

  /* !** @deprecated *! */

  /* .formatted-text :global(center) { */

  /* } */

  /* .formatted-text :global(dir) { */

  /* } */

  /* !** code block *! */

  .formatted-text :global(pre) {
    padding: 1em;
    margin: 0.8em 0;
    overflow-x: auto;
    background-color: var(--field-color);
    border-radius: 4px;
    box-shadow: var(--field-shadow);
  }

  .formatted-text :global(code) {
    padding: 0.3em;
    line-height: 1.8;
    color: var(--text-color);
    background: var(--field-color);
    border-radius: var(--radius);
  }

  .formatted-text :global(pre > code) {
    max-width: 100%;
    padding: 0.1em 0.25em;
    font-size: 0.89em;
    background: transparent;
  }

  .formatted-text :global(p code) {
    padding: 0.3em;
    font-size: 80%;
    border-radius: var(--radius);
  }

  /* !** table *! */

  .formatted-text :global(table) {
    width: 100%;
    margin: 1em 0;
    border-collapse: collapse;
  }

  .formatted-text :global(td) {
    padding: 0.8em;
    border: 1px solid var(--border-color);
  }

  .formatted-text :global(th) {
    padding: 0.8em;
    border: 1px solid var(--border-color);
  }

  .formatted-text :global(tr) {
    border-bottom: 1px solid var(--border-color);
  }

  .formatted-text :global(col) {
    border: 1px solid var(--border-color);
  }

  .formatted-text :global(colgroup) {
    border: 1px solid var(--border-color);
  }
</style>
