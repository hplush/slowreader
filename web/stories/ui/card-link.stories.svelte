<script context="module" lang="ts">
  import CardLink from '../../ui/card-link.svelte'

  export const meta = {
    component: CardLink,
    title: 'UI/CardLink'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import CardLinks from '../../ui/card-links.svelte'
  import Card from '../../ui/card.svelte'
  import Paragraph from '../../ui/paragraph.svelte'
  import Section from '../section.svelte'
</script>

<Story name="Base">
  <Section width={500}>
    <Card>
      <CardLinks>
        <CardLink name="First" first />
        <CardLink name="Second" />
        <CardLink name="Third" />
      </CardLinks>
    </Card>
  </Section>

  <Section hover="li:first-child button" width={500}>
    <Card>
      <CardLinks>
        <CardLink name="Hover" first />
        <CardLink name="Second" />
        <CardLink name="Third" />
      </CardLinks>
    </Card>
  </Section>

  <Section active="li:first-child a" width={500}>
    <Card>
      <CardLinks>
        <CardLink name="Pressed" first href="#" />
        <CardLink name="Second" href="#" />
        <CardLink name="Third" href="#" />
      </CardLinks>
    </Card>
  </Section>

  <Section width={500}>
    <Card>
      <CardLinks>
        <CardLink name="First" />
        <CardLink name="Current" current />
        <CardLink name="Third" />
      </CardLinks>
    </Card>
  </Section>

  <Section active="li:last-child button" width={500}>
    <Card>
      <CardLinks>
        <CardLink name="First" first />
        <CardLink name="Second" />
        <CardLink name="Pressed" />
      </CardLinks>
    </Card>
  </Section>

  <Section focus="li:first-child button" width={500}>
    <Card>
      <CardLinks>
        <CardLink name="Focus" current />
        <CardLink name="Second" />
        <CardLink name="Third" />
      </CardLinks>
    </Card>
  </Section>

  <Section width={300}>
    <Card>
      <Paragraph>Before</Paragraph>
      <CardLinks>
        <CardLink name="First" first />
        <CardLink name="A super very very long name to test text trimming" />
        <CardLink name="Third" />
      </CardLinks>
      <Paragraph>After</Paragraph>
    </Card>
  </Section>

  <Section hover width={500}>
    <Card>
      <CardLinks>
        <CardLink name="First" current first />
      </CardLinks>
    </Card>
  </Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={500}>
    <Card>
      <CardLinks>
        <CardLink name="First" first />
        <CardLink name="Second" />
        <CardLink name="Third" />
      </CardLinks>
    </Card>
  </Section>

  <Section hover="li:first-child button" width={500}>
    <Card>
      <CardLinks>
        <CardLink name="Hover" first />
        <CardLink name="Second" />
        <CardLink name="Third" />
      </CardLinks>
    </Card>
  </Section>

  <Section active="li:first-child button" width={500}>
    <Card>
      <CardLinks>
        <CardLink name="Pressed" first />
        <CardLink name="Second" />
        <CardLink name="Third" />
      </CardLinks>
    </Card>
  </Section>

  <Section active="li:nth-child(2) button" width={500}>
    <Card>
      <CardLinks>
        <CardLink name="First" first />
        <CardLink name="Pressed" />
        <CardLink name="Third" />
      </CardLinks>
    </Card>
  </Section>

  <Section active="li:last-child button" width={500}>
    <Card>
      <CardLinks>
        <CardLink name="First" first />
        <CardLink name="Second" />
        <CardLink name="Pressed" />
      </CardLinks>
    </Card>
  </Section>

  <Section focus="li:first-child a" width={500}>
    <Card>
      <CardLinks>
        <CardLink name="Focus" first href="#" />
        <CardLink name="Second" href="#" />
        <CardLink name="Third" href="#" />
      </CardLinks>
    </Card>
  </Section>

  <Section hover width={500}>
    <Card>
      <CardLinks>
        <CardLink name="First" current first />
      </CardLinks>
    </Card>
  </Section>

  <Section width={500}>
    <Card>
      <CardLinks>
        <CardLink name="First" current first />
      </CardLinks>
    </Card>
  </Section>
</Story>
