<script context="module" lang="ts">
  import FormattedText from '../../ui/formatted-text.svelte'

  export const meta = {
    component: FormattedText,
    title: 'UI/FormattedText'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Card from '../../ui/card.svelte'
  //import Scene from '../scene.svelte'
  import Section from '../section.svelte'

  let fishText =
    'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aut culpa cumque, dolorum nobis quidem repellendus sunt! Amet assumenda aut deserunt, nest facilis nihil officiis pariatur quia quisquam sapiente tempora vitae.'

  let paragraph = `<p>${fishText}</p>`

  let longHeadingText =
    'This is a very long heading text that goes on and on. It is meant to test the rendering of long headings in the UI. It includes many words and phrases to ensure that the heading wraps correctly and maintains its styling.'

  let longHeadings = `<h1>${longHeadingText}</h1><h2><a href="#">${longHeadingText}</a></h2><h3>${longHeadingText}</h3><h5>${longHeadingText}</h5><h6>${longHeadingText}</h6>`

  let headingsWithParagraphs = `<h1>Heading H1</h1>${paragraph}${paragraph}<h2>Heading H2</h2><p>${paragraph}${paragraph}${paragraph}</p><h3>Heading H3</h3><p>${paragraph}</p><h4>Heading H4</h4><p>${paragraph}</p><h5>Heading H5</h5><p>${paragraph}</p><h6>Heading H6</h6><p>${paragraph}</p>`

  let images =
    '<img src="https://media.dev.to/cdn-cgi/image/width=800%2Cheight=%2Cfit=scale-down%2Cgravity=auto%2Cformat=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fcl51qc17mia9ep2ujcdh.gif" alt="A scene from ..." loading="lazy" width="480" height="274" ><img src="https://media.dev.to/cdn-cgi/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fwjyxxca8qxz6j0vc7av9.jpg" style="aspect-ratio: auto 1000 / 420;" width="1000" height="420"  alt="Cover">'

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

  let unorderedList =
    '<ul>\n' +
    '  <li>Simple list item</li>\n' +
    '  <li><a href="https://example.com">Item with link</a></li>\n' +
    '  <li><strong>Strong list item</strong></li>\n' +
    '  <li>Item <i>with itallic formatt</i></li>\n' +
    '</ul>'

  let orderedList = unorderedList.replaceAll('ul', 'ol')

  let contentTags =
    '  <figure>\n' +
    '    <img src="https://media.dev.to/cdn-cgi/image/width=400,height=220,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2F7u4wo1pru5qle7jj67of.png" alt="Example image">\n' +
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
    ' <pre><code>\n' +
    '    function helloWorld() {\n' +
    '      console.log("Hello, world!");\n' +
    '    }\n' +
    '  </code></pre>'

  let codeInline =
    '<p>This is a paragraph of text. Here is an example of inline code: <code>console.log("Hello, world!");</code></p>'

  let tableXlData = {
    tData: [
      ['Data 1', 'Data 2', 'Data 3', 'Data 4', 'Data 5', 'Data 6', 'Data 7'],
      ['Data 1', 'Data 2', 'Data 3', 'Data 4', 'Data 5', 'Data 6', 'Data 7'],
      ['Data 1', 'Data 2', 'Data 3', 'Data 4', 'Data 5', 'Data 6', 'Data 7'],
      ['Data 1', 'Data 2', 'Data 3', 'Data 4', 'Data 5', 'Data 6', 'Data 7'],
      ['Data 1', 'Data 2', 'Data 3', 'Data 4', 'Data 5', 'Data 6', 'Data 7']
    ],
    tHeaders: [
      'Header 1',
      'Header 2',
      'Header 3',
      'Header 4',
      'Header 5',
      'Header 6',
      'Header 7'
    ]
  }
  function createTable(h: string[], d: string[][]): string {
    let tableRes = []

    let thead = h.map(header => `<th>${header}</th>`).join('')
    tableRes.push(`<thead><tr>${thead}</tr></thead>`)

    let tbody = d
      .map(rowData => {
        let row = rowData.map(cellData => `<td>${cellData}</td>`).join('')
        return `<tr>${row}</tr>`
      })
      .join('')
    tableRes.push(`<tbody>${tbody}</tbody>`)

    let tfoot = `<tfoot><tr><td colspan="${h.length}">Footer information</td></tr></tfoot>`
    tableRes.push(tfoot)

    return `<table>${tableRes.join('')}</table>`
  }
  let tableXl = createTable(tableXlData.tHeaders, tableXlData.tData)
</script>

<Story name="Base">
  <Section width={700}>
    <Card>
      <FormattedText html={headingsWithParagraphs} />
    </Card>
  </Section>
  <Section width={700}>
    <Card>
      <FormattedText html={longHeadings} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={images} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={inlineTagsExample} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={unorderedList} />
      <FormattedText html={orderedList} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={contentTags} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={mediaTags} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={code} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={codeInline} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={tableXl} />
    </Card>
  </Section>
</Story>
