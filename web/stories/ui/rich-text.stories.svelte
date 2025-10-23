<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import RichText from '../../ui/rich-text.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: RichText,
    title: 'UI/RichText'
  })
</script>

<Story name="Base" asChild>
  <Section>
    <RichText text={'simple text'} />
  </Section>
  <Section>
    <RichText text={'<b>&lt;i&gt;XSS&lt;/i&gt;</b>'} />
  </Section>
  <Section>
    <RichText text={'alert<iframe//src=jAva&Tab;script:alert(3)>'} />
  </Section>
  <Section>
    <RichText text={'- list\n- with\n- many\n- items'} />
  </Section>
  <Section>
    <RichText text={'two\n\nlines'} />
  </Section>
  <Section>
    <RichText text={'[link]\n\nwith markdown'} url="#" />
  </Section>
</Story>
