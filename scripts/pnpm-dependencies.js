const core = require('@actions/core')
const github = require('@actions/github')

async function run() {
  try {
    let message = core.getInput('message')
    let myToken = core.getInput('myToken')
    let octokit = github.getOctokit(myToken)
    let context = github.context
    let pullNumber = context.payload.pull_request.number

    let { data: comments } = await octokit.rest.issues.listComments({
      ...context.repo,
      issue_number: pullNumber
    })

    let isCommentExisting = !!comments.find(
      comment =>
        comment.user.login === 'github-actions[bot]' && comment.body === message
    )

    if (!isCommentExisting) {
      await octokit.rest.issues.createComment({
        ...context.repo,
        body: message,
        issue_number: pullNumber
      })
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()