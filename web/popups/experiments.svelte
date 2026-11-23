<script lang="ts">
  import { mdiChevronRight } from '@mdi/js'
  import {
    type ExperimentsPopup,
    getPopupId,
    router,
    aboutMessages as t
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Links from '../ui/links.svelte'
  import Popup from '../ui/popup.svelte'
  import RichText from '../ui/rich-text.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { popup }: { popup: ExperimentsPopup } = $props()
  let { experiments } = $derived(popup)
</script>

<Popup id={getPopupId(popup.name, popup.param)}>
  <Stack gap="l">
    <Stack gap="s">
      <Title>{$t.experiments}</Title>
      <RichText text={$t.experimentsDescription} />
    </Stack>
    <Links
      id="experiments-list"
      anchor="experiment"
      links={$experiments.map(i => ({
        controls: getPopupId('experiment', i.experiment.name),
        hint: i.hint,
        href: getPopupHash($router, 'experiment', i.experiment.name),
        id: i.experiment.name,
        item: i.experiment,
        mark: mdiChevronRight
      }))}
    >
      {#snippet item(experiment)}
        {experiment.title}
      {/snippet}
    </Links>
  </Stack>
</Popup>
