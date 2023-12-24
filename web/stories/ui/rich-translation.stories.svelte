<script context="module" lang="ts">
  import UiRichTranslation from '../../ui/rich-translation.svelte'

  export const meta = {
    component: UiRichTranslation,
    title: 'UI/RichTranslation'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Section from '../section.svelte'
</script>

<Story name="Base">
  <Section>
    <UiRichTranslation text={'simple text'} />
  </Section>
  <Section>
    <UiRichTranslation text={'<b>&lt;i&gt;XSS&lt;/i&gt;</b>'} />
  </Section>
  <Section>
    <UiRichTranslation text={'- list\n- with\n- many\n- items'} />
  </Section>
  <Section>
    <UiRichTranslation text={'two\n\nlines'} />
  </Section>
  <Section>
    <UiRichTranslation text={'[link]\n\nwith markdown'} url="#" />
  </Section>
</Story>
