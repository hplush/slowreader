<script lang="ts">
  import { parseDocument } from '@slowreader/core'
  import { on } from 'svelte/events'

  import icon from '../../public/icon.svg?raw'
</script>

<span
  class="navbar-fireplace"
  {@attach node => {
    node.replaceChildren(parseDocument(icon, 'image/svg+xml').documentElement)
    let timeout: ReturnType<typeof setTimeout> | undefined
    let off = on(node.closest('a') ?? node, 'pointerdown', event => {
      if (event.pointerType === 'mouse' || timeout) return
      node.classList.add('is-burning')
      timeout = setTimeout(() => {
        node.classList.remove('is-burning')
        timeout = undefined
      }, 1500)
    })
    return () => {
      off()
      clearTimeout(timeout)
    }
  }}
  aria-hidden="true"
></span>

<style>
  :global {
    .navbar-fireplace {
      --navbar-fireplace-count: infinite;

      display: flex;

      & > svg {
        width: var(--icon-size);
        height: var(--icon-size);
      }

      :is(a:hover, a:focus-visible) &,
      &.is-burning {
        & path:nth-of-type(n + 2) {
          --navbar-fireplace-rest: var(--fire-outer-color);
          --navbar-fireplace-hot: var(--fire-middle-color);

          transform-origin: 50% 100%;
          animation:
            --navbar-fireplace-flame 1.5s var(--navbar-fireplace-count)
              ease-in-out,
            --navbar-fireplace-flare 1s var(--navbar-fireplace-count)
              ease-in-out;
        }

        & path:nth-of-type(3) {
          --navbar-fireplace-rest: var(--fire-middle-color);
          --navbar-fireplace-hot: var(--fire-inner-color);

          animation-duration: 1.05s, 0.8s;
        }

        & path:nth-of-type(4) {
          --navbar-fireplace-rest: var(--fire-inner-color);
          --navbar-fireplace-hot: var(--fire-hot-color);

          animation-duration: 0.75s, 0.5s;
        }
      }

      &.is-burning {
        --navbar-fireplace-count: 1;
      }
    }

    @keyframes --navbar-fireplace-flame {
      33% {
        rotate: 8deg;
      }

      66% {
        rotate: -8deg;
      }
    }

    @keyframes --navbar-fireplace-flare {
      0%,
      40%,
      100% {
        fill: var(--navbar-fireplace-rest);
      }

      50% {
        scale: 1 1.12;
        fill: var(--navbar-fireplace-hot);
      }
    }
  }
</style>
