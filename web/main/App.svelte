<script lang="ts">
  import { router } from '../stores/router'
  import Navbar from '../ui/navbar.svelte'
</script>

<Navbar />

<h1>Slow Reader</h1>

<div>{$router.route}</div>
