<script lang="ts">
  /* We escape and have XSS tests */
  /* eslint svelte/no-at-html-tags: "off" */

  import {
    canOpenMention,
    isMediaCached,
    openPopup,
    sanitizeDOM
  } from '@slowreader/core'
  import { mount, unmount } from 'svelte'
  import type { Attachment } from 'svelte/attachments'
  import { on } from 'svelte/events'

  import { waitImageDecoded } from '../lib/image.ts'
  import BrokenImage from './broken-image.svelte'
  import ClickToLoad from './click-to-load.svelte'

  let {
    html,
    lang,
    scroll = true,
    simple = false
  }: {
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
    let mounted = new Set<ReturnType<typeof mount>>()
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
      mounted.add(
        mount(BrokenImage, { props: { alt: image.alt }, target: box })
      )
    }
    function watchLoading(image: HTMLImageElement): void {
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
    }
    function restoreSources(image: HTMLImageElement): void {
      let elements = [
        image,
        ...(image.closest('picture')?.querySelectorAll('source') ?? [])
      ]
      for (let element of elements) {
        for (let attr of ['src', 'srcset']) {
          let value = element.getAttribute(`data-${attr}`)
          if (value === null) continue
          element.setAttribute(attr, value)
          element.removeAttribute(`data-${attr}`)
        }
      }
      watchLoading(image)
    }
    function showClickToLoad(image: HTMLImageElement, url: string): void {
      let box = document.createElement('span')
      box.className = 'formatted-text_click-to-load'
      image.replaceWith(box)
      function showImage(): void {
        if (!box.isConnected) return
        mounted.delete(clickToLoad)
        void unmount(clickToLoad)
        box.replaceWith(image)
        restoreSources(image)
      }
      let clickToLoad = mount(ClickToLoad, {
        props: {
          alt: image.alt,
          height: Number(image.getAttribute('height')) || undefined,
          onload() {
            showImage()
            image.tabIndex = -1
            image.focus({ preventScroll: true })
          },
          url,
          width: Number(image.getAttribute('width')) || undefined
        },
        target: box
      })
      mounted.add(clickToLoad)
      void isMediaCached(url).then(cached => {
        if (cached) showImage()
      })
    }
    node.querySelectorAll('img').forEach(image => {
      let url = image.getAttribute('data-src')
      if (url) {
        showClickToLoad(image, url)
      } else {
        watchLoading(image)
      }
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
      for (let component of mounted) void unmount(component)
    }
  }
</script>

<div
  class="formatted-text"
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
        overflow: auto hidden;
      }

      &:not(.is-scroll) {
        overflow-wrap: anywhere;
      }
    }

    .formatted-text figure {
      max-width: 100%;
      margin-bottom: 0.75lh;
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

    .formatted-text_click-to-load {
      display: flex;
      justify-content: center;
      margin: 0.625em auto;
    }

    .formatted-text_broken {
      display: block;
      width: 100%;
      max-width: 100%;
      aspect-ratio: 16 / 9;
      margin: 0.625em auto;
    }

    .formatted-text p {
      margin-bottom: 0.5lh;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .formatted-text :is(h1, h2, h3, h4, h5, h6) {
      --heading-scale: 1;

      margin: 1.6em 0 0 0;
      font-size: calc(var(--heading-scale) * 1em);
      font-weight: var(--bold-weight);
      line-height: calc(var(--post-line-height) / var(--heading-scale));
    }

    .formatted-text > :is(h1, h2, h3, h4, h5, h6):first-child {
      margin-top: 0;
    }

    .formatted-text h1 {
      --heading-scale: 1.25;
    }

    .formatted-text h2 {
      --heading-scale: 1.175;
    }

    .formatted-text h3 {
      --heading-scale: 1.1;
    }

    .formatted-text h4 {
      --heading-scale: 1.05;
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
      margin-bottom: 0.4lh;
    }

    .formatted-text blockquote {
      padding: 0.375em 0.75em;
      margin-bottom: 0.75lh;
      border-inline-start: 0.25em solid var(--border-color);
    }

    .formatted-text hr {
      height: 0.125em;
      margin-block: 0.625lh;
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
      margin: 0.625lh 0;
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
      padding: 0 0.3em;
      font: var(--mono-font);
      line-height: inherit;
      border-radius: var(--base-radius);
    }

    .formatted-text pre code {
      max-width: 100%;
      padding: 0.1em 0.25em;
      font-size: 90%;
      line-height: 1.8;
      background: transparent;
    }

    .formatted-text p code {
      padding: 0 0.4em;
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
