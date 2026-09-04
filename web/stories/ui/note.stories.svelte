<script lang="ts" module>
  import { mdiFireplace } from '@mdi/js'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Button from '../../ui/button.svelte'
  import Note from '../../ui/note.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Note,
    title: 'UI/Note'
  })
</script>

<Story name="Light" asChild>
  <Section width={300}>
    <Note icon={mdiFireplace} variant="neutral">
      Slow Reader combines feeds from social networks and RSS and helps read
      more meaningful and deep content.
    </Note>
    <Note icon={mdiFireplace} variant="good">
      Slow Reader combines feeds from social networks and RSS and helps read
      more meaningful and deep content.
    </Note>
    <Note icon={mdiFireplace} variant="warning">
      Slow Reader combines feeds from social networks and RSS and helps read
      more meaningful and deep content.
    </Note>
    <Note icon={mdiFireplace} title="Warning" variant="dangerous">
      Slow Reader combines feeds from social networks and RSS and helps read
      more meaningful and deep content.
    </Note>
    <Note icon={mdiFireplace} variant="neutral">One line</Note>
    <Note icon={mdiFireplace} variant="good">
      Slow Reader combines feeds from social networks and RSS and helps read
      more meaningful and deep content.
      <Button size="wide">Button</Button>
    </Note>
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={300}>
    <Note icon={mdiFireplace} variant="neutral">
      Slow Reader combines feeds from social networks and RSS and helps read
      more meaningful and deep content.
    </Note>
    <Note icon={mdiFireplace} variant="good">
      Slow Reader combines feeds from social networks and RSS and helps read
      more meaningful and deep content.
    </Note>
    <Note icon={mdiFireplace} variant="warning">
      Slow Reader combines feeds from social networks and RSS and helps read
      more meaningful and deep content.
    </Note>
    <Note icon={mdiFireplace} title="Warning" variant="dangerous">
      Slow Reader combines feeds from social networks and RSS and helps read
      more meaningful and deep content.
    </Note>
    <Note icon={mdiFireplace} variant="good">
      Slow Reader combines feeds from social networks and RSS and helps read
      more meaningful and deep content.
      <Button size="wide">Button</Button>
    </Note>
  </Section>
</Story>
