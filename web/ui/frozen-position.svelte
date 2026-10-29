<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Attachment } from 'svelte/attachments'
  import { on } from 'svelte/events'

  let { children }: { children: Snippet } = $props()

  let content: HTMLDivElement
  let frozen = $state<
    | {
        height: number
        left: number
        rootSize: number
        top: number
        width: number
      }
    | undefined
  >()
  let zoom = $state(1)
  let pressed = false
  let hovered = false

  function getRootSize(): number {
    return parseFloat(getComputedStyle(document.documentElement).fontSize)
  }

  let rootObserver = new MutationObserver(() => {
    if (frozen) zoom = frozen.rootSize / getRootSize()
  })

  function unfreeze(): void {
    rootObserver.disconnect()
    frozen = undefined
    zoom = 1
  }

  function freeze(): void {
    let rect = content.getBoundingClientRect()
    let parent = content.offsetParent ?? document.documentElement
    let origin = parent.getBoundingClientRect()
    frozen = {
      height: rect.height,
      left: rect.left - origin.left - parent.clientLeft + parent.scrollLeft,
      rootSize: getRootSize(),
      top: rect.top - origin.top - parent.clientTop + parent.scrollTop,
      width: rect.width
    }
    rootObserver.observe(document.documentElement, {
      attributeFilter: ['class', 'style'],
      attributes: true
    })
  }

  let trackPointer: Attachment<HTMLElement> = wrapper => {
    let unbindUp: (() => void) | undefined
    let unbindDown = on(wrapper, 'pointerdown', () => {
      pressed = true
      unbindUp?.()
      unbindUp = on(
        window,
        'pointerup',
        () => {
          pressed = false
          if (!hovered) unfreeze()
        },
        { once: true }
      )
      if (!frozen) freeze()
    })
    let unbindEnter = on(wrapper, 'pointerenter', () => {
      hovered = true
    })
    let unbindLeave = on(wrapper, 'pointerleave', () => {
      hovered = false
      if (!pressed) unfreeze()
    })
    return () => {
      unbindDown()
      unbindUp?.()
      unbindEnter()
      unbindLeave()
      rootObserver.disconnect()
    }
  }
</script>

<div
  style:height={frozen ? `${frozen.height}px` : null}
  class="frozen-position"
  {@attach trackPointer}
>
  <div
    bind:this={content}
    style:top={frozen ? `${frozen.top / zoom}px` : null}
    style:left={frozen ? `${frozen.left / zoom}px` : null}
    style:width={frozen ? `${frozen.width / zoom}px` : null}
    style:zoom={frozen ? zoom : null}
    class="frozen-position_content"
    class:is-frozen={!!frozen}
  >
    {@render children()}
  </div>
</div>

<style>
  :global {
    .frozen-position {
      width: stretch;
    }

    .frozen-position_content {
      &.is-frozen {
        position: absolute;
        z-index: 1;
        padding: 0.5rem;
        margin: -0.5rem;
        background: var(--current-background);
        border-radius: calc(var(--base-radius) + 0.5rem);
        box-shadow: var(--float-box-shadow);
      }
    }
  }
</style>
