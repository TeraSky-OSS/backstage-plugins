import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import {
  errorApiRef,
  useApi,
  useApiHolder,
} from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';
import { formDecoratorsApiRef } from '@backstage/plugin-scaffolder/alpha';
import {
  FieldExtensionOptions,
  LayoutOptions,
  SecretsContextProvider,
  TemplateGroupFilter,
  scaffolderApiRef,
  useCustomFieldExtensions,
  useCustomLayouts,
  useTaskEventStream,
  useTemplateSecrets,
} from '@backstage/plugin-scaffolder-react';
import {
  DefaultTemplateOutputs,
  TaskLogStream,
  TaskSteps,
  TemplateGroups,
  Workflow,
  formFieldsApiRef,
  useTemplateParameterSchema,
} from '@backstage/plugin-scaffolder-react/alpha';
import type { JsonValue } from '@backstage/types';
import { Button } from '@material-ui/core';
import {
  ComponentType,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAsync } from 'react-use';
import { TemplateListProvider } from './TemplateListProvider';

type TemplateGroupFilterWithEntityCapture = {
  title?: ReactNode;
  filter: (entity: Entity, template: TemplateEntityV1beta3) => boolean;
};

/**
 * @public
 *
 * Props for {@link EntityScaffolderContent}
 * */
export type EntityScaffolderContentProps = {
  templateGroupFilters: TemplateGroupFilterWithEntityCapture[];
  buildInitialState: (
    entity: Entity,
    template: TemplateEntityV1beta3,
  ) => Record<string, JsonValue>;
  /**
   * Optional field extensions. In the new Backstage frontend system all
   * FormFieldBlueprint extensions are discovered automatically via
   * formFieldsApiRef, so this prop is only needed for legacy / explicit
   * extensions that are not registered through that mechanism.
   */
  ScaffolderFieldExtensions?: ReactNode;
  /** Optional custom layouts to pass to the workflow stepper */
  layouts?: LayoutOptions[];
  components?: {
    TemplateCard?: ComponentType<{ template: TemplateEntityV1beta3 }>;
  };
};

/**
 * Collects all FieldExtensionOptions from two sources and merges them:
 *   1. formFieldsApiRef.loadFormFields() — auto-discovers every FormFieldBlueprint
 *      extension registered in the new Backstage frontend system.
 *   2. ScaffolderFieldExtensions ReactNode — legacy/explicit extensions passed
 *      as <ScaffolderFieldExtensions><MyField /></ScaffolderFieldExtensions>.
 * Extensions from both sources are deduplicated by name.
 */
const useAllFieldExtensions = (
  scafExtensions: ReactNode,
): FieldExtensionOptions[] => {
  const apiHolder = useApiHolder();
  // formFieldsApiRef is only present in new-frontend-system apps
  const formFieldsApi = apiHolder.get(formFieldsApiRef) ?? null;

  const { value: loadedFields } = useAsync(
    () => formFieldsApi?.loadFormFields() ?? Promise.resolve([]),
    [formFieldsApi],
  );

  // Legacy / explicitly-passed extensions
  const manualExtensions =
    useCustomFieldExtensions<FieldExtensionOptions>(scafExtensions);

  return useMemo(() => {
    // FormField opaque type has the same shape as FieldExtensionOptions at runtime
    const autoExtensions: FieldExtensionOptions[] = (loadedFields ?? [])
      .filter((field: any) => Boolean(field.name && field.component))
      .map(
        (field: any): FieldExtensionOptions => ({
          name: field.name as string,
          component: field.component,
          ...(field.validation && { validation: field.validation }),
          ...(field.schema && { schema: field.schema }),
        }),
      );

    // Merge, preferring auto-discovered; deduplicate by name
    const byName = new Map<string, FieldExtensionOptions>();
    for (const ext of [...autoExtensions, ...manualExtensions]) {
      if (!byName.has(ext.name)) {
        byName.set(ext.name, ext);
      }
    }
    return Array.from(byName.values());
  }, [loadedFields, manualExtensions]);
};

/**
 * Replicates the form decorator execution logic from Backstage's internal
 * useFormDecorators hook, using the public formDecoratorsApiRef.
 * Uses useApiHolder so that a missing formDecoratorsApiRef is a graceful no-op.
 */
const useFormDecoratorRunner = () => {
  const apiHolder = useApiHolder();
  const errorApi = useApi(errorApiRef);
  const formDecoratorsApi = apiHolder.get(formDecoratorsApiRef) ?? null;
  const { value: decorators } = useAsync(
    () => formDecoratorsApi?.getFormDecorators() ?? Promise.resolve([]),
    [formDecoratorsApi],
  );

  const run = useCallback(
    async ({
      formState,
      secrets,
      manifest,
    }: {
      formState: Record<string, JsonValue>;
      secrets: Record<string, string>;
      manifest: any;
    }): Promise<{
      formState: Record<string, JsonValue>;
      secrets: Record<string, string>;
    }> => {
      // Use an object wrapper so closures inside the loop capture a stable
      // const binding rather than reassignable let variables (no-loop-func).
      const ctx = {
        formState: { ...formState } as Record<string, JsonValue>,
        secrets: { ...secrets } as Record<string, string>,
      };

      const formDecoratorRefs =
        manifest?.formDecorators ?? manifest?.EXPERIMENTAL_formDecorators;

      if (!formDecoratorRefs || !decorators?.length) {
        return { formState: ctx.formState, secrets: ctx.secrets };
      }

      for (const decoratorRef of formDecoratorRefs) {
        const decorator = decorators.find(d => d.id === decoratorRef.id);
        if (!decorator) continue;

        // Access the internal runtime shape of the opaque ScaffolderFormDecorator
        const { decorator: fn, deps = {} } = decorator as any;

        const resolvedDeps = Object.fromEntries(
          Object.entries(deps).map(([key, ref]) => {
            const api = apiHolder.get(ref as any);
            if (!api) {
              errorApi.post(
                new Error(
                  `Failed to resolve apiRef for form decorator "${decorator.id}"; decorator will be skipped`,
                ),
              );
            }
            return [key, api];
          }),
        );

        try {
          await fn(
            {
              input: decoratorRef.input ?? {},
              formState: ctx.formState,
              setFormState: (
                s:
                  | Record<string, JsonValue>
                  | ((prev: Record<string, JsonValue>) => Record<string, JsonValue>),
              ) => {
                ctx.formState =
                  typeof s === 'function' ? s(ctx.formState) : s;
              },
              secrets: ctx.secrets,
              setSecrets: (
                s:
                  | Record<string, string>
                  | ((prev: Record<string, string>) => Record<string, string>),
              ) => {
                ctx.secrets =
                  typeof s === 'function' ? s(ctx.secrets) : s;
              },
            },
            resolvedDeps,
          );
        } catch (ex) {
          errorApi.post(ex as Error);
        }
      }

      return { formState: ctx.formState, secrets: ctx.secrets };
    },
    [decorators, apiHolder, errorApi],
  );

  return { run };
};

const TaskProgressView = ({
  taskId,
  onBack,
}: {
  taskId: string;
  onBack: () => void;
}) => {
  const taskStream = useTaskEventStream(taskId);

  const steps = useMemo(() => {
    const specSteps: any[] = taskStream.task?.spec.steps ?? [];
    return Object.entries(taskStream.steps).map(([id, step]) => ({
      ...step,
      ...(specSteps.find((s: any) => s.id === id) ?? {}),
      id,
    }));
  }, [taskStream.steps, taskStream.task]);

  const activeStep = useMemo(() => {
    for (let i = steps.length - 1; i >= 0; i--) {
      const s = steps[i].status;
      if (s === 'processing' || s === 'completed' || s === 'failed') {
        return i;
      }
    }
    return 0;
  }, [steps]);

  return (
    <>
      <TaskSteps
        steps={steps}
        activeStep={activeStep}
        isComplete={taskStream.completed}
        isError={!!taskStream.error}
      />
      {taskStream.completed && (
        <DefaultTemplateOutputs output={taskStream.output} />
      )}
      <TaskLogStream logs={taskStream.stepLogs} />
      {(taskStream.completed || !!taskStream.error) && (
        <Button variant="contained" color="primary" onClick={onBack}>
          View All Templates
        </Button>
      )}
    </>
  );
};

/**
 * Inner component that handles the selected template workflow.
 * Must be rendered inside a SecretsContextProvider.
 */
const SelectedTemplateWorkflow = ({
  template,
  entity,
  buildInitialState,
  ScaffolderFieldExtensions,
  layouts,
  onBack,
}: {
  template: TemplateEntityV1beta3;
  entity: Entity;
  buildInitialState: (
    entity: Entity,
    template: TemplateEntityV1beta3,
  ) => Record<string, JsonValue>;
  ScaffolderFieldExtensions?: ReactNode;
  layouts?: LayoutOptions[];
  onBack: () => void;
}) => {
  const [taskId, setTaskId] = useState<string | null>(null);

  const { secrets } = useTemplateSecrets();
  const secretsRef = useRef(secrets);
  useEffect(() => {
    secretsRef.current = secrets;
  }, [secrets]);

  const namespace = template.metadata.namespace ?? 'default';
  const name = template.metadata.name;
  const templateRef = useMemo(
    () => stringifyEntityRef({ kind: 'Template', namespace, name }),
    [namespace, name],
  );

  const { manifest } = useTemplateParameterSchema(templateRef);
  const scaffolderApi = useApi(scaffolderApiRef);
  const decoratorRunner = useFormDecoratorRunner();

  const extensions = useAllFieldExtensions(ScaffolderFieldExtensions);
  const customLayouts = useCustomLayouts(ScaffolderFieldExtensions);
  const resolvedLayouts = layouts ?? customLayouts;

  const onCreate = useCallback(
    async (formValues: Record<string, JsonValue>) => {
      const { formState, secrets: decoratedSecrets } =
        await decoratorRunner.run({
          formState: formValues,
          secrets: secretsRef.current,
          manifest,
        });

      const { taskId: newTaskId } = await scaffolderApi.scaffold({
        templateRef,
        values: formState,
        secrets: decoratedSecrets,
      });

      setTaskId(newTaskId);
    },
    [decoratorRunner, manifest, scaffolderApi, templateRef],
  );

  if (taskId) {
    return <TaskProgressView taskId={taskId} onBack={onBack} />;
  }

  return (
    <>
      <Workflow
        namespace={namespace}
        templateName={name}
        initialState={buildInitialState(entity, template)}
        extensions={extensions}
        layouts={resolvedLayouts}
        onCreate={onCreate}
        onError={(error: Error | undefined) => (
          <h2>{error?.message ?? 'Error running workflow'}</h2>
        )}
      />
      <Button variant="contained" color="primary" onClick={onBack}>
        View All Templates
      </Button>
    </>
  );
};

/**
 * Use templates from within the EntityPage.
 *
 * @public
 */
export const EntityScaffolderContent = ({
  templateGroupFilters,
  buildInitialState,
  ScaffolderFieldExtensions,
  layouts,
  components,
}: EntityScaffolderContentProps) => {
  const { entity } = useEntity();
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateEntityV1beta3 | null>(null);

  const groupFilters: TemplateGroupFilter[] = useMemo(() => {
    return templateGroupFilters.map(({ title, filter }) => ({
      title,
      filter: (template: TemplateEntityV1beta3) => filter(entity, template),
    }));
  }, [templateGroupFilters, entity]);

  return (
    <SecretsContextProvider>
      <TemplateListProvider>
        {selectedTemplate ? (
          <SelectedTemplateWorkflow
            template={selectedTemplate}
            entity={entity}
            buildInitialState={buildInitialState}
            ScaffolderFieldExtensions={ScaffolderFieldExtensions}
            layouts={layouts}
            onBack={() => setSelectedTemplate(null)}
          />
        ) : (
          <TemplateGroups
            groups={groupFilters}
            onTemplateSelected={setSelectedTemplate}
            TemplateCardComponent={components?.TemplateCard ?? undefined}
          />
        )}
      </TemplateListProvider>
    </SecretsContextProvider>
  );
};
