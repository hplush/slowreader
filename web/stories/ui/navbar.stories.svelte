<script context="module" lang="ts">
  import Navbar from '../../ui/navbar/index.svelte'

  export const meta = {
    component: Navbar,
    title: 'UI/Navbar'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Scene from '../scene.svelte'
  import Section from '../section.svelte'
</script>

<Story name="Slow" parameters={{ layout: 'fullscreen' }}>
  <Scene route={{ params: {}, route: 'slow' }}>
    <Navbar />
  </Scene>
</Story>

<Story name="Fast" parameters={{ layout: 'fullscreen' }}>
  <Scene
    categories={[
      { id: 'a', title: 'Pneumonoultramicroscopicsilicovolcanoconiosis' }
    ]}
    feeds={[{ categoryId: 'a', reading: 'fast' }, { reading: 'fast' }]}
    route={{ params: { category: 'general' }, route: 'fast' }}
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Add" parameters={{ layout: 'fullscreen' }}>
  <Scene
    refreshing={{ processedFeeds: 2, totalFeeds: 4 }}
    route={{ params: {}, route: 'add' }}
  >
    <Section border={false} focus=".navbar_link:first-child">
      <Navbar />
    </Section>
  </Scene>
</Story>

<Story name="Scroll" parameters={{ layout: 'fullscreen' }}>
  <Scene route={{ params: {}, route: 'interface' }}>
    <Section border={false} height={300}>
      <Navbar />
    </Section>
  </Scene>
</Story>

<Story
  name="Mobile"
  parameters={{
    viewport: { defaultViewport: 'iphone5' }
  }}
>
  <Scene route={{ params: {}, route: 'interface' }}>
    <Navbar />
  </Scene>
</Story>

<Story
  name="Mobile Back Button"
  parameters={{
    viewport: { defaultViewport: 'iphone5' }
  }}
>
  <Scene route={{ params: {}, route: 'interface' }} showSecondStep={true}>
    <Navbar />
  </Scene>
</Story>

<Story
  name="Tablet"
  parameters={{
    viewport: { defaultViewport: 'ipad' }
  }}
>
  <Scene route={{ params: {}, route: 'interface' }}>
    <Navbar />
  </Scene>
</Story>

<Story name="Settings" parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[]} route={{ params: {}, route: 'interface' }}>
    <Navbar />
  </Scene>
</Story>

<Story
  name="Dark Slow"
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene route={{ params: {}, route: 'slow' }}>
    <Navbar />
  </Scene>
</Story>

<Story
  name="Dark Fast"
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene route={{ params: { category: 'general' }, route: 'fast' }}>
    <Navbar />
  </Scene>
</Story>

<Story
  name="Dark Settings"
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene route={{ params: {}, route: 'interface' }}>
    <Section border={false} pressKey="p">
      <Navbar />
    </Section>
  </Scene>
</Story>
