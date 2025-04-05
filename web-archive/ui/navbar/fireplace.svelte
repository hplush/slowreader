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
    /* Icons hacks is part of RTL/LTR writing */
    /* stylelint-disable property-disallowed-list */
    .navbar-fireplace {
      position: relative;
    }

    .navbar-fireplace_fire {
      --icon-move: -8px -5px;

      position: absolute;
      inset-inline-start: 5px;
      top: 8px;
      width: 6px;
      height: 6px;
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
      inset-inline-start: 5px;
      top: 8.5px;
      width: 6px;
      height: 5.5px;
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
