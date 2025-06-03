import { Button, Grid } from '@material-ui/core';
import {
  EntityApiDefinitionCard,
  EntityConsumedApisCard,
  EntityConsumingComponentsCard,
  EntityHasApisCard,
  EntityProvidedApisCard,
  EntityProvidingComponentsCard,
} from '@backstage/plugin-api-docs';
import {
  EntityAboutCard,
  EntityDependsOnComponentsCard,
  EntityDependsOnResourcesCard,
  EntityHasComponentsCard,
  EntityHasResourcesCard,
  EntityHasSubcomponentsCard,
  EntityHasSystemsCard,
  EntityLayout,
  EntityLinksCard,
  EntitySwitch,
  EntityOrphanWarning,
  EntityProcessingErrorsPanel,
  isComponentType,
  isKind,
  hasCatalogProcessingErrors,
  isOrphan,
  hasRelationWarnings,
  EntityRelationWarning,
} from '@backstage/plugin-catalog';
import { Entity } from '@backstage/catalog-model';
import { EmptyState } from '@backstage/core-components';
import {
  EntityUserProfileCard,
  EntityGroupProfileCard,
  EntityMembersListCard,
  EntityOwnershipCard,
} from '@backstage/plugin-org';
import { EntityTechdocsContent } from '@backstage/plugin-techdocs';
import {
  Direction,
  EntityCatalogGraphCard,
} from '@backstage/plugin-catalog-graph';
import { EntityScaffolderContent } from '@terasky/backstage-plugin-entity-scaffolder-content';
import {
  RELATION_API_CONSUMED_BY,
  RELATION_API_PROVIDED_BY,
  RELATION_CONSUMES_API,
  RELATION_DEPENDENCY_OF,
  RELATION_DEPENDS_ON,
  RELATION_HAS_PART,
  RELATION_PART_OF,
  RELATION_PROVIDES_API,
  stringifyEntityRef,
} from '@backstage/catalog-model';

import { TechDocsAddons } from '@backstage/plugin-techdocs-react';
import { ReportIssue } from '@backstage/plugin-techdocs-module-addons-contrib';

import {
  EntityKubernetesContent,
  isKubernetesAvailable,
} from '@backstage/plugin-kubernetes';
import {
  CrossplaneAllResourcesTable,
  CrossplaneOverviewCard,
  CrossplaneResourceGraph,
  isCrossplaneAvailable,
  IfCrossplaneOverviewAvailable,
  IfCrossplaneResourceGraphAvailable,
  IfCrossplaneResourcesListAvailable,
  useResourceGraphAvailable,
  useResourcesListAvailable,
} from '@terasky/backstage-plugin-crossplane-resources-frontend';
import { isScaleopsAvailable } from '@terasky/backstage-plugin-scaleops-frontend'
import { DevpodComponent, isDevpodAvailable } from '@terasky/backstage-plugin-devpod';
import { ScaffolderFieldExtensions } from '@backstage/plugin-scaffolder-react';
import { EntityPickerFieldExtension, RepoUrlPickerFieldExtension } from '@backstage/plugin-scaffolder';
import { ScaleOpsDashboard } from '@terasky/backstage-plugin-scaleops-frontend';
import { KyvernoCrossplaneOverviewCard, KyvernoCrossplanePolicyReportsTable, KyvernoOverviewCard, KyvernoPolicyReportsTable } from '@terasky/backstage-plugin-kyverno-policy-reports';
import { GitOpsManifestUpdaterExtension } from '@terasky/backstage-plugin-gitops-manifest-updater';
import { KubernetesResourcesPage, isKubernetesResourcesAvailable, KubernetesResourceGraph } from '@terasky/backstage-plugin-kubernetes-resources-frontend';
import {
  VCFAutomationProjectOverview,
  VCFAutomationProjectDetails,
  VCFAutomationVSphereVMOverview,
  VCFAutomationVSphereVMDetails,
  VCFAutomationDeploymentDetails,
  VCFAutomationDeploymentOverview,
  VCFAutomationGenericResourceDetails,
  VCFAutomationGenericResourceOverview,
} from '@terasky/backstage-plugin-vcf-automation';

const techdocsContent = (
  <EntityTechdocsContent>
    <TechDocsAddons>
      <ReportIssue />
    </TechDocsAddons>
  </EntityTechdocsContent>
);

const cicdContent = (
  <EntitySwitch>
    <EntitySwitch.Case>
      <EmptyState
        title="No CI/CD available for this entity"
        missing="info"
        description="You need to add an annotation to your component if you want to enable CI/CD for it. You can read more about annotations in Backstage by clicking the button below."
        action={
          <Button
            variant="contained"
            color="primary"
            href="https://backstage.io/docs/features/software-catalog/well-known-annotations"
          >
            Read more
          </Button>
        }
      />
    </EntitySwitch.Case>
  </EntitySwitch>
);

const entityWarningContent = (
  <>
    <EntitySwitch>
      <EntitySwitch.Case if={isOrphan}>
        <Grid item xs={12}>
          <EntityOrphanWarning />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
    <EntitySwitch>
      <EntitySwitch.Case if={hasRelationWarnings}>
        <Grid item xs={12}>
          <EntityRelationWarning />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>

    <EntitySwitch>
      <EntitySwitch.Case if={hasCatalogProcessingErrors}>
        <Grid item xs={12}>
          <EntityProcessingErrorsPanel />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
  </>
);

const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    {entityWarningContent}
    <Grid item md={6}>
      <EntityAboutCard variant="gridItem" />
    </Grid>
    <Grid item md={6} xs={12}>
      <EntityCatalogGraphCard variant="gridItem" height={400} />
    </Grid>

    <Grid item md={4} xs={12}>
      <EntityLinksCard />
    </Grid>
    <Grid item md={8} xs={12}>
      <EntityHasSubcomponentsCard variant="gridItem" />
    </Grid>
    <EntitySwitch>
      <EntitySwitch.Case if={isDevpodAvailable}>
        <Grid item md={6}>
          <DevpodComponent />
        </Grid>
      </EntitySwitch.Case>
      <EntitySwitch.Case if={isKubernetesAvailable}>
        <Grid item md={6}>
          <KyvernoOverviewCard />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
  </Grid>
);
const crossplaneOverviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    <Grid item md={6}>
      <EntityAboutCard variant="gridItem" />
    </Grid>
    <IfCrossplaneOverviewAvailable>
      <Grid item md={6}>
        <CrossplaneOverviewCard />
      </Grid>
    </IfCrossplaneOverviewAvailable>
    <Grid item md={6}>
      <KyvernoCrossplaneOverviewCard />
    </Grid>
  </Grid>
);
const serviceEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {overviewContent}
    </EntityLayout.Route>

    <EntityLayout.Route path="/ci-cd" title="CI/CD">
      {cicdContent}
    </EntityLayout.Route>

    <EntityLayout.Route
      path="/kubernetes"
      title="Kubernetes"
      if={isKubernetesAvailable}
    >
      <EntityKubernetesContent />
    </EntityLayout.Route>
    <EntityLayout.Route path="/kubernetes-resource-graph" if={isKubernetesResourcesAvailable} title="Kubernetes Resource Graph">
      <KubernetesResourceGraph />
    </EntityLayout.Route>
    <EntityLayout.Route path="/kubernetes-resource-page" if={isKubernetesResourcesAvailable} title="Kubernetes Resources">
      <KubernetesResourcesPage />
    </EntityLayout.Route>
    <EntityLayout.Route path="/kyverno-policy-reports" title="Kyverno Policy Reports">
      <KyvernoPolicyReportsTable />
    </EntityLayout.Route>
    <EntityLayout.Route path="/api" title="API">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <EntityProvidedApisCard />
        </Grid>
        <Grid item md={6}>
          <EntityConsumedApisCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>

    <EntityLayout.Route path="/dependencies" title="Dependencies">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <EntityDependsOnComponentsCard variant="gridItem" />
        </Grid>
        <Grid item md={6}>
          <EntityDependsOnResourcesCard variant="gridItem" />
        </Grid>
      </Grid>
    </EntityLayout.Route>

    <EntityLayout.Route path="/docs" title="Docs">
      {techdocsContent}
    </EntityLayout.Route>
    <EntityLayout.Route if={isCrossplaneAvailable} path="/crossplane-resources" title="Crossplane Resources">
      <IfCrossplaneResourcesListAvailable>
        <CrossplaneAllResourcesTable />
      </IfCrossplaneResourcesListAvailable>
    </EntityLayout.Route>
    <EntityLayout.Route if={isCrossplaneAvailable} path="/crossplane-graph" title="Crossplane Graph">
      <IfCrossplaneResourceGraphAvailable>
        <CrossplaneResourceGraph />
      </IfCrossplaneResourceGraphAvailable>
    </EntityLayout.Route>
    <EntityLayout.Route if={isScaleopsAvailable} path="/scaleops" title="Scale Ops">
      <ScaleOpsDashboard />
    </EntityLayout.Route>
    <EntityLayout.Route path="/scaffolder" title="Entity Scaffolder">
        <EntityScaffolderContent
          templateGroupFilters={[
            {
              title: 'Management Templates',
              filter: (entity, template) =>
                template.metadata?.labels?.target === 'component' &&
                entity.metadata?.annotations?.['backstage.io/managed-by-location']?.split(":")[0] === 'cluster origin',
            },
          ]}
          buildInitialState={entity => ({
              entity: stringifyEntityRef(entity)
            }
          )}
          ScaffolderFieldExtensions={
            <ScaffolderFieldExtensions>
              <RepoUrlPickerFieldExtension />
              <EntityPickerFieldExtension />
              <GitOpsManifestUpdaterExtension />
            </ScaffolderFieldExtensions>
          }
        />
    </EntityLayout.Route>
  </EntityLayout>
);

const CrossplaneEntityPage = () => {
  const isResourcesListAvailable = useResourcesListAvailable();
  const isResourceGraphAvailable = useResourceGraphAvailable();

  return (
    <EntityLayout>
      <EntityLayout.Route path="/" title="Overview">
        {crossplaneOverviewContent}
      </EntityLayout.Route>

      <EntityLayout.Route if={isResourcesListAvailable} path="/crossplane-resources" title="Crossplane Resources">
        <IfCrossplaneResourcesListAvailable>
          <CrossplaneAllResourcesTable />
        </IfCrossplaneResourcesListAvailable>
      </EntityLayout.Route>

      <EntityLayout.Route if={isResourceGraphAvailable} path="/crossplane-graph" title="Crossplane Graph">
        <IfCrossplaneResourceGraphAvailable>
          <CrossplaneResourceGraph />
        </IfCrossplaneResourceGraphAvailable>
      </EntityLayout.Route>

      <EntityLayout.Route if={isKubernetesAvailable} path="/kyverno-policy-reports" title="Kyverno Policy Reports">
        <KyvernoCrossplanePolicyReportsTable />
      </EntityLayout.Route>

      <EntityLayout.Route path="/scaffolder" title="Entity Scaffolder">
        <EntityScaffolderContent
          templateGroupFilters={[
            {
              title: 'Management Templates',
              filter: (entity, template) =>
                template.metadata?.labels?.target === 'component' &&
                entity.metadata?.annotations?.['backstage.io/managed-by-location']?.split(":")[0] === 'cluster origin',
            },
          ]}
          buildInitialState={entity => ({
            entity: stringifyEntityRef(entity)
          })}
          ScaffolderFieldExtensions={
            <ScaffolderFieldExtensions>
              <RepoUrlPickerFieldExtension />
              <EntityPickerFieldExtension />
              <GitOpsManifestUpdaterExtension />
            </ScaffolderFieldExtensions>
          }
        />
      </EntityLayout.Route>
    </EntityLayout>
  );
};

const vcfAutomationVSphereVMOverviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    <Grid item md={6}>
      <EntityAboutCard variant="gridItem" />
    </Grid>
    <Grid item md={6}>
      <VCFAutomationVSphereVMOverview />
    </Grid>
    <Grid item md={6} xs={12}>
      <EntityCatalogGraphCard variant="gridItem" height={400} />
    </Grid>
    <Grid item md={4} xs={12}>
      <EntityLinksCard />
    </Grid>
  </Grid>
);

const vcfAutomationVSphereVMPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {vcfAutomationVSphereVMOverviewContent}
    </EntityLayout.Route>
    <EntityLayout.Route path="/vcf-automation" title="VCF Automation">
      <VCFAutomationVSphereVMDetails />
    </EntityLayout.Route>
  </EntityLayout>
);

const websiteEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {overviewContent}
    </EntityLayout.Route>

    <EntityLayout.Route path="/ci-cd" title="CI/CD">
      {cicdContent}
    </EntityLayout.Route>

    <EntityLayout.Route
      path="/kubernetes"
      title="Kubernetes"
      if={isKubernetesAvailable}
    >
      <EntityKubernetesContent />
    </EntityLayout.Route>

    <EntityLayout.Route path="/dependencies" title="Dependencies">
      <Grid container spacing={3} alignItems="stretch">
        <Grid item md={6}>
          <EntityDependsOnComponentsCard variant="gridItem" />
        </Grid>
        <Grid item md={6}>
          <EntityDependsOnResourcesCard variant="gridItem" />
        </Grid>
      </Grid>
    </EntityLayout.Route>

    <EntityLayout.Route path="/docs" title="Docs">
      {techdocsContent}
    </EntityLayout.Route>
  </EntityLayout>
);

const defaultEntityPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {overviewContent}
    </EntityLayout.Route>

    <EntityLayout.Route path="/docs" title="Docs">
      {techdocsContent}
    </EntityLayout.Route>
  </EntityLayout>
);

const componentPage = (
  <EntitySwitch>
    <EntitySwitch.Case if={isComponentType('service')}>
      {serviceEntityPage}
    </EntitySwitch.Case>

    <EntitySwitch.Case if={isComponentType('website')}>
      {websiteEntityPage}
    </EntitySwitch.Case>

    <EntitySwitch.Case if={isComponentType('crossplane-claim')}>
      <CrossplaneEntityPage />
    </EntitySwitch.Case>

    <EntitySwitch.Case if={isComponentType('Cloud.vSphere.Machine')}>
      {vcfAutomationVSphereVMPage}
    </EntitySwitch.Case>

    <EntitySwitch.Case>{defaultEntityPage}</EntitySwitch.Case>
  </EntitySwitch>
);

const apiPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        {entityWarningContent}
        <Grid item md={6}>
          <EntityAboutCard />
        </Grid>
        <Grid item md={6} xs={12}>
          <EntityCatalogGraphCard variant="gridItem" height={400} />
        </Grid>
        <Grid item md={4} xs={12}>
          <EntityLinksCard />
        </Grid>
        <Grid container item md={12}>
          <Grid item md={6}>
            <EntityProvidingComponentsCard />
          </Grid>
          <Grid item md={6}>
            <EntityConsumingComponentsCard />
          </Grid>
        </Grid>
      </Grid>
    </EntityLayout.Route>

    <EntityLayout.Route path="/definition" title="Definition">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <EntityApiDefinitionCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);

const userPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        {entityWarningContent}
        <Grid item xs={12} md={6}>
          <EntityUserProfileCard variant="gridItem" />
        </Grid>
        <Grid item xs={12} md={6}>
          <EntityOwnershipCard variant="gridItem" />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);

const groupPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        {entityWarningContent}
        <Grid item xs={12} md={6}>
          <EntityGroupProfileCard variant="gridItem" />
        </Grid>
        <Grid item xs={12} md={6}>
          <EntityOwnershipCard variant="gridItem" />
        </Grid>
        <Grid item xs={12} md={6}>
          <EntityMembersListCard />
        </Grid>
        <Grid item xs={12} md={6}>
          <EntityLinksCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);

const hasVcfAutomationDeploymentStatus = (entity: Entity): boolean => 
  Boolean(entity.metadata?.annotations?.['terasky.backstage.io/vcf-automation-deployment-status']);

const hasVcfAutomationResourceType = (entity: Entity): boolean => 
  Boolean(entity.metadata?.annotations?.['terasky.backstage.io/vcf-automation-resource-type']);

const vcfAutomationGenericResourceOverviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    <Grid item md={6}>
      <EntityAboutCard variant="gridItem" />
    </Grid>
    <Grid item md={6}>
      <VCFAutomationGenericResourceOverview />
    </Grid>
    <Grid item md={6} xs={12}>
      <EntityCatalogGraphCard variant="gridItem" height={400} />
    </Grid>
    <Grid item md={4} xs={12}>
      <EntityLinksCard />
    </Grid>
  </Grid>
);

const vcfAutomationDeploymentOverviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    <Grid item md={6}>
      <EntityAboutCard variant="gridItem" />
    </Grid>
    <Grid item md={6}>
      <VCFAutomationDeploymentOverview />
    </Grid>
    <Grid item md={6} xs={12}>
      <EntityCatalogGraphCard variant="gridItem" height={400} />
    </Grid>
    <Grid item md={4} xs={12}>
      <EntityLinksCard />
    </Grid>
  </Grid>
);

const vcfAutomationGenericResourcePage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {vcfAutomationGenericResourceOverviewContent}
    </EntityLayout.Route>
    <EntityLayout.Route path="/vcf-automation" title="VCF Automation">
      <VCFAutomationGenericResourceDetails />
    </EntityLayout.Route>
  </EntityLayout>
);

const vcfAutomationDeploymentPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      {vcfAutomationDeploymentOverviewContent}
    </EntityLayout.Route>
    <EntityLayout.Route path="/vcf-automation" title="VCF Automation">
      <VCFAutomationDeploymentDetails />
    </EntityLayout.Route>
  </EntityLayout>
);

const systemPage = (
  <>
    <EntitySwitch>
      <EntitySwitch.Case if={hasVcfAutomationDeploymentStatus}>
        {vcfAutomationDeploymentPage}
      </EntitySwitch.Case>
      <EntitySwitch.Case>
        <EntityLayout>
          <EntityLayout.Route path="/" title="Overview">
            <Grid container spacing={3} alignItems="stretch">
              {entityWarningContent}
              <Grid item md={6}>
                <EntityAboutCard variant="gridItem" />
              </Grid>
              <Grid item md={6} xs={12}>
                <EntityCatalogGraphCard variant="gridItem" height={400} />
              </Grid>
              <Grid item md={4} xs={12}>
                <EntityLinksCard />
              </Grid>
              <Grid item md={8}>
                <EntityHasComponentsCard variant="gridItem" />
              </Grid>
              <Grid item md={6}>
                <EntityHasApisCard variant="gridItem" />
              </Grid>
              <Grid item md={6}>
                <EntityHasResourcesCard variant="gridItem" />
              </Grid>
            </Grid>
          </EntityLayout.Route>
          <EntityLayout.Route path="/diagram" title="Diagram">
            <EntityCatalogGraphCard
              variant="gridItem"
              direction={Direction.TOP_BOTTOM}
              title="System Diagram"
              height={700}
              relations={[
                RELATION_PART_OF,
                RELATION_HAS_PART,
                RELATION_API_CONSUMED_BY,
                RELATION_API_PROVIDED_BY,
                RELATION_CONSUMES_API,
                RELATION_PROVIDES_API,
                RELATION_DEPENDENCY_OF,
                RELATION_DEPENDS_ON,
              ]}
              unidirectional={false}
            />
          </EntityLayout.Route>
          <EntityLayout.Route path="/scaffolder" title="Crossplane Scaffolder">
            <EntityScaffolderContent
              templateGroupFilters={[
                {
                  title: 'Crossplane Claims',
                  filter: (entity, template) =>
                    template.metadata?.labels?.forEntity === 'system' &&
                    entity.spec?.type === 'kubernetes-namespace',
                },
              ]}
              buildInitialState={entity => ({
                xrNamespace: entity.metadata.name,
                clusters: [entity.metadata?.annotations?.['backstage.io/managed-by-location']?.split(": ")[1] ?? '']
              })}
              ScaffolderFieldExtensions={
                <ScaffolderFieldExtensions>
                  <RepoUrlPickerFieldExtension />
                  <EntityPickerFieldExtension />
                </ScaffolderFieldExtensions>
              }
            />
          </EntityLayout.Route>
        </EntityLayout>
      </EntitySwitch.Case>
    </EntitySwitch>
  </>
);

const domainPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        {entityWarningContent}
        <Grid item md={6}>
          <EntityAboutCard variant="gridItem" />
        </Grid>
        <Grid item md={6} xs={12}>
          <EntityCatalogGraphCard variant="gridItem" height={400} />
        </Grid>
        <Grid item md={6}>
          <EntityHasSystemsCard variant="gridItem" />
        </Grid>
        <Grid item md={6}>
          <VCFAutomationProjectOverview />
        </Grid>
      </Grid>
    </EntityLayout.Route>
    <EntityLayout.Route path="/vcf-automation" title="VCF Automation">
      <VCFAutomationProjectDetails />
    </EntityLayout.Route>
  </EntityLayout>
);

const resourcePage = (
  <EntitySwitch>
    <EntitySwitch.Case if={hasVcfAutomationResourceType}>
      {vcfAutomationGenericResourcePage}
    </EntitySwitch.Case>
    <EntitySwitch.Case>
      {defaultEntityPage}
    </EntitySwitch.Case>
  </EntitySwitch>
);

export const entityPage = (
  <EntitySwitch>
    <EntitySwitch.Case if={isKind('component')} children={componentPage} />
    <EntitySwitch.Case if={isKind('api')} children={apiPage} />
    <EntitySwitch.Case if={isKind('group')} children={groupPage} />
    <EntitySwitch.Case if={isKind('user')} children={userPage} />
    <EntitySwitch.Case if={isKind('system')} children={systemPage} />
    <EntitySwitch.Case if={isKind('domain')} children={domainPage} />
    <EntitySwitch.Case if={isKind('resource')} children={resourcePage} />

    <EntitySwitch.Case>{defaultEntityPage}</EntitySwitch.Case>
  </EntitySwitch>
);