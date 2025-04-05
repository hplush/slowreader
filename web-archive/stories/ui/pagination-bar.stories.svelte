<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import PaginationBar from '../../ui/pagination-bar.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: PaginationBar,
    title: 'UI/PaginationBar'
  })
</script>

<script lang="ts">
  import { atom } from 'nanostores'

  let page = atom<number>(1)
</script>

<Story name="Base">
  <Section width={500}>
    No pagination
    <PaginationBar
      currentPage={1}
      label="50 posts"
      onclick={() => {}}
      totalPages={1}
    />
  </Section>
  <Section width={500}>
    <PaginationBar
      currentPage={1}
      label="50 posts"
      onclick={() => {}}
      totalPages={2}
    />
  </Section>
  <Section width={500}>
    <PaginationBar
      currentPage={1}
      label="50 posts"
      onclick={() => {}}
      totalPages={3}
    />
  </Section>
  <Section width={500}>
    <PaginationBar
      currentPage={2}
      label="50 posts"
      onclick={() => {}}
      totalPages={3}
    />
  </Section>
  <Section width={500}>
    <PaginationBar
      currentPage={2}
      label="50 posts"
      onclick={() => {}}
      totalPages={3}
    />
  </Section>
  <Section width={500}>
    <PaginationBar
      currentPage={3}
      label="50 posts"
      onclick={() => {}}
      totalPages={3}
    />
  </Section>
  <Section width={500}>
    <PaginationBar
      currentPage={$page}
      label="5000 posts"
      onclick={value => {
        page.set(value)
      }}
      totalPages={50}
    />
  </Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={500}>
    <PaginationBar
      currentPage={1}
      label="50 posts"
      onclick={() => {}}
      totalPages={2}
    />
  </Section>
</Story>
