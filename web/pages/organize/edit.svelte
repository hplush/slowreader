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
    checked={reading === 'fast'}
    type="radio"
    value="fast"
    on:click={() => {
      setReading('fast')
    }}
  />
  {$t.fast}
</label>
<label>
  <input
    checked={reading === 'slow'}
    type="radio"
    value="slow"
    on:click={() => {
      setReading('slow')
    }}
  />
  {$t.slow}
</label>
