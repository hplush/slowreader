<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Loader from '../../ui/loader.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Loader,
    title: 'UI/Loader'
  })
</script>

<script lang="ts">
  import { onMount } from 'svelte'

  let progress = $state<number | undefined>()

  onMount(() => {
    let loaderAnimation = setInterval(() => {
      progress = progress === undefined ? 0.25 : progress + 0.25
      if (progress > 1) {
        progress = undefined
      }
    }, 1000)
    return () => {
      clearInterval(loaderAnimation)
    }
  })
</script>

<Story name="Light" asChild>
  <Section>
    <Loader />
  </Section>
  <Section>
    <Loader value={0.5} />
  </Section>
  <Section>
    <Loader value={progress} />
  </Section>
  <Section height={100} width={100}>
    <Loader />
  </Section>
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Loader />
</Story>
