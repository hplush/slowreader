<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import NextPagination from '../../ui/next-pagination.svelte'
  import Scene from '../scene.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: NextPagination,
    title: 'UI/NextPagination'
  })
</script>

<script lang="ts">
  function onread(): void {}
</script>

<Story name="Base" asChild>
  <Scene>
    <Section width={400}>
      <NextPagination
        loader={false}
        next="20:b"
        {onread}
        page={0}
        prev={undefined}
      />
    </Section>
    <Section width={400}>
      <NextPagination
        loader={false}
        next="10:c"
        {onread}
        page={1}
        prev="40:a"
      />
    </Section>
    <Section width={400}>
      <NextPagination loader next={undefined} {onread} page={2} prev="20:b" />
    </Section>
  </Scene>
</Story>
