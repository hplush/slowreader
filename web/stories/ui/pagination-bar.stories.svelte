<script context="module" lang="ts">
  import PaginationBar from '../../ui/pagination-bar.svelte'

  export const meta = {
    component: PaginationBar,
    title: 'UI/PaginationBar'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Card from '../../ui/card.svelte'
  import Paragraph from '../../ui/paragraph.svelte'
  import Section from '../section.svelte'

  let currentPage = 1
  let postsPerPage = 50
  let totalPosts = 628

  $: totalPages = Math.ceil(totalPosts / postsPerPage)
  $: postsFrom = (currentPage - 1) * postsPerPage + 1
  $: postsTo = Math.min(currentPage * postsPerPage, totalPosts)
</script>

<Story name="Base">
  <Section width={500}>
    <Card>
      <Paragraph>Pagination controls</Paragraph>
      <div class="text-group">
        <label for="currentPage">Current page:</label>
        <input
          id="currentPage"
          name="currentPage"
          max={totalPages}
          min="1"
          type="number"
          bind:value={currentPage}
        />
      </div>

      <div class="text-group">
        <label for="postsPerPage">Posts per page:</label>
        <input
          id="postsPerPage"
          name="totalPages"
          max={1000}
          min="1"
          type="number"
          bind:value={postsPerPage}
        />
      </div>

      <div class="text-group">
        <label for="totalPosts">Total posts:</label>
        <input
          id="totalPosts"
          name="totalPosts"
          max={10000}
          min="0"
          type="number"
          bind:value={totalPosts}
        />
      </div>

      <div class="text-group">
        <Paragraph>Total pages: {totalPages}</Paragraph>
        <Paragraph>Reading posts: {postsFrom} - {postsTo}</Paragraph>
      </div>
    </Card>
  </Section>
  <Section width={500}>
    <Card>
      <Paragraph>Pagination bar</Paragraph>
      <PaginationBar
        {currentPage}
        label={`${totalPosts} posts`}
        {totalPages}
        on:click={e => {
          currentPage = e.detail
        }}
      />
    </Card>
  </Section>
</Story>

<Story name="Dark" parameters={{ themes: { themeOverride: 'dark' } }}>
  <Section width={500}>
    <Card>
      <Paragraph>Pagination controls</Paragraph>
      <div class="text-group">
        <label for="currentPage">Current page:</label>
        <input
          id="currentPage"
          name="currentPage"
          max={totalPages}
          min="1"
          type="number"
          bind:value={currentPage}
        />
      </div>

      <div class="text-group">
        <label for="postsPerPage">Posts per page:</label>
        <input
          id="postsPerPage"
          name="totalPages"
          max={1000}
          min="1"
          type="number"
          bind:value={postsPerPage}
        />
      </div>

      <div class="text-group">
        <label for="totalPosts">Total posts:</label>
        <input
          id="totalPosts"
          name="totalPosts"
          max={10000}
          min="0"
          type="number"
          bind:value={totalPosts}
        />
      </div>

      <div class="text-group">
        <Paragraph>Total pages: {totalPages}</Paragraph>
        <Paragraph>Reading posts: {postsFrom} - {postsTo}</Paragraph>
      </div>
    </Card>
  </Section>
  <Section width={500}>
    <Card>
      <Paragraph>Pagination bar</Paragraph>
      <PaginationBar
        {currentPage}
        label={`${totalPosts} posts`}
        {totalPages}
        on:click={e => {
          currentPage = e.detail
        }}
      />
    </Card>
  </Section>
</Story>

<style>
  .text-group {
    padding-top: var(--padding-m);
    padding-bottom: var(--padding-m);
  }
</style>
