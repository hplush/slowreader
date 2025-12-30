<script lang="ts">
  /* We escape and have XSS tests */
  /* eslint svelte/no-at-html-tags: "off" */

  import { sanitizeDOM } from '@slowreader/core'
  import type { Attachment } from 'svelte/attachments'

  let { comfort, html }: { comfort?: boolean; html: string | undefined } =
    $props()

  const renderHtml: Attachment = node => {
    node.innerHTML = ''
    node.replaceChildren(...sanitizeDOM(html ?? '').childNodes)
    node.querySelectorAll('a').forEach(link => {
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener')
    })
  }
</script>

<div
  class="formatted-text"
  class:is-comfort={comfort}
  {@attach renderHtml}
></div>

<style>
  :global {
    .formatted-text {
      max-width: 100%;
      overflow-x: auto;
      text-wrap: pretty;

      &.is-comfort {
        font-family: var(--comfort-family);
      }
    }

    .formatted-text img {
      display: block;
      max-width: 100%;
      height: auto;
      padding: 0.625em 0;
      margin: 0 auto;
      object-fit: scale-down;

      & + & {
        padding-top: 0;
      }
    }

    .formatted-text p {
      margin: 0 0 0.75em;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .formatted-text :is(h1, h2, h3, h4, h5, h6) {
      margin: 1.6em 0 0.8em;
      font-weight: bold;
    }

    .formatted-text > :is(h1, h2, h3, h4, h5, h6):first-child {
      margin-top: 0;
    }

    .formatted-text h1 {
      font-size: 1.56em;
      line-height: 1.2;
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
      text-decoration: underline;
      opacity: 100%;
    }

    .formatted-text a:visited {
      color: var(--link-color-visited);
    }

    .formatted-text a:hover {
      text-decoration: none;
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
      font: var(--mono-font);
      background-color: var(--code-background);
      border-radius: var(--base-radius);
      box-shadow: var(--field-shadow);
    }

    .formatted-text code {
      padding: 0.3em;
      font: var(--mono-font);
      line-height: 1.8;
      border-radius: var(--base-radius);
    }

    .formatted-text pre code {
      max-width: 100%;
      padding: 0.1em 0.25em;
      font-size: 90%;
      background: transparent;
    }

    .formatted-text p code {
      padding: 0.2em 0.4em;
      font-size: 90%;
      white-space: break-spaces;
      background-color: var(--code-background);
      border-radius: 0.375em;
    }

    .formatted-text kbd {
      padding: 0 0.25em;
      font: var(--mono-font);
      font-size: 80%;
      background-color: var(--code-background);
      border: 0 solid var(--border-color);
      border-width: 0.125em 0.125em 0.25em;
      border-radius: 0.25em;
    }

    .formatted-text table {
      width: 100%;
      margin: 1em 0;
      border-collapse: collapse;
    }

    .formatted-text td {
      padding: 0.75em;
      border: var(--min-size) solid var(--border-color);
    }

    .formatted-text th {
      padding: 0.75em;
      border: var(--min-size) solid var(--border-color);
    }

    .formatted-text tr {
      border-bottom: var(--min-size) solid var(--border-color);
    }

    .formatted-text col {
      border: var(--min-size) solid var(--border-color);
    }

    .formatted-text colgroup {
      border: var(--min-size) solid var(--border-color);
    }
  }
</style>
