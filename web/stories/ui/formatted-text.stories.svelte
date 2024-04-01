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

  let headers =
    '<h1>H1 Heading</h1><h2>H2 Heading</h2><h3>H3 Heading</h3><h4>H4 Heading</h4><h5>H5 Heading</h5><h6>H6 Heading</h6>'

  let paragraph =
    '<p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Aut culpa cumque, dolorum nobis quidem repellendus sunt! Amet assumenda aut deserunt, nest facilis nihil officiis pariatur quia quisquam sapiente tempora vitae.</p>'

  let headersWithParagraphs = `<div><h1>Heading</h1>${paragraph}<h2>Heading 2</h2><p>${paragraph}</p><h3>Heading 3</h3><p>${paragraph}</p><h4>Heading 4</h4><p>${paragraph}</p><h5>Heading 4</h5><p>${paragraph}</p><h6>Heading 4</h6><p>${paragraph}</p></div>`

  let layouts =
    '<div></div><div>Lorem ipsum dolor sit amet, consectetur adipisicing elit. A commodi eos recusandae. ' +
    'Asperiores <span>debitis</span> dolore fugiat laboriosam neque ' +
    'nostrum obcaecati odit tempora. A explicabo impedit perferendis quis sequi ' +
    'voluptate. Quidem?</div><span>span text</span></div><div>Lorem ipsum dolor sit amet, consectetur adipisicing elit. ' +
    'Accusamus aliquid, amet aperiam assumenda ' +
    'aut dicta, dolor earum explicabo ' +
    'ipsa iste itaque laboriosam laudantium maxime qui quia quod, sed sint velit.</div>'
  let images =
    '<img src="https://media.dev.to/cdn-cgi/image/width=800%2Cheight=%2Cfit=scale-down%2Cgravity=auto%2Cformat=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fcl51qc17mia9ep2ujcdh.gif" alt="A scene from ..." loading="lazy" width="480" height="274" ><img src="https://media.dev.to/cdn-cgi/image/width=1000,height=420,fit=cover,gravity=auto,format=auto/https%3A%2F%2Fdev-to-uploads.s3.amazonaws.com%2Fuploads%2Farticles%2Fwjyxxca8qxz6j0vc7av9.jpg" style="aspect-ratio: auto 1000 / 420;" width="1000" height="420"  alt="Cover">'

  let inlineTagsExample =
    '<div>\n' +
    '  <p><b>Bold</b> Text Example</p>\n' +
    '  <p><i>Introduction</i></p>\n' +
    '  <p><strong>Fish</strong> are a group of <em>aquatic</em> animals that first appeared during the <mark>Devonian</mark> period.</p>\n' +
    '  <p><bdi>Types of Fish</bdi></p>\n' +
    '  <p>There are three main types of fish: <b>bony fish</b>, <i>cartilaginous fish</i>, and <mark>jawless fish</mark>.</p>\n' +
    '  <p><bdo>Characteristics of Fish</bdo></p>\n' +
    '  <p>Fish are characterized by their <strong>gills</strong>, <em>fins</em>, and <mark>scales</mark>.</p>\n' +
    '  <p><cite>Interesting Facts</cite></p>\n' +
    '  <p><a href="">Some visited link</a></p>\n' +
    '  <p>Did you know that the <data value="whale-shark">whale shark</data> is the largest fish in the world?</p>\n' +
    '  <p><del>Conclusion</del></p>\n' +
    '  <p><ins>Fish are fascinating creatures!</ins> They come in all shapes and sizes, from the tiny <small>paedocypris</small> to the massive <samp>whale shark</samp>.</p>\n' +
    '  <p><sub>Subscript text</sub> and <sup>superscript text</sup> can also be used for scientific notation.</p>\n' +
    '  <p>For more information, visit our <a href="https://example.com">website</a>.</p>\n' +
    '</div>'

  let lists =
    '<div>\n  <h3>Unordered List</h3>\n  <ul>\n    <li>Fish</li>\n    <li>Crab</li>\n    <li>Shrimp</li>\n  </ul>\n\n  <h3>Ordered List</h3>\n  <ol>\n    <li>Seahorse</li>\n    <li>Octopus</li>\n    <li>Jellyfish</li>\n  </ol>\n</div>'

  let contentTags =
    ' <blockquote>Citation from a famous person</blockquote>\n' +
    '  <table>\n' +
    '    <caption>This is a caption for the table</caption>\n' +
    '    <tr>\n' +
    '      <td>Data 1</td>\n' +
    '      <td>Data 2</td>\n' +
    '    </tr>\n' +
    '  </table>\n' +
    '  <figure>\n' +
    '    <img src="image.jpg" alt="Example image">\n' +
    '    <figcaption>This is a figcaption for the image</figcaption>\n' +
    '  </figure>\n' +
    '  <p><abbr title="Hypertext Markup Language">HTML</abbr> is the standard markup language for documents designed to be displayed in a web browser.</p>\n' +
    '  <address>\n' +
    '    Written by John Doe.<br>\n' +
    '    Visit us at:<br>\n' +
    '    Example.com<br>\n' +
    '    Box 564, Disneyland<br>\n' +
    '    USA\n' +
    '  </address>\n' +
    '  <datalist id="browsers">\n' +
    '    <option value="Internet Explorer">\n' +
    '    <option value="Firefox">\n' +
    '    <option value="Chrome">\n' +
    '    <option value="Opera">\n' +
    '    <option value="Safari">\n' +
    '  </datalist>\n' +
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
    '<div>\n' +
    '  <video controls>\n' +
    '    <source src="movie.mp4" type="video/mp4">\n' +
    '    <source src="movie.ogg" type="video/ogg">\n' +
    '    Your browser does not support the video tag.\n' +
    '  </video>\n' +
    '\n' +
    '  <audio controls>\n' +
    '    <source src="horse.ogg" type="audio/ogg">\n' +
    '    <source src="horse.mp3" type="audio/mpeg">\n' +
    '    Your browser does not support the audio element.\n' +
    '  </audio>\n' +
    '</div>'

  let code =
    ' <pre><code>\n' +
    '    function helloWorld() {\n' +
    '      console.log("Hello, world!");\n' +
    '    }\n' +
    '  </code></pre>'

  let codeInline =
    '<p>This is a paragraph of text. Here is an example of inline code: <code>console.log("Hello, world!");</code></p>'

  let table =
    '<table>\n' +
    '    <thead>\n' +
    '      <tr>\n' +
    '        <th>Name</th>\n' +
    '        <th>Email</th>\n' +
    '      </tr>\n' +
    '    </thead>\n' +
    '    <tbody>\n' +
    '      <tr>\n' +
    '        <td>John Doe</td>\n' +
    '        <td>john.doe@example.com</td>\n' +
    '      </tr>\n' +
    '      <tr>\n' +
    '        <td>Jane Doe</td>\n' +
    '        <td>jane.doe@example.com</td>\n' +
    '      </tr>\n' +
    '    </tbody>\n' +
    '  </table>'

  let tableXl =
    '<table>\n' +
    '  <thead>\n' +
    '    <tr>\n' +
    '      <th>Header 1</th>\n' +
    '      <th>Header 2</th>\n' +
    '      <th>Header 3</th>\n' +
    '      <th>Header 4</th>\n' +
    '      <th>Header 5</th>\n' +
    '      <th>Header 6</th>\n' +
    '      <th>Header 7</th>\n' +
    '    </tr>\n' +
    '  </thead>\n' +
    '  <tbody>\n' +
    '    <tr>\n' +
    '      <td>Data 1</td>\n' +
    '      <td>Data 2</td>\n' +
    '      <td>Data 3</td>\n' +
    '      <td>Data 4</td>\n' +
    '      <td>Data 5</td>\n' +
    '      <td>Data 6</td>\n' +
    '      <td>Data 7</td>\n' +
    '    </tr>\n' +
    '    <!-- Repeat the above row 6 more times -->\n' +
    '    <tr>\n' +
    '      <td>Data 1</td>\n' +
    '      <td>Data 2</td>\n' +
    '      <td>Data 3</td>\n' +
    '      <td>Data 4</td>\n' +
    '      <td>Data 5</td>\n' +
    '      <td>Data 6</td>\n' +
    '      <td>Data 7</td>\n' +
    '    </tr>\n' +
    '    <tr>\n' +
    '      <td>Data 1</td>\n' +
    '      <td>Data 2</td>\n' +
    '      <td>Data 3</td>\n' +
    '      <td>Data 4</td>\n' +
    '      <td>Data 5</td>\n' +
    '      <td>Data 6</td>\n' +
    '      <td>Data 7</td>\n' +
    '    </tr>\n' +
    '    <tr>\n' +
    '      <td>Data 1</td>\n' +
    '      <td>Data 2</td>\n' +
    '      <td>Data 3</td>\n' +
    '      <td>Data 4</td>\n' +
    '      <td>Data 5</td>\n' +
    '      <td>Data 6</td>\n' +
    '      <td>Data 7</td>\n' +
    '    </tr>\n' +
    '    <tr>\n' +
    '      <td>Data 1</td>\n' +
    '      <td>Data 2</td>\n' +
    '      <td>Data 3</td>\n' +
    '      <td>Data 4</td>\n' +
    '      <td>Data 5</td>\n' +
    '      <td>Data 6</td>\n' +
    '      <td>Data 7</td>\n' +
    '    </tr>\n' +
    '    <tr>\n' +
    '      <td>Data 1</td>\n' +
    '      <td>Data 2</td>\n' +
    '      <td>Data 3</td>\n' +
    '      <td>Data 4</td>\n' +
    '      <td>Data 5</td>\n' +
    '      <td>Data 6</td>\n' +
    '      <td>Data 7</td>\n' +
    '    </tr>\n' +
    '    <tr>\n' +
    '      <td>Data 1</td>\n' +
    '      <td>Data 2</td>\n' +
    '      <td>Data 3</td>\n' +
    '      <td>Data 4</td>\n' +
    '      <td>Data 5</td>\n' +
    '      <td>Data 6</td>\n' +
    '      <td>Data 7</td>\n' +
    '    </tr>\n' +
    '  </tbody>\n' +
    '  <tfoot>\n' +
    '    <tr>\n' +
    '      <td colspan="7">Footer information</td>\n' +
    '    </tr>\n' +
    '  </tfoot>\n' +
    '</table>'
  let getHtml = (content: string): string => `<html lang="en">${content}</html>`
</script>

<Story name="Base">
  <Section>
    <Card>
      <FormattedText html={`${getHtml(headers)}`} />
      <FormattedText html={`${getHtml(headersWithParagraphs)}`} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={`${getHtml(layouts)}`} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={`${getHtml(images)}`} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={`${getHtml(inlineTagsExample)}`} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={`${getHtml(lists)}`} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={`${getHtml(contentTags)}`} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={`${getHtml(mediaTags)}`} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={`${getHtml(code)}`} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={`${getHtml(codeInline)}`} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={`${getHtml(table)}`} />
    </Card>
  </Section>
  <Section>
    <Card>
      <FormattedText html={`${getHtml(tableXl)}`} />
    </Card>
  </Section>
</Story>
