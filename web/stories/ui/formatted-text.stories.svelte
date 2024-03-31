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
</Story>
