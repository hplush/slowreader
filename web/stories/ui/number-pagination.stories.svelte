<script lang="ts" module>
  import {
    createPagination,
    moveToPage,
    type PaginationValue
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import NumberPagination from '../../ui/number-pagination.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: NumberPagination,
    title: 'UI/NumberPagination'
  })
</script>

<script lang="ts">
  function pages(count: number, page = 0): PaginationValue {
    let pagination = createPagination(count)
    moveToPage(pagination, page)
    return pagination.get()
  }
</script>

<Story name="Base" asChild>
  <Section width={400}>
    <NumberPagination pages={pages(8, 0)} />
  </Section>
  <Section width={400}>
    <NumberPagination pages={pages(8, 7)} />
  </Section>
  <Section width={400}>
    <NumberPagination pages={pages(12, 5)} />
  </Section>
  <Section width={400}>
    <NumberPagination pages={pages(2)} />
  </Section>
  <Section width={400}>
    <NumberPagination pages={pages(15)} />
  </Section>
  <Section width={400}>
    <NumberPagination pages={pages(50, 25)} />
  </Section>
  <Section width={400}>
    <NumberPagination pages={pages(1000, 500)} />
  </Section>
</Story>
