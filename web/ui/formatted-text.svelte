<script lang="ts">
  /* We escape and have XSS tests */
  /* eslint svelte/no-at-html-tags: "off" */

  import { sanitizeDOM } from '@slowreader/core'

  let { html }: { html: string } = $props()

  let node: HTMLDivElement | undefined

  $effect(() => {
    if (node) {
      node.innerHTML = ''
      node.replaceChildren(...sanitizeDOM(html).childNodes)
      let links = node.querySelectorAll('a')
      links.forEach(link => {
        link.setAttribute('target', '_blank')
        link.setAttribute('rel', 'noopener')
      })
    }
  })
</script>

<div bind:this={node} class="formatted-text"></div>

<style>
  :global {
    .formatted-text {
      overflow-x: auto;
      text-wrap: pretty;
    }

    .formatted-text img {
      max-width: 100%;
      height: auto;
      padding: 0.3em 0;
      margin: 0 auto;
    }

    .formatted-text p {
      margin: 0 0 0.8em;
    }

    .formatted-text :is(h1, h2, h3, h4, h5, h6) {
      margin: 1.6em 0 0.8em;
      font-weight: bold;
    }

    .formatted-text > :is(h1, h2, h3, h4, h5, h6):first-child {
      margin-top: 0;
    }

    .formatted-text h1 {
      font: var(--card-title-font);
    }

    .formatted-text h2 {
      font-size: 1.429em;
      line-height: 1.2;
    }

    .formatted-text h3 {
      font-size: 1.296em;
      line-height: 1.2;
    }

    .formatted-text h4 {
      font-size: 1.215em;
      line-height: 1.2;
    }

    .formatted-text h5 {
      font-size: 1.138em;
    }

    .formatted-text h6 {
      font-size: 1em;
    }

    .formatted-text a {
      color: var(--link-color);
      word-wrap: break-word;
      opacity: 100%;
    }

    .formatted-text a:visited {
      color: var(--link-color-visited);
    }

    .formatted-text a:hover {
      opacity: 85%;
    }

    .formatted-text a:active {
      opacity: 87%;
    }

    .formatted-text em {
      font-style: italic;
      font-weight: 600;
    }

    .formatted-text ul {
      padding-inline-start: 1.25em;
      list-style-type: disc;
    }

    .formatted-text ol {
      padding-inline-start: 1.25em;
      list-style-type: decimal;
    }

    .formatted-text li {
      margin-bottom: 0.625em;
    }

    .formatted-text blockquote {
      padding: 0.625em 1.25em;
      margin: 0 0 1.25em;
      border-inline-start: 0.3125em solid var(--border-color);
    }

    .formatted-text caption {
      padding: 0.625em;
      font-style: italic;
      text-align: center;
    }

    .formatted-text figcaption {
      font-style: italic;
      text-align: center;
    }

    .formatted-text dd {
      margin-inline-start: 2.5em;
    }

    .formatted-text video {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 0 auto;
    }

    .formatted-text audio {
      display: block;
      width: 100%;
      margin: 1em 0;
    }

    .formatted-text pre {
      padding: 1em;
      margin: 0.8em 0;
      overflow-x: auto;
      background-color: var(--field-color);
      border-radius: 4px;
      box-shadow: var(--field-shadow);
    }

    .formatted-text code {
      padding: 0.3em;
      line-height: 1.8;
      border-radius: var(--radius);
    }

    .formatted-text pre code {
      max-width: 100%;
      padding: 0.1em 0.25em;
      font-size: 0.89em;
      background: transparent;
    }

    .formatted-text p code {
      padding: 0.2em 0.4em;
      font-size: 85%;
      white-space: break-spaces;
      background-color: var(--inline-code-color);
      border-radius: 6px;
    }

    .formatted-text table {
      width: 100%;
      margin: 1em 0;
      border-collapse: collapse;
    }

    .formatted-text td {
      padding: 0.8em;
      border: 1px solid var(--border-color);
    }

    .formatted-text th {
      padding: 0.8em;
      border: 1px solid var(--border-color);
    }

    .formatted-text tr {
      border-bottom: 1px solid var(--border-color);
    }

    .formatted-text col {
      border: 1px solid var(--border-color);
    }

    .formatted-text colgroup {
      border: 1px solid var(--border-color);
    }
  }
</style>
