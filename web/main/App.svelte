<script lang="ts">
  import { isSlowRoutes } from '@slowreader/core'

  import { router } from '../stores/router'
  import Navbar from '../ui/navbar/index.svelte'

  $: {
    document.body.classList.toggle('is-slow', isSlowRoutes($router))
  }
</script>

<Navbar />

<h1>{$router.route}</h1>
