<script lang="ts">
  import { mdiBookmarkOutline } from '@mdi/js'
  import { laterCount, router, laterMessages as t } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import NavbarItem from './item.svelte'
</script>

<div class="navbar-later">
  <NavbarItem
    name={$t.title}
    current={$router.route === 'later'}
    href={getURL('later')}
    icon={mdiBookmarkOutline}
    number={$laterCount}
  />
</div>

<style>
  :global {
    .navbar-later {
      padding-block: 0.25rem;

      @media (--no-desktop) {
        padding-top: 1.5rem;
      }
    }
  }
</style>
