<script lang="ts">
  import { aboutMessages as t } from '@slowreader/core/messages'

  import UiCard from '../ui/card.svelte'
</script>

<UiCard>
  <a href="https://github.com/hplush/slowreader" target="_blank">{$t.source}</a>
</UiCard>
