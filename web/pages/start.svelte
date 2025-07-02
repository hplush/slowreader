<script lang="ts">
  import { generateCredentials, startMessages as t } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import TwoOptions from '../ui/two-options.svelte'
</script>

<TwoOptions>
  {#snippet one()}
    <Button onclick={generateCredentials} size="wide">{$t.localButton}</Button>
  {/snippet}
  {#snippet two()}{/snippet}
</TwoOptions>
