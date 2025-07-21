<script lang="ts">
  import { closeMenu, isMenuOpened } from '@slowreader/core'
  import { onMount } from 'svelte'
  import { on } from 'svelte/events'

  let removeEvent: (() => void) | undefined
  isMenuOpened.listen((isOpened: boolean) => {
    if (isOpened) {
      setTimeout(() => {
        removeEvent = on(document, 'click', closeMenu)
      }, 1)
    } else {
      removeEvent?.()
    }
  })

  onMount(() => {
    document.documentElement.classList.add('has-navbar')
    return () => {
      removeEvent?.()
      document.documentElement.classList.remove('has-navbar')
    }
  })
</script>

<nav class="navbar"></nav>

<style>
  :global {
    :root {
      --navbar-width: 0;
      --navbar-height: 0;
    }

    :root.has-navbar {
      --navbar-width: 290px;
      --navbar-height: 56px;
    }

    .navbar {
      position: fixed;
      inset-block: 0;
      inset-inline-start: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: var(--navbar-width);
    }
  }
</style>
