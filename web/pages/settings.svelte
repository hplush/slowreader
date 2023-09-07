<script lang="ts">
  import { settingsMessages as t, theme } from '@slowreader/core'
</script>

<fieldset>
  <legend>{$t.theme}</legend>
  <label>
    <input type="radio" value="system" bind:group={$theme} />
    {$t.system}
  </label>
  <label>
    <input type="radio" value="light" bind:group={$theme} />
    {$t.light}
  </label>
  <label>
    <input type="radio" value="dark" bind:group={$theme} />
    {$t.dark}
  </label>
</fieldset>
