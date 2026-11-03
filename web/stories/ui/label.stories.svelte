<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Label from '../../ui/label.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Label,
    title: 'UI/Label'
  })
</script>

<Story name="Base" asChild>
  <Section width={400}>
    <Label tag="h2">Recent posts</Label>
  </Section>
  <Section width={400}>
    <Label hint="3 posts per day" tag="h2">Recent posts</Label>
  </Section>
  <Section width={400}>
    <Label hint="24 posts per day" tag="h2" warning="Feed posts too often">
      Recent posts
    </Label>
  </Section>
  <Section width={200}>
    <Label hint="24 posts per day" tag="h2" warning="Feed posts too often">
      Recent posts
    </Label>
  </Section>
</Story>
