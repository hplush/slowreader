<script lang="ts">
  import { router } from '../stores/router'
  import Navbar from '../ui/navbar/index.svelte'
</script>

<Navbar />

<h1>{$router.route}</h1>
