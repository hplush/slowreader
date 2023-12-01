<script context="module" lang="ts">
  import UiCard from '../../ui/card.svelte'

  export const meta = {
    component: UiCard,
    title: 'UI/Card'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import UiButton from '../../ui/button.svelte'
  import UiCardActions from '../../ui/card-actions.svelte'
  import UiCardTitle from '../../ui/card-title.svelte'
  import UiParagraph from '../../ui/paragraph.svelte'
  import Section from '../section.svelte'
  import Scene from '../scene.svelte'
</script>

<Story name="Base">
  <Section width={500}>
    <UiCard>
      <UiCardTitle>Fireplace</UiCardTitle>
      <UiParagraph>
        A fireplace or hearth is a structure made of brick, stone or metal
        designed to contain a fire. Fireplaces are used for the relaxing
        ambiance they create and for heating a room. Modern fireplaces vary in
        heat efficiency, depending on the design.
      </UiParagraph>
      <UiParagraph>
        Fireplaces are used for the relaxing ambiance they create and for
        heating a room. Modern fireplaces vary in heat efficiency, depending on
        the design.
      </UiParagraph>
    </UiCard>
  </Section>

  <Section width={500}>
    <UiCard>
      <UiParagraph>Are you really want to delete profile?</UiParagraph>
      <UiCardActions>
        <UiButton>Yes</UiButton>
        <UiButton>No</UiButton>
      </UiCardActions>
    </UiCard>
  </Section>
</Story>

<Story name="Slow" parameters={{ themes: { themeOverride: 'light' } }}>
  <Scene slow>
    <Section width={500}>
      <UiCard>
        <UiCardTitle>Fireplace</UiCardTitle>
        <UiParagraph>
          A fireplace or hearth is a structure made of brick, stone or metal
          designed to contain a fire. Fireplaces are used for the relaxing
          ambiance they create and for heating a room. Modern fireplaces vary in
          heat efficiency, depending on the design.
        </UiParagraph>
        <UiParagraph>
          Fireplaces are used for the relaxing ambiance they create and for
          heating a room. Modern fireplaces vary in heat efficiency, depending
          on the design.
        </UiParagraph>
      </UiCard>
    </Section>

    <Section width={500}>
      <UiCard>
        <UiParagraph>Are you really want to delete profile?</UiParagraph>
        <UiCardActions>
          <UiButton>Yes</UiButton>
          <UiButton>No</UiButton>
        </UiCardActions>
      </UiCard>
    </Section>
  </Scene>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={500}>
    <UiCard>
      <UiCardTitle>Fireplace</UiCardTitle>
      <UiParagraph>
        A fireplace or hearth is a structure made of brick, stone or metal
        designed to contain a fire. Fireplaces are used for the relaxing
        ambiance they create and for heating a room. Modern fireplaces vary in
        heat efficiency, depending on the design.
      </UiParagraph>
      <UiParagraph>
        Fireplaces are used for the relaxing ambiance they create and for
        heating a room. Modern fireplaces vary in heat efficiency, depending on
        the design.
      </UiParagraph>
    </UiCard>
  </Section>

  <Section width={500}>
    <UiCard>
      <UiParagraph>Are you really want to delete profile?</UiParagraph>
      <UiCardActions>
        <UiButton>Yes</UiButton>
        <UiButton>No</UiButton>
      </UiCardActions>
    </UiCard>
  </Section>
</Story>

<Story name="Dark Slow" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Scene slow>
    <Section width={500}>
      <UiCard>
        <UiCardTitle>Fireplace</UiCardTitle>
        <UiParagraph>
          A fireplace or hearth is a structure made of brick, stone or metal
          designed to contain a fire. Fireplaces are used for the relaxing
          ambiance they create and for heating a room. Modern fireplaces vary in
          heat efficiency, depending on the design.
        </UiParagraph>
        <UiParagraph>
          Fireplaces are used for the relaxing ambiance they create and for
          heating a room. Modern fireplaces vary in heat efficiency, depending
          on the design.
        </UiParagraph>
      </UiCard>
    </Section>

    <Section width={500}>
      <UiCard>
        <UiParagraph>Are you really want to delete profile?</UiParagraph>
        <UiCardActions>
          <UiButton>Yes</UiButton>
          <UiButton>No</UiButton>
        </UiCardActions>
      </UiCard>
    </Section>
  </Scene>
</Story>
