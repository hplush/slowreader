<script lang="ts">
  import type { ReadableAtom } from 'nanostores'

  export let title: string
  export let store: ReadableAtom<string>
  export let values: [string, string][]
</script>

<fieldset>
  <legend>{title}</legend>
  {#each values as [value, name] (value)}
    <label>
      <input type="radio" {value} bind:group={$store} />
      {name}
    </label>
  {/each}
</fieldset>
