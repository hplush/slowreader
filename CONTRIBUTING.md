# Contributing

We are very welcome for new developers.

We will try to give you **good feedback** in pull requests with explanations and guidance to learn something new.

Also, feel free to ask any questions about career and development. If you are helping us, we will try to **mentor you**.

- [Language](#language)
- [Where to Ask Questions](#where-to-ask-questions)
- [How to Start](#how-to-start)
  - [Install Environment](#install-environment)
  - [Run Web Client](#run-web-client)
- [Learn the Project](#learn-the-project)
  - [Text Editor Settings](#text-editor-settings)
  - [Learn App Architecture](#learn-app-architecture)
  - [Check Our Checklist](#check-our-checklist)
- [How to Find Next Task](#how-to-find-next-task)
- [Guidelines](#guidelines)
  - [Commits](#commits)
  - [Branches](#branches)
  - [Pull Requests](#pull-requests)

## Language

- In the project, we are using **English**.
- Most contributors are _not native speaker_. Don’t be afraid of your language if you are not a native English speaker too.
- Feel free to use _automatic translators_. Use [DeepL to write issues](https://www.deepl.com/) and the browser’s translation to read docs.

## Where to Ask Questions

- Don’t know anything and need assistance?
- Have some unknown issue running the project server for development?
- Don’t know how to contribute?

You can ask any question to the maintainer in Telegram: **[`@sitnik`](https://t.me/sitnik)**. You can ask in _English_, _Russian_, or _Spanish_.

> Our mentoring is a basic payback for your time and contribution to the project. Even a simple question can improve the guide for other beginners.

## How to Start

### Install Environment

1. Install environment:

   - For lond-term contribution, we recommend installing Docker and [Dev Container](https://containers.dev) plugin to your text editor. All developers will have the same environment and the development tool will be isolated from the system in the container.

     - [VS Code guide](https://code.visualstudio.com/docs/devcontainers/tutorial)
     - [Jet Brains IDEs](https://www.jetbrains.com/help/idea/connect-to-devcontainer.html#create_dev_container_inside_ide)
     - [CLI tool](https://github.com/devcontainers/cli)

   - You can also manually install [Node.js](https://nodejs.org/en/download/package-manager) and [pnpm](https://pnpm.io/installation) versions according to `.node-version` file and `packageManager` key in `package.json`.

2. Then install all npm dependencies by `pnpm`:

   ```sh
   pnpm install
   pnpm prepare
   ```

3. Run tests to be sure that everything is OK (open issue if tests don’t work in your environment):

   ```sh
   pnpm test
   ```

### Run Web Client

To run web clients, just call in the root of the project:

```sh
pnpm start
```

It will run a web server and proxy (the website, by default, can make HTTP requests only to its own servers; we need a proxy to send requests to RSS feeds on other servers).

To fill your web clients with real posts:

1. Start web client.
2. Open [`localhost:5173/feeds/add`](http://localhost:5173/feeds/add).
3. Add feeds from [`loader-tests/feeds.yml`](./loader-tests/feeds.yml).
4. Open browser DevTools.
5. Run `fillFeedsWithPosts()`.

To run the visual testing tool (Storybook), run it from the `web/` folder:

```sh
cd web/
pnpm visual
```

It will show all UI components and all possible states of pages. It is the best tool to test browser compatibility or change CSS.

## Learn the Project

### Text Editor Settings

To work with the project, we recommend adding to your IDE or text editor:

- [EditorConfig](https://editorconfig.org/) plugin to sync text editor settings. VS Code automatically takes these settings from the `.vscode/` folder.
- Svelte syntax support for Web Client. Like [`svelte.svelte-vscode`](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) for VS Code.

You may also install Prettier and ESLint plugins or just use [`precommit` hook](./nano-staged.json).

If you write docs, we recommend installing [LanguageTool](https://dev.languagetool.org/software-that-supports-languagetool-as-a-plug-in-or-add-on.html) for grammar check. For VS Code, [`davidlday.languagetool-linter`](https://marketplace.visualstudio.com/items?itemName=davidlday.languagetool-linter).

### Learn App Architecture

Before any significant changes, read all **[`README.md`](README.md)** to understand app architecture.

### Check Our Checklist

Read our **[checklist for pull requests](./docs/pull_request_template.md)**. It contains things you should think about and can speed up code review a lot.

> If you see that people made the same mistake several times, suggest adding a new item to the checklist to prevent repeating these mistakes.

## How to Find Next Task

If you are not just fixing a bug but want to join the core team, here is the path:

1. Your first task is to test `pnpm test` in your environment and report issue.
2. Go to our [Tasks plan](https://github.com/orgs/hplush/projects/1) and take next task from `Onboarding` column. If `Onboarding` is empty, you can look in `Ready to Take`.
   1. Choose any task that fits the best to you. Labels can help you focus on your category.
   2. Write there `I want to take it`.
   3. The task will be reserved for you for a week.
   4. Don’t worry if a week is not enough. Just make a [draft PR](https://github.blog/news-insights/product-news/introducing-draft-pull-requests/).
3. After the onboarding, you can take tasks from the `Ready to Take` column. See the discussions in issues to pick next one.

Feel free to ask [maintainer](https://t.me/sitnik) about your next task.

> We will mentor you in return for your participation, so don’t be afraid to ask questions.

## Guidelines

### Commits

We care about good commit messages. Try to think about them and describe more:

```diff
- git commit -m 'Fix issue'
+ git commit -m 'Fix <Loader> style in Safari'
```

In commit’s messages example **why** you did changes, **not what** you changed:

```diff
- git commit -m 'Add .editorconfig'
+ git commit -m 'Add .editorconfig to sync text editor settings'
```

We recommend signing [your commits](./docs/onboarding.md#enable-signing-git-commits).

### Branches

There is no any specific rules about git branch names.

### Pull Requests

Run `pnpm test` before creating pull request.

Use [`Draft`](https://github.blog/news-insights/product-news/introducing-draft-pull-requests/) pull request when it is not ready to review. When it will be ready press `Ready for review` button.

After fixing issue mentioned in PR conversation, press `Resolve conversation` button.
