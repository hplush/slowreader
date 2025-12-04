<script lang="ts" module>
  import type { PaginationValue } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Pagination from '../../ui/pagination.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Pagination,
    title: 'UI/Pagination'
  })
</script>

<script lang="ts">
  function pages(count: number, page = 0): PaginationValue {
    return {
      count,
      hasNext: page < count - 1,
      page,
      pages: Array.from({ length: count }, (_, i) => i),
      show: true
    }
  }
</script>

<Story name="Base" asChild>
  <Section width={400}>
    <Pagination pages={pages(8, 0)} />
  </Section>
  <Section width={400}>
    <Pagination pages={pages(8, 7)} />
  </Section>
  <Section width={400}>
    <Pagination pages={pages(12, 5)} />
  </Section>
  <Section width={400}>
    <Pagination pages={pages(2)} />
  </Section>
  <Section width={400}>
    <Pagination pages={pages(15)} />
  </Section>
  <Section width={400}>
    <Pagination pages={pages(50, 25)} />
  </Section>
</Story>
