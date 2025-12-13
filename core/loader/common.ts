import type { DownloadTask, TextResponse } from '../lib/download.ts'
import type { PostsList } from '../posts-list.ts'

export type Loader = {
  /**
   * Find feeds URLs from HTML or HTTP headers.
   */
  getMineLinksFromText(response: TextResponse): string[]

  /**
   * Extracts the feed's posts.
   *
   * If the URL’s document was already downloaded during the feed’s search.
   *
   * Task is a way to combine multiple HTTP requests (for instance, during
   * the feed search/preview) to cancel all of them fast.
   */
  getPosts(task: DownloadTask, url: string, text?: TextResponse): PostsList

  /**
   * Try to suggest feed for given URL/document.
   *
   * For instance, by parsing <meta> or guessing URLs like `/rss` for RSS.
   */
  getSuggestedLinksFromText(response: TextResponse): string[]

  /**
   * Detects that document is a loader’s feed.
   *
   * Return feed’s title if true.
   */
  isMineText(response: TextResponse): false | string

  /**
   * It detects that URL is 100% for this loader.
   *
   * For instance, YouTube loader will return true for youtube.com links.
   *
   * It is not used right now because there is no way to detect RSS/Atom link
   * just by URL.
   */
  isMineUrl(url: URL): false | string | undefined
}
