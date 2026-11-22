<script lang="ts">
  import { navbarMessages as t } from '@slowreader/core'

  import NavbarOther from '../ui/navbar/other.svelte'
  import NavbarSync from '../ui/navbar/sync.svelte'
  import ThinPage from '../ui/thin-page.svelte'
</script>

<ThinPage title={$t.menu}>
  <NavbarSync />
  <NavbarOther />
</ThinPage>
