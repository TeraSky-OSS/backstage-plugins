# entity-scaffolder-content

Welcome to the entity-scaffolder-content plugin!

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-entity-scaffolder-content/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-entity-scaffolder-content)


The `entity-scaffolder-content` plugin for Backstage allows embedding a tab with scaffolder templates on a component. This can also populate the list of templates and data in the templates based on the context from which it is run.

For detailed docs go to https://terasky-oss.github.io/backstage-plugins/plugins/entity-scaffolder/overview

## Form Decorators

This plugin supports Backstage [form decorators](https://backstage.io/docs/features/software-templates/experimental/#form-decorators). Decorators declared in a template's `spec.formDecorators` are automatically executed before the scaffold call, allowing use cases such as enforcing GitHub OAuth to prevent self-approval of Backstage-created PRs.

Form decorators are registered via the standard Backstage mechanism — `FormDecoratorBlueprint` (new frontend system) or by providing a custom `formDecoratorsApiRef` implementation. No changes to your `EntityScaffolderContent` usage are required to take advantage of this feature.

### New `layouts` prop

An optional `layouts` prop (`LayoutOptions[]`) has been added to pass custom layout options to the scaffolder workflow stepper. Existing usage without this prop is unaffected.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License
This project is licensed under the Apache-2.0 License.
