import { lintRule } from 'unified-lint-rule'
import { visit } from 'unist-util-visit'
import { parents } from 'unist-util-parents'

function findIndentDifference(codeNode, listNode) {
  const listIndent = listNode.children[0].children[0].position.start.column - 1
  const codeIndent = codeNode.position.start.column - 1

  return listIndent - codeIndent
}

function codeBlockSplitList(tree, file) {
  visit(parents(tree), 'code', node => {
    const parentCodeNode = node.parent
    const codeIndex = parentCodeNode.children.indexOf(node)
    const prevSibling = parentCodeNode.children[codeIndex - 1]

    if (prevSibling && prevSibling.type === 'list') {
      const spacesToAdd = findIndentDifference(node, prevSibling)
      const message = `Add ${spacesToAdd} spaces to the beginning of the code block to align with the list`
      file.message(message, node)
    }
  })
}

const remarkLintCodeBlockSplitList = lintRule(
  'remark-lint:code-block-split-list',
  codeBlockSplitList
)

export default remarkLintCodeBlockSplitList
