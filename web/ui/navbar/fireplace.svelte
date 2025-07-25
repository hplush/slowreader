<script lang="ts">
  import { mdiFireplace } from '@mdi/js'

  import Icon from '../icon.svelte'
</script>

<div class="navbar-fireplace">
  <Icon compensate={1} path={mdiFireplace} />
  <div class="navbar-fireplace_fire is-main">
    <Icon compensate={1} path={mdiFireplace} />
  </div>
  <div class="navbar-fireplace_fire is-second">
    <Icon compensate={1} path={mdiFireplace} />
  </div>
</div>

<style>
  :global {
    .navbar-fireplace {
      position: relative;
    }

    .navbar-fireplace_fire {
      --icon-move: -0.5rem -0.3125rem;

      position: absolute;
      inset-inline-start: 0.3125rem;
      top: 0.5rem;
      width: 0.375rem;
      height: 0.375rem;
      overflow: hidden;
      color: var(--fire1-color);
      transform-origin: 50% 100%;
    }

    a:hover .navbar-fireplace_fire.is-main,
    a:focus-visible .navbar-fireplace_fire.is-main {
      z-index: 2;
      animation: --navbar-fireplace-rotating 2s infinite ease-in-out;
    }

    a:hover .navbar-fireplace_fire.is-second,
    a:focus-visible .navbar-fireplace_fire.is-second {
      z-index: 1;
      color: var(--fire2-color);
      animation: --navbar-fireplace-rotating 3s infinite ease-in-out 0.5s;
    }

    a:hover .navbar-fireplace::after,
    a:focus-visible .navbar-fireplace::after {
      position: absolute;
      inset-inline-start: 0.3125rem;
      top: 0.5313rem;
      width: 0.375rem;
      height: 0.3438rem;
      content: '';
      background: var(--hover-color);
    }

    @keyframes --navbar-fireplace-rotating {
      25% {
        rotate: 20deg;
      }

      50% {
        rotate: 0;
      }

      75% {
        rotate: -20deg;
      }

      100% {
        rotate: 0;
      }
    }
  }
</style>
