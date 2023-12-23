<script lang="ts">
  import { onMount } from 'svelte'

  export let title: string

  let prevTitle = document.title

  onMount(() => {
    document.title = title + ' › ' + prevTitle
    return () => {
      document.title = prevTitle
    }
  })
</script>

<main class="two-steps-page">
  <div class="two-steps-page_step">
    <slot name="one" />
  </div>
  <div class="two-steps-page_step">
    <slot name="two" />
  </div>
</main>

<style>
  .two-steps-page {
    box-sizing: border-box;
    display: flex;
    gap: var(--padding-l);
    justify-content: space-around;
    width: 100%;
    min-height: 100%;
    padding: var(--padding-l);
  }

  .two-steps-page_step {
    width: 50%;
    max-width: 600px;
    min-height: 100%;
  }
</style>
