<script lang="ts">
  import { onMount } from 'svelte'

  export let title: string
  export let page: string | undefined = undefined

  let prevTitle = document.title

  onMount(() => {
    document.title = (page ?? title) + ' › ' + prevTitle
    return () => {
      document.title = prevTitle
    }
  })
</script>

<h1 class="page-title">{title}</h1>

<style>
  .page-title {
    margin-bottom: var(--padding-xl);
    font: var(--page-title-font);
  }
</style>
