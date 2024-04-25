<script context="module" lang="ts">
  import PaginationBar from '../../ui/pagination-bar.svelte'

  export const meta = {
    component: PaginationBar,
    title: 'UI/PaginationBar'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'
  import { atom } from 'nanostores'

  import Section from '../section.svelte'

  let page = atom<number>(1)
</script>

<Story name="Base">
  <Section width={500}>
    No pagination
    <PaginationBar
      currentPage={1}
      label="50 posts"
      totalPages={1}
      on:click={() => {}}
    />
  </Section>
  <Section width={500}>
    <PaginationBar
      currentPage={1}
      label="50 posts"
      totalPages={2}
      on:click={() => {}}
    />
  </Section>
  <Section width={500}>
    <PaginationBar
      currentPage={1}
      label="50 posts"
      totalPages={3}
      on:click={() => {}}
    />
  </Section>
  <Section width={500}>
    <PaginationBar
      currentPage={2}
      label="50 posts"
      totalPages={3}
      on:click={() => {}}
    />
  </Section>
  <Section width={500}>
    <PaginationBar
      currentPage={2}
      label="50 posts"
      totalPages={3}
      on:click={() => {}}
    />
  </Section>
  <Section width={500}>
    <PaginationBar
      currentPage={3}
      label="50 posts"
      totalPages={3}
      on:click={() => {}}
    />
  </Section>
  <Section width={500}>
    <PaginationBar
      currentPage={$page}
      label="5000 posts"
      totalPages={50}
      on:click={e => {
        page.set(e.detail)
      }}
    />
  </Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={500}>
    <PaginationBar
      currentPage={1}
      label="50 posts"
      totalPages={2}
      on:click={() => {}}
    />
  </Section>
</Story>
