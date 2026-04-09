<!-- omit in toc -->
# Contributing to TeraSky's OSS Backstage Plugins

First off, thanks for taking the time to contribute! ❤️

All types of contributions are encouraged and valued. See the [Table of Contents](#table-of-contents) for different ways to help and details about how this project handles them. Please make sure to read the relevant section before making your contribution. It will make it a lot easier for us maintainers and smooth out the experience for all involved. The community looks forward to your contributions. 🎉

> And if you like the project, but just don't have time to contribute, that's fine. There are other easy ways to support the project and show your appreciation, which we would also be very happy about:
> - Star the project
> - Tweet about it
> - Refer this project in your project's readme
> - Mention the project at local meetups and tell your friends/colleagues

<!-- omit in toc -->
## Table of Contents

- [I Have a Question](#i-have-a-question)
- [I Want To Contribute](#i-want-to-contribute)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)
- [Your First Code Contribution](#your-first-code-contribution)
- [Improving The Documentation](#improving-the-documentation)
- [Styleguides](#styleguides)
- [Commit Messages](#commit-messages)



## I Have a Question

> If you want to ask a question, we assume that you have read the available [Documentation](https://terasky-oss.github.io/backstage-plugins/).

Before you ask a question, it is best to search for existing [Issues](https://github.com/TeraSky-OSS/backstage-plugins/issues) that might help you. In case you have found a suitable issue and still need clarification, you can write your question in this issue. It is also advisable to search the internet for answers first.

If you then still feel the need to ask a question and need clarification, we recommend the following:

- Open an [Issue](https://github.com/TeraSky-OSS/backstage-plugins/issues/new).
- Provide as much context as you can about what you're running into.
- Provide project and platform versions (nodejs, npm, etc), depending on what seems relevant.

We will then take care of the issue as soon as possible.

<!--
You might want to create a separate issue tag for questions and include it in this description. People should then tag their issues accordingly.

Depending on how large the project is, you may want to outsource the questioning, e.g. to Stack Overflow or Gitter. You may add additional contact and information possibilities:
- IRC
- Slack
- Gitter
- Stack Overflow tag
- Blog
- FAQ
- Roadmap
- E-Mail List
- Forum
-->

## I Want To Contribute

> ### Legal Notice <!-- omit in toc -->
> When contributing to this project, you must agree that you have authored 100% of the content, that you have the necessary rights to the content and that the content you contribute may be provided under the project licence.

### Reporting Bugs

<!-- omit in toc -->
#### Before Submitting a Bug Report

A good bug report shouldn't leave others needing to chase you up for more information. Therefore, we ask you to investigate carefully, collect information and describe the issue in detail in your report. Please complete the following steps in advance to help us fix any potential bug as fast as possible.

- Make sure that you are using the latest version.
- Determine if your bug is really a bug and not an error on your side e.g. using incompatible environment components/versions (Make sure that you have read the [documentation](https://terasky-oss.github.io/backstage-plugins/). If you are looking for support, you might want to check [this section](#i-have-a-question)).
- To see if other users have experienced (and potentially already solved) the same issue you are having, check if there is not already a bug report existing for your bug or error in the [bug tracker](https://github.com/TeraSky-OSS/backstage-plugins/issues?q=label%3Abug).
- Also make sure to search the internet (including Stack Overflow) to see if users outside of the GitHub community have discussed the issue.
- Collect information about the bug:
- Stack trace (Traceback)
- OS, Platform and Version (Windows, Linux, macOS, x86, ARM)
- Version of the interpreter, compiler, SDK, runtime environment, package manager, depending on what seems relevant.
- Possibly your input and the output
- Can you reliably reproduce the issue? And can you also reproduce it with older versions?

<!-- omit in toc -->
#### How Do I Submit a Good Bug Report?

> You must never report security related issues, vulnerabilities or bugs including sensitive information to the issue tracker, or elsewhere in public. Instead sensitive bugs must be sent by email to <>.
<!-- You may add a PGP key to allow the messages to be sent encrypted as well. -->

We use GitHub issues to track bugs and errors. If you run into an issue with the project:

- Open an [Issue](https://github.com/TeraSky-OSS/backstage-plugins/issues/new). (Since we can't be sure at this point whether it is a bug or not, we ask you not to talk about a bug yet and not to label the issue.)
- Explain the behavior you would expect and the actual behavior.
- Please provide as much context as possible and describe the *reproduction steps* that someone else can follow to recreate the issue on their own. This usually includes your code. For good bug reports you should isolate the problem and create a reduced test case.
- Provide the information you collected in the previous section.

Once it's filed:

- The project team will label the issue accordingly.
- A team member will try to reproduce the issue with your provided steps. If there are no reproduction steps or no obvious way to reproduce the issue, the team will ask you for those steps and mark the issue as `needs-repro`. Bugs with the `needs-repro` tag will not be addressed until they are reproduced.
- If the team is able to reproduce the issue, it will be marked `needs-fix`, as well as possibly other tags (such as `critical`), and the issue will be left to be [implemented by someone](#your-first-code-contribution).

<!-- You might want to create an issue template for bugs and errors that can be used as a guide and that defines the structure of the information to be included. If you do so, reference it here in the description. -->


### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for TeraSky's OSS Backstage Plugins, **including completely new features and minor improvements to existing functionality**. Following these guidelines will help maintainers and the community to understand your suggestion and find related suggestions.

<!-- omit in toc -->
#### Before Submitting an Enhancement

- Make sure that you are using the latest version.
- Read the [documentation](https://terasky-oss.github.io/backstage-plugins/) carefully and find out if the functionality is already covered, maybe by an individual configuration.
- Perform a [search](https://github.com/TeraSky-OSS/backstage-plugins/issues) to see if the enhancement has already been suggested. If it has, add a comment to the existing issue instead of opening a new one.
- Find out whether your idea fits with the scope and aims of the project. It's up to you to make a strong case to convince the project's developers of the merits of this feature. Keep in mind that we want features that will be useful to the majority of our users and not just a small subset. If you're just targeting a minority of users, consider writing an add-on/plugin library.

<!-- omit in toc -->
#### How Do I Submit a Good Enhancement Suggestion?

Enhancement suggestions are tracked as [GitHub issues](https://github.com/TeraSky-OSS/backstage-plugins/issues).

- Use a **clear and descriptive title** for the issue to identify the suggestion.
- Provide a **step-by-step description of the suggested enhancement** in as many details as possible.
- **Describe the current behavior** and **explain which behavior you expected to see instead** and why. At this point you can also tell which alternatives do not work for you.
- You may want to **include screenshots or screen recordings** which help you demonstrate the steps or point out the part which the suggestion is related to. You can use [LICEcap](https://www.cockos.com/licecap/) to record GIFs on macOS and Windows, and the built-in [screen recorder in GNOME](https://help.gnome.org/users/gnome-help/stable/screen-shot-record.html.en) or [SimpleScreenRecorder](https://github.com/MaartenBaert/ssr) on Linux. <!-- this should only be included if the project has a GUI -->
- **Explain why this enhancement would be useful** to most TeraSky's OSS Backstage Plugins users. You may also want to point out the other projects that solved it better and which could serve as inspiration.

<!-- You might want to create an issue template for enhancement suggestions that can be used as a guide and that defines the structure of the information to be included. If you do so, reference it here in the description. -->

### Your First Code Contribution

#### Prerequisites

Before you begin, make sure the following tools are installed on your machine:

- **Node.js** `22` or `24` (the versions supported by this repo — check with `node --version`)
- **Yarn** v4 (`npm install -g corepack && corepack enable` then `yarn --version` should show `4.x`)
- **Git**

#### Getting Started

1. **Fork the repository** on GitHub and clone your fork locally:

   ```bash
   git clone https://github.com/<your-username>/backstage-plugins.git
   cd backstage-plugins
   ```

2. **Install dependencies** for all workspaces:

   ```bash
   yarn workspaces foreach -A install
   ```

3. **Start the development app** to verify everything works:

   ```bash
   yarn start
   ```

   This starts the full Backstage dev app (defined in `packages/app` and `packages/backend`) with all local plugins available.

4. **Work on a specific plugin** by navigating into its directory and running:

   ```bash
   cd plugins/<plugin-name>
   yarn start   # if the plugin has its own dev server
   yarn test    # run the plugin's unit tests
   ```

#### Creating a New Plugin

Use the Backstage CLI scaffolder to generate a new plugin from one of the project templates:

```bash
yarn new
```

Follow the interactive prompts. All plugins are automatically scoped under `@terasky/` and placed in the `plugins/` directory.

#### Running the Full Test Suite

```bash
yarn test:all
```

To run linting:

```bash
yarn lint:all
```

To run type checking:

```bash
yarn tsc
```

#### Submitting Your Contribution

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes and ensure all tests pass.
3. Commit your changes following the [commit message guide](#commit-messages).
4. Push to your fork and open a Pull Request against the `main` branch.
5. A maintainer will review your PR and may request changes before merging.

### Improving The Documentation

The project documentation is published to [terasky-oss.github.io/backstage-plugins](https://terasky-oss.github.io/backstage-plugins/) and is generated from the `site/` directory in the repository root.

#### Types of Documentation Improvements

- **Plugin README files** — each plugin under `plugins/<plugin-name>/README.md` is the primary reference for that plugin's installation, configuration, and usage. If you find something outdated or missing, a PR updating only the README is always welcome.
- **Site documentation** — broader guides, architecture overviews, and cross-plugin documentation live in `site/`. Improvements to these pages follow the same PR process as code changes.
- **Code comments and JSDoc** — if you spot a public API that lacks documentation, adding JSDoc is a great first contribution.

#### How to Preview Documentation Locally

The docs site is built with MkDocs. To preview your changes locally:

```bash
pip install mkdocs-material
mkdocs serve
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

#### Documentation Standards

- Write in clear, concise English targeted at Backstage developers.
- Use code blocks with language annotations for all code samples.
- Link to the [official Backstage documentation](https://backstage.io/docs/) where relevant rather than duplicating it.
- Keep plugin-level README files self-contained so users can install a single plugin without reading the entire site.

## Styleguides

### Code
We follow the backstag style guides documented [here](https://github.com/backstage/backstage/blob/master/STYLE.md).
  
### Commit Messages

This project follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. Every commit message must have a structured format:

```
<type>(optional scope): <short description>

[optional body]

[optional footer(s)]
```

#### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `docs` | Documentation-only changes |
| `style` | Formatting, missing semicolons, etc. — no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | A code change that improves performance |
| `test` | Adding or correcting tests |
| `chore` | Build process, dependency updates, tooling changes |
| `ci` | CI/CD configuration changes |

#### Scope

The scope is optional but strongly encouraged. Use the plugin directory name (without the `plugins/` prefix) as the scope when the change is limited to one plugin:

```
feat(kubernetes-ingestor): support custom GVK annotation overrides
fix(crossplane-resources): correct YAML download encoding for non-ASCII names
chore: bump plugin versions
```

#### Rules

- Use the **imperative mood** in the short description ("add feature", not "added feature" or "adds feature").
- Keep the first line to **72 characters or fewer**.
- Reference related GitHub issues in the footer: `Closes #123` or `Fixes #456`.
- For breaking changes, append a `!` after the type/scope and include a `BREAKING CHANGE:` footer explaining the change.

#### Examples

```
feat(scaleops-frontend): add cost savings trend chart to overview card

Closes #42
```

```
fix(gitops-manifest-updater): handle empty PR description gracefully

Previously the component would throw an unhandled error when the
description field was left blank. The field is now optional.

Fixes #88
```

```
chore: bump plugin versions
```

<!-- omit in toc -->
## Attribution
This guide is based on the [contributing.md](https://contributing.md/generator)!