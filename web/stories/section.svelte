<script lang="ts">
  import { type Snippet, tick } from 'svelte'
  import type { Attachment } from 'svelte/attachments'

  let {
    active = false,
    blur = false,
    children,
    focus = false,
    height,
    hotkeys = true,
    hover = false,
    main = false,
    pressKey,
    stack = false,
    width
  }: {
    active?: boolean | string
    blur?: boolean | string
    children: Snippet
    focus?: boolean | string
    height?: number
    hotkeys?: boolean
    hover?: boolean | string
    main?: boolean
    pressKey?: string
    stack?: boolean
    width?: number
  } = $props()

  const INTERACTIVE_ELEMENTS = 'button, a, input, select'

  function addClass(
    section: Element,
    option: string | true,
    cls: string
  ): void {
    let selector: string
    if (option === true) {
      selector = INTERACTIVE_ELEMENTS
    } else {
      selector = option
    }
    for (let el of section.querySelectorAll(selector)) {
      el.classList.add(cls)
    }
  }

  const applyClasses: Attachment = section => {
    if (hover) addClass(section, hover, 'is-pseudo-hover')
    if (focus) addClass(section, focus, 'is-pseudo-focus-visible')
    if (active) addClass(section, active, 'is-pseudo-active')
    if (!hotkeys) section.classList.add('is-hotkey-disabled')
    if (blur) {
      let selector: string
      if (blur === true) {
        selector = INTERACTIVE_ELEMENTS
      } else {
        selector = blur
      }
      for (let el of section.querySelectorAll<HTMLInputElement>(selector)) {
        el.focus()
        tick().then(() => {
          el.blur()
        })
      }
    }
    if (pressKey) {
      tick().then(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { key: pressKey }))
      })
    }
  }
</script>

<section
  style="width: {width}px; height: {height}px;"
  class:is-main={main}
  class:is-sized={width !== undefined || height !== undefined}
  class:is-stack={stack}
  {@attach applyClasses}
>
  {@render children()}
</section>

<style lang="postcss">
  section {
    position: relative;
    padding: 1rem;

    &:first-child {
      margin-top: 0;
    }

    &.is-sized {
      margin-inline: auto;
      transform: scale(1);
    }

    &.is-stack {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    &.is-main {
      @mixin background var(--main-land-color);

      padding: 0.625rem;
      border-radius: calc(var(--base-radius) + 0.625rem);
    }
  }
</style>
