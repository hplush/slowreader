<script lang="ts">
  /* We escape and have XSS tests */
  /* eslint svelte/no-at-html-tags: "off" */

  import { canOpenMention, openPopup, sanitizeDOM } from '@slowreader/core'
  import { mount, unmount } from 'svelte'
  import type { Attachment } from 'svelte/attachments'
  import { on } from 'svelte/events'

  import { waitImageDecoded } from '../lib/image.ts'
  import BrokenImage from './broken-image.svelte'

  let {
    comfort,
    html,
    lang,
    scroll = true,
    simple = false
  }: {
    comfort?: boolean
    html: Element | string | undefined
    lang?: null | string
    scroll?: boolean
    simple?: boolean
  } = $props()

  let renderHtml: Attachment = node => {
    // A node is already sanitized by `sanitizeDOM()` of the caller.
    // Cloned, because moving its children empties it for the next mount.
    let content =
      typeof html === 'object' ? html.cloneNode(true) : sanitizeDOM(html ?? '')
    node.replaceChildren(...content.childNodes)
    let broken: ReturnType<typeof mount>[] = []
    function showBroken(image: HTMLImageElement): void {
      if (image.classList.contains('emoji')) {
        image.replaceWith(image.alt)
        return
      }
      let box = document.createElement('span')
      box.className = 'formatted-text_broken'
      let width = image.getAttribute('width')
      let height = image.getAttribute('height')
      if (width && height) {
        box.style.width = `${width}px`
        box.style.aspectRatio = `${width} / ${height}`
      }
      image.replaceWith(box)
      broken.push(
        mount(BrokenImage, { props: { alt: image.alt }, target: box })
      )
    }
    node.querySelectorAll('img').forEach(image => {
      if (image.complete) {
        if (image.naturalWidth === 0) showBroken(image)
        return
      }
      image.classList.add('is-loading')
      on(image, 'load', async () => {
        await waitImageDecoded(image)
        image.classList.remove('is-loading')
      })
      on(image, 'error', () => {
        showBroken(image)
      })
    })
    node.querySelectorAll('a').forEach(link => {
      let href = link.getAttribute('href')
      if (href?.startsWith('#')) {
        // Router keeps popups in the hash
        on(link, 'click', event => {
          event.preventDefault()
          let id = href.slice(1)
          Array.from(node.querySelectorAll('[id]'))
            .find(element => element.id === id)
            ?.scrollIntoView()
        })
      } else {
        link.setAttribute('target', '_blank')
        link.setAttribute('rel', 'noopener')
        if (href && canOpenMention(link.textContent, href)) {
          on(link, 'click', event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey) return
            event.preventDefault()
            openPopup('feed', href)
          })
        }
      }
    })
    return () => {
      for (let component of broken) void unmount(component)
    }
  }
</script>

<div
  class="formatted-text"
  class:is-comfort={comfort}
  class:is-scroll={scroll}
  class:is-simple={simple}
  {@attach renderHtml}
  {lang}
></div>

<style lang="postcss">
  :global {
    .formatted-text {
      flex-shrink: 1;
      width: stretch;
      text-wrap: pretty;

      &.is-scroll {
        overflow-x: auto;
      }

      &:not(.is-scroll) {
        overflow-wrap: anywhere;
      }

      &.is-comfort {
        font-family: var(--comfort-family);
      }
    }

    .formatted-text figure {
      max-width: 100%;
      margin-bottom: 1.25em;
    }

    .formatted-text img {
      max-width: 100%;
      height: auto;
      padding: 0.625em 0;
      margin: 0 auto;
      object-fit: scale-down;

      &.is-loading {
        background: --tune-background(--image-placeholder);
        background-clip: content-box;

        &:not(.emoji, [width][height]) {
          width: 100%;
          aspect-ratio: auto 16 / 9;
        }
      }

      & + & {
        padding-top: 0;
      }

      &[align='left'] {
        margin-inline-end: 1em;
      }

      &[align='right'] {
        margin-inline-start: 1em;
      }

      &.emoji {
        display: inline;
        width: auto;
        height: 1.2em;
        padding: 0;
        margin: 0;
        vertical-align: -0.25em;
      }
    }

    .formatted-text_broken {
      display: block;
      width: 100%;
      max-width: 100%;
      aspect-ratio: 16 / 9;
      margin: 0.625em auto;
    }

    .formatted-text p {
      margin-bottom: 0.75em;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .formatted-text :is(h1, h2, h3, h4, h5, h6) {
      margin: 1.6em 0 0.8em 0;
      font-weight: var(--bold-weight);
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
      color: var(--url-color);
      overflow-wrap: break-word;
      text-decoration: underline;
      opacity: 100%;
    }

    .formatted-text a:visited {
      color: var(--url-visited-color);
    }

    .formatted-text a:hover {
      text-decoration: none;
    }

    .formatted-text em {
      font-style: italic;
      font-weight: var(--semibold-weight);
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
      padding: 0.375em 0.75em;
      margin-bottom: 1.25em;
      border-inline-start: 0.25em solid var(--border-color);
    }

    .formatted-text hr {
      height: 0.125em;
      margin-block: 1em;
      background: var(--border-color);
      border: none;
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
      background-color: --tune-background(--current);
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
      background-color: --tune-background(--current);
      border-radius: 0.375em;
    }

    .formatted-text kbd {
      padding: 0 0.25em;
      font: var(--mono-font);
      font-size: 80%;
      background-color: --tune-background(--current);
      border: 0 solid var(--border-color);
      border-width: 0.125em 0.125em 0.25em 0.125em;
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

    .formatted-text.is-simple * {
      font-size: 1em;
    }
  }
</style>
