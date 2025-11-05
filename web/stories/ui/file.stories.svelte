<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import File from '../../ui/file.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: File,
    title: 'UI/File'
  })
</script>

<script lang="ts">
  import { mdiCloudUpload as icon } from '@mdi/js'

  import Scene from '../scene.svelte'

  function onchange(): void {}
</script>

<Story name="Base" asChild>
  <Scene>
    <Section>
      <File {icon} {onchange} variant="main">Upload</File>
    </Section>
    <Section>
      <File {icon} loader {onchange} variant="main">Upload</File>
      <File {icon} loader={0.5} {onchange} variant="main">Upload</File>
    </Section>
  </Scene>
</Story>
