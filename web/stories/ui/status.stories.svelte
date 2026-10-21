<script lang="ts" module>
  import { mdiCheck } from '@mdi/js'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Button from '../../ui/button.svelte'
  import Status from '../../ui/status.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Status,
    title: 'UI/Status'
  })
</script>

<Story name="Base" asChild>
  <Section width={300}>
    <Status icon={mdiCheck}>No updates</Status>
  </Section>
  <Section width={300}>
    <Status>Without icon</Status>
  </Section>
  <Section width={300}>
    <Status label="Sync status">Synchronized</Status>
  </Section>
  <Section width={300}>
    <Button icon={mdiCheck} size="wide">Button to compare</Button>
  </Section>
</Story>
