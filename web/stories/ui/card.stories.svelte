<script context="module" lang="ts">
  import Card from '../../ui/card.svelte'

  export const meta = {
    component: Card,
    title: 'UI/Card'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Button from '../../ui/button.svelte'
  import CardActions from '../../ui/card-actions.svelte'
  import Paragraph from '../../ui/paragraph.svelte'
  import Scene from '../scene.svelte'
  import Section from '../section.svelte'
</script>

<Story name="Base">
  <Section width={500}>
    <Card>
      <Paragraph>
        A fireplace or hearth is a structure made of brick, stone or metal
        designed to contain a fire. Fireplaces are used for the relaxing
        ambiance they create and for heating a room. Modern fireplaces vary in
        heat efficiency, depending on the design.
      </Paragraph>
      <Paragraph>
        Fireplaces are used for the relaxing ambiance they create and for
        heating a room. Modern fireplaces vary in heat efficiency, depending on
        the design.
      </Paragraph>
    </Card>
  </Section>

  <Section width={500}>
    <Card>
      <Paragraph>Are you really want to delete profile?</Paragraph>
      <CardActions>
        <Button>Yes</Button>
        <Button>No</Button>
      </CardActions>
    </Card>
  </Section>
</Story>

<Story name="Slow" parameters={{ themes: { themeOverride: 'light' } }}>
  <Scene slow>
    <Section width={500}>
      <Card>
        <Paragraph>
          A fireplace or hearth is a structure made of brick, stone or metal
          designed to contain a fire. Fireplaces are used for the relaxing
          ambiance they create and for heating a room. Modern fireplaces vary in
          heat efficiency, depending on the design.
        </Paragraph>
        <Paragraph>
          Fireplaces are used for the relaxing ambiance they create and for
          heating a room. Modern fireplaces vary in heat efficiency, depending
          on the design.
        </Paragraph>
      </Card>
    </Section>

    <Section width={500}>
      <Card>
        <Paragraph>Are you really want to delete profile?</Paragraph>
        <CardActions>
          <Button>Yes</Button>
          <Button>No</Button>
        </CardActions>
      </Card>
    </Section>
  </Scene>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={500}>
    <Card>
      <Paragraph>
        A fireplace or hearth is a structure made of brick, stone or metal
        designed to contain a fire. Fireplaces are used for the relaxing
        ambiance they create and for heating a room. Modern fireplaces vary in
        heat efficiency, depending on the design.
      </Paragraph>
      <Paragraph>
        Fireplaces are used for the relaxing ambiance they create and for
        heating a room. Modern fireplaces vary in heat efficiency, depending on
        the design.
      </Paragraph>
    </Card>
  </Section>

  <Section width={500}>
    <Card>
      <Paragraph>Are you really want to delete profile?</Paragraph>
      <CardActions>
        <Button>Yes</Button>
        <Button>No</Button>
      </CardActions>
    </Card>
  </Section>
</Story>

<Story name="Dark Slow" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Scene slow>
    <Section width={500}>
      <Card>
        <Paragraph>
          A fireplace or hearth is a structure made of brick, stone or metal
          designed to contain a fire. Fireplaces are used for the relaxing
          ambiance they create and for heating a room. Modern fireplaces vary in
          heat efficiency, depending on the design.
        </Paragraph>
        <Paragraph>
          Fireplaces are used for the relaxing ambiance they create and for
          heating a room. Modern fireplaces vary in heat efficiency, depending
          on the design.
        </Paragraph>
      </Card>
    </Section>

    <Section width={500}>
      <Card>
        <Paragraph>Are you really want to delete profile?</Paragraph>
        <CardActions>
          <Button>Yes</Button>
          <Button>No</Button>
        </CardActions>
      </Card>
    </Section>
  </Scene>
</Story>
