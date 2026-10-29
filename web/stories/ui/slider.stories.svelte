<script lang="ts" module>
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import type { Attachment } from 'svelte/attachments'

  import Slider from '../../ui/slider.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Slider,
    title: 'UI/Slider'
  })

  // Slider tracks hover and press by pointer events, not by CSS pseudo-classes
  function pointer(
    type: 'pointerdown' | 'pointermove',
    selector: string
  ): Attachment<HTMLElement> {
    return element => {
      let rect = element.querySelector(selector)?.getBoundingClientRect()
      if (!rect) return
      element.querySelector('.slider_input')?.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2
        })
      )
    }
  }
</script>

<script lang="ts">
  let value = $state(120)

  function oninput(v: number): void {
    value = v
  }
</script>

{#snippet sliders()}
  <Section width={300}>
    <Slider
      label="Base"
      max={200}
      min={80}
      {oninput}
      output={`${value}%`}
      step={10}
      {value}
    />
  </Section>
  <Section focus width={300}>
    <Slider
      label="Focus with mark"
      mark={100}
      max={200}
      min={80}
      {oninput}
      output={`${value}%`}
      step={10}
      {value}
    />
  </Section>
  <Section width={300}>
    <div {@attach pointer('pointermove', '.slider_dot:nth-child(8)')}>
      <Slider
        label="Hover on dot"
        max={200}
        min={80}
        {oninput}
        output={`${value}%`}
        step={10}
        {value}
      />
    </div>
  </Section>
  <Section width={300}>
    <div {@attach pointer('pointermove', '.slider_thumb')}>
      <Slider
        label="Hover on thumb"
        max={200}
        min={80}
        {oninput}
        output={`${value}%`}
        step={10}
        {value}
      />
    </div>
  </Section>
  <Section width={300}>
    <div {@attach pointer('pointerdown', '.slider_thumb')}>
      <Slider
        label="Pressed thumb"
        max={200}
        min={80}
        {oninput}
        output={`${value}%`}
        step={10}
        {value}
      />
    </div>
  </Section>
  <Section main width={360}>
    <Slider
      buttons={{ decrease: 'Decrease', increase: 'Increase' }}
      label="Buttons on main background"
      mark={100}
      max={200}
      min={80}
      {oninput}
      output={`${value}%`}
      step={10}
      {value}
    />
  </Section>
  <Section width={360}>
    <Slider
      buttons={{ decrease: 'Decrease', increase: 'Increase' }}
      label="Max value disables increase"
      mark={100}
      max={200}
      min={80}
      {oninput}
      output="200%"
      step={10}
      value={200}
    />
  </Section>
{/snippet}

<Story name="Light" asChild>
  {@render sliders()}
</Story>

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  {@render sliders()}
</Story>
