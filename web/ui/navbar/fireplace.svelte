<script lang="ts">
  import { parseDocument } from '@slowreader/core'

  import icon from '../../public/icon.svg?raw'
</script>

<span
  class="navbar-fireplace"
  {@attach node => {
    node.replaceChildren(parseDocument(icon, 'image/svg+xml').documentElement)
  }}
  aria-hidden="true"
></span>

<style>
  :global {
    .navbar-fireplace {
      display: flex;

      & > svg {
        width: var(--icon-size);
        height: var(--icon-size);
      }
    }

    :is(a:hover, a:focus-visible) .navbar-fireplace path:nth-of-type(n + 2) {
      transform-origin: 50% 100%;
      animation:
        --navbar-fireplace-flame 2s infinite ease-in-out,
        --navbar-fireplace-flare 1.3s infinite ease-in-out;
    }

    :is(a:hover, a:focus-visible) .navbar-fireplace path:nth-of-type(3) {
      animation-duration: 1.4s, 1.1s;
    }

    :is(a:hover, a:focus-visible) .navbar-fireplace path:nth-of-type(5) {
      animation-duration: 1s, 0.7s;
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
      50% {
        scale: 1 1.12;
      }
    }
  }
</style>
