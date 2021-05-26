<script lang="ts">
  import { router } from '../stores/router'
  import Button from '../ui/button.svelte'
</script>

<h1>Slow Reader</h1>

<div>{$router.route}</div>

<Button>Home</Button>
