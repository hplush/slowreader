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

  import Card from '../../ui/card.svelte'
  import Paragraph from '../../ui/paragraph.svelte'
  import Section from '../section.svelte'

  let page = atom<number>(150)
</script>

<Story name="Base">
  <Section width={500}>
    <Card>
      <Paragraph>1 page, no pagination</Paragraph>
      <PaginationBar
        currentPage={1}
        label="50 posts"
        totalPages={1}
        on:click={() => {}}
      />
    </Card>
  </Section>

  <Section width={500}>
    <Card>
      <Paragraph>2 pages, current 1</Paragraph>
      <PaginationBar
        currentPage={1}
        label="50 posts"
        totalPages={2}
        on:click={() => {}}
      />
    </Card>
  </Section>
  <Section width={500}>
    <Card>
      <Paragraph>3 pages, current 1</Paragraph>
      <PaginationBar
        currentPage={1}
        label="50 posts"
        totalPages={3}
        on:click={() => {}}
      />
    </Card>
  </Section>
  <Section width={500}>
    <Card>
      <Paragraph>3 pages, current 2</Paragraph>
      <Paragraph>Pagination bar</Paragraph>
      <PaginationBar
        currentPage={2}
        label="50 posts"
        totalPages={3}
        on:click={() => {}}
      />
    </Card>
  </Section>
  <Section width={500}>
    <Card>
      <Paragraph>3 pages, current 2</Paragraph>
      <PaginationBar
        currentPage={2}
        label="50 posts"
        totalPages={3}
        on:click={() => {}}
      />
    </Card>
  </Section>
  <Section width={500}>
    <Card>
      <Paragraph>3 pages, current 3</Paragraph>
      <PaginationBar
        currentPage={3}
        label="50 posts"
        totalPages={3}
        on:click={() => {}}
      />
    </Card>
  </Section>
  <Section width={500}>
    <Card>
      <Paragraph>Interactive, 500 pages, current {$page}</Paragraph>
      <PaginationBar
        currentPage={$page}
        label="Lots of posts"
        totalPages={500}
        on:click={e => {
          page.set(e.detail)
        }}
      />
    </Card>
  </Section>
</Story>
