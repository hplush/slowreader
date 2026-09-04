<script lang="ts">
  import { navbarMessages as t } from '@slowreader/core'
</script>

<div class="navbar-dot"></div>
<span class="sr-only">{$t.error}</span>

<style>
  :global {
    .navbar-dot {
      position: absolute;
      inset-inline-end: 0.125rem;
      top: 0.125rem;
      z-index: 10;
      width: 0.5rem;
      height: 0.5rem;
      background: var(--dangerous-text-color);
      border-radius: 50%;
    }
  }
</style>
