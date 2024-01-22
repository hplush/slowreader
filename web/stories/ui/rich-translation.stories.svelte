<script context="module" lang="ts">
  import RichTranslation from '../../ui/rich-translation.svelte'

  export const meta = {
    component: RichTranslation,
    title: 'UI/RichTranslation'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Section from '../section.svelte'
</script>

<Story name="Base">
  <Section>
    <RichTranslation text={'simple text'} />
  </Section>
  <Section>
    <RichTranslation text={'<b>&lt;i&gt;XSS&lt;/i&gt;</b>'} />
  </Section>
  <Section>
    <RichTranslation text={'alert<iframe//src=jAva&Tab;script:alert(3)>'} />
  </Section>
  <Section>
    <RichTranslation text={'- list\n- with\n- many\n- items'} />
  </Section>
  <Section>
    <RichTranslation text={'two\n\nlines'} />
  </Section>
  <Section>
    <RichTranslation text={'[link]\n\nwith markdown'} url="#" />
  </Section>
</Story>
