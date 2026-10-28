<script lang="ts">
  let { value }: { value: string } = $props()

  let parts = $derived(value.match(/^(\d+\.)(\d{4})(\d{2})(\d{2})(.*)$/))
</script>

{#if parts}
  {parts[1]}<b class="version_year">{parts[2]}</b>{parts[3]}<b
    class="version_day">{parts[4]}</b
  >{parts[5]}
{:else}
  {value}
{/if}

<style lang="postcss">
  :global {
    .version_year {
      margin-inline: 0.1rem 0.15rem;
      font-weight: 700;
    }

    .version_day {
      margin-inline: 0.15rem 0.1rem;
      font-weight: 700;
    }
  }
</style>
