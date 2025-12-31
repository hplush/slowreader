<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import FormattedText from '../../ui/formatted-text.svelte'
  import imgExample2 from '../assets/long_width_example.avif'
  import imgExample1 from '../assets/short_width_example.avif'
  import Scene from '../scene.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: FormattedText,
    title: 'UI/FormattedText'
  })

  let paragraph = `<p>Reading is generally an individual activity, done silently, although on occasion a person reads out loud for other listeners; or reads aloud for one's own use, for better comprehension. Before the reintroduction of separated text (spaces between words) in the late Middle Ages, the ability to read silently was considered rather remarkable.</p>`

  let longHeadingText =
    'This is a very long heading text that goes on and on. It is meant to test the rendering of long headings in the UI. It includes many words and phrases to ensure that the heading wraps correctly and maintains its styling.'

  let longHeadings = `<h1>${longHeadingText}</h1><h2><a href="#">${longHeadingText}</a></h2><h3>${longHeadingText}</h3><h5>${longHeadingText}</h5><h6>${longHeadingText}</h6>`

  let headingsWithParagraphs = `<h1>Heading H1</h1>${paragraph}${paragraph}<h2>Heading H2</h2><p>${paragraph}${paragraph}${paragraph}</p><h3>Heading H3</h3><p>${paragraph}</p><h4>Heading H4</h4><p>${paragraph}</p><h5>Heading H5</h5><p>${paragraph}</p><h6>Heading H6</h6><p>${paragraph}</p>`

  let images =
    `<img src="${imgExample1}" alt="" loading="lazy">` +
    `<img src="${imgExample2}" alt="">`

  let inlineTagsExample =
    '  <p><b>Bold</b> Text Example</p>\n' +
    '  <p><i>Introduction</i></p>\n' +
    '  <p><strong>Fish</strong> are a group of <em>aquatic</em> animals that first appeared during the <mark>Devonian</mark> period.</p>\n' +
    '  <p><bdi>Types of Fish</bdi></p>\n' +
    '  <p><bdo>Characteristics of Fish</bdo></p>\n' +
    '  <p>Fish are characterized by their <strong>gills</strong>, <em>fins</em>, and <mark>scales</mark>.</p>\n' +
    '  <p><cite>Interesting Facts</cite></p>\n' +
    '  <p>Did you know that the <data value="whale-shark">whale shark</data> is the largest fish in the world?</p>\n' +
    '  <p><del>Conclusion</del></p>\n' +
    '  <p><ins>Fish are fascinating creatures!</ins> They come in all shapes and sizes, from the tiny <small>paedocypris</small> to the massive <samp>whale shark</samp>.</p>\n' +
    '  <p><sub>Subscript text</sub> and <sup>superscript text</sup> can also be used for scientific notation.</p>\n' +
    '  <p>For more information, visit our <a href="https://example.com">website</a>.</p>\n'

  // get document.referrer if our story inside iframe
  const currHref =
    window.location !== window.parent.location
      ? document.referrer
      : document.location.href

  let unorderedList =
    '<ul>\n' +
    '  <li>Simple list item</li>\n' +
    `  <li><a href="https://example${Math.round(Math.random() * 1000)}.com">Item with not visited link</a></li>\n` +
    `  <li><a href="${currHref}">Item with visited link</a></li>\n` +
    '  <li><strong>Strong list item</strong></li>\n' +
    '  <li>Item <i>with itallic formatt</i></li>\n' +
    '</ul>'

  let orderedList = unorderedList.replaceAll('ul', 'ol')

  let contentTags =
    '  <figure>\n' +
    `    <img src="${imgExample1}" alt="Example image">\n` +
    '    <figcaption>This is a figcaption for the image</figcaption>\n' +
    '  </figure>\n' +
    ' <blockquote>Citation from a famous person</blockquote>\n' +
    '  <p><abbr title="Hypertext Markup Language">HTML</abbr> is the standard markup language for documents designed to be displayed in a web browser.</p>\n' +
    '  <address>\n' +
    '    Written by John Doe.<br>\n' +
    '    Visit us at:<br>\n' +
    '    Example.com<br>\n' +
    '    Box 564, Disneyland<br>\n' +
    '    USA\n' +
    '  </address>\n' +
    '  <dl>\n' +
    '    <dt>Coffee</dt>\n' +
    '    <dd>Black hot drink</dd>\n' +
    '    <dt>Milk</dt>\n' +
    '    <dd>White cold drink</dd>\n' +
    '  </dl>\n' +
    '  <details>\n' +
    '    <summary>Epcot Center</summary>\n' +
    '    <p>Epcot is a theme park at Walt Disney World Resort featuring exciting attractions, international pavilions, award-winning fireworks and seasonal special events.</p>\n' +
    '  </details>\n' +
    '  <dfn title="Hypertext Markup Language">HTML</dfn>\n' +
    '  <kbd>Ctrl+C</kbd>\n' +
    '  <ruby>\n' +
    '    漢 <rt>ㄏㄢˋ</rt>\n' +
    '  </ruby>'

  let mediaTags =
    '<video controls>\n' +
    '    <source src="movie.mp4" type="video/mp4">\n' +
    '    <source src="movie.ogg" type="video/ogg">\n' +
    '    Your browser does not support the video tag.\n' +
    '  </video>\n' +
    '\n' +
    '  <audio controls>\n' +
    '    <source src="horse.ogg" type="audio/ogg">\n' +
    '    <source src="horse.mp3" type="audio/mpeg">\n' +
    '    Your browser does not support the audio element.\n' +
    '  </audio>\n'

  let code =
    ' <pre><code>function helloWorld() {\n' +
    '  console.log("Hello, world!");\n' +
    '}</code></pre>'

  let codeInline =
    '<p>This is a paragraph of text. Here is an example of inline code: <code>console.log("Hello, world!");</code></p>'

  let tableExample =
    '<table><thead>' +
    '<tr><th>Header 1</th><th>Header 2</th><th>Header 3</th><th>Header 4</th></tr></thead>' +
    '<tbody><tr>' +
    '<td>Data 1</td><td>Data 2</td><td>Data 3</td><td>Data 4</td></tr><tr>' +
    '<td>Data 1</td><td>Data 2</td><td>Data 3</td><td>Data 4</td></tr>' +
    '</tbody><tfoot><tr><td colspan="7">Footer information</td></tr></tfoot>' +
    '</table>'

  let url = 'https://example.com'
</script>

<Story name="Light Slow" asChild>
  <Section width={700}>
    <FormattedText comfort html={headingsWithParagraphs} {url} />
  </Section>
  <Section width={700}>
    <FormattedText comfort html={longHeadings} {url} />
  </Section>
  <Section width={500}>
    <FormattedText comfort html={images} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={inlineTagsExample} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={unorderedList} {url} />
    <FormattedText comfort html={orderedList} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={contentTags} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={mediaTags} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={code} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={codeInline} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={tableExample} {url} />
  </Section>
</Story>

<Story name="Light Fast" asChild>
  <Scene route="notFound">
    <Section width={700}>
      <FormattedText html={headingsWithParagraphs} {url} />
    </Section>
    <Section width={700}>
      <FormattedText html={longHeadings} {url} />
    </Section>
    <Section width={500}>
      <FormattedText html={images} {url} />
    </Section>
    <Section>
      <FormattedText html={inlineTagsExample} {url} />
    </Section>
    <Section>
      <FormattedText html={unorderedList} {url} />
      <FormattedText html={orderedList} {url} />
    </Section>
    <Section>
      <FormattedText html={contentTags} {url} />
    </Section>
    <Section>
      <FormattedText html={mediaTags} {url} />
    </Section>
    <Section>
      <FormattedText html={code} {url} />
    </Section>
    <Section>
      <FormattedText html={codeInline} {url} />
    </Section>
    <Section>
      <FormattedText html={tableExample} {url} />
    </Section>
  </Scene>
</Story>

<Story
  name="Dark Slow"
  asChild
  parameters={{ themes: { themeOverride: 'dark' } }}
>
  <Section width={700}>
    <FormattedText comfort html={headingsWithParagraphs} {url} />
  </Section>
  <Section width={700}>
    <FormattedText comfort html={longHeadings} {url} />
  </Section>
  <Section width={500}>
    <FormattedText comfort html="{images}comfort" {url} />
  </Section>
  <Section>
    <FormattedText comfort html={inlineTagsExample} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={unorderedList} {url} />
    <FormattedText comfort html={orderedList} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={contentTags} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={mediaTags} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={code} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={codeInline} {url} />
  </Section>
  <Section>
    <FormattedText comfort html={tableExample} {url} />
  </Section>
</Story>

<Story
  name="Dark Fast"
  asChild
  parameters={{ themes: { themeOverride: 'dark' } }}
>
  <Scene route="notFound">
    <Section width={700}>
      <FormattedText html={headingsWithParagraphs} {url} />
    </Section>
    <Section width={700}>
      <FormattedText html={longHeadings} {url} />
    </Section>
    <Section width={500}>
      <FormattedText html="{images}comfort" {url} />
    </Section>
    <Section>
      <FormattedText html={inlineTagsExample} {url} />
    </Section>
    <Section>
      <FormattedText html={unorderedList} {url} />
      <FormattedText html={orderedList} {url} />
    </Section>
    <Section>
      <FormattedText html={contentTags} {url} />
    </Section>
    <Section>
      <FormattedText html={mediaTags} {url} />
    </Section>
    <Section>
      <FormattedText html={code} {url} />
    </Section>
    <Section>
      <FormattedText html={codeInline} {url} />
    </Section>
    <Section>
      <FormattedText html={tableExample} {url} />
    </Section>
  </Scene>
</Story>
