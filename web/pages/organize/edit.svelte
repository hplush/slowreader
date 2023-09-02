<script lang="ts">
  import {
    type FeedValue,
    type setPreviewReading,
    type setPreviewTitle,
    organizeMessages as t
  } from '@slowreader/core'

  export let reading: FeedValue['reading']
  export let setReading: typeof setPreviewReading

  export let title: FeedValue['title']
  export let setTitle: typeof setPreviewTitle
</script>

<input
  type="text"
  value={title}
  on:change={e => {
    setTitle(e.currentTarget.value)
  }}
/>

<label>
  <input
    type="radio"
    value="fast"
    checked={reading === 'fast'}
    on:click={() => {
      setReading('fast')
    }}
  />
  {$t.fast}
</label>
<label>
  <input
    type="radio"
    value="slow"
    checked={reading === 'slow'}
    on:click={() => {
      setReading('slow')
    }}
  />
  {$t.slow}
</label>
