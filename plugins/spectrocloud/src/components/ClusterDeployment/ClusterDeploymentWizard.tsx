import { useState } from 'react';
import { Box, Card, Flex, Button, Text } from '@backstage/ui';
import { RiCheckLine } from '@remixicon/react';
import { CloudTypeSelection } from './steps/CloudTypeSelection';
import { ProjectSelection } from './steps/ProjectSelection';
import { CloudAccountSelection } from './steps/CloudAccountSelection';
import { ProfileSelection } from './steps/ProfileSelection';
import { ProfileVariables } from './steps/ProfileVariables';
import { ClusterConfiguration } from './steps/ClusterConfiguration';
import { InfrastructureConfiguration } from './steps/InfrastructureConfiguration';
import { VSphereInfrastructureConfiguration } from './steps/VSphereInfrastructureConfiguration';
import { VirtualClusterInfrastructureConfiguration } from './steps/VirtualClusterInfrastructureConfiguration';
import { Summary } from './steps/Summary';
import { ClusterDeploymentState, initialDeploymentState, CloudType } from './types';
import styles from './ClusterDeploymentWizard.module.css';

type StepStatus = 'completed' | 'active' | 'upcoming';

const getStepStatus = (index: number, activeStep: number): StepStatus => {
  if (index < activeStep) {
    return 'completed';
  }
  if (index === activeStep) {
    return 'active';
  }
  return 'upcoming';
};

const getStepsForCloudType = (cloudType?: CloudType): string[] => {
  if (cloudType === 'virtual') {
    return [
      'Cloud Type',
      'Project',
      'Virtual Cluster Setup',
      'Review & Deploy',
    ];
  }

  // Default steps for other cloud types (vSphere, EKS, etc.)
  return [
    'Cloud Type',
    'Project',
    'Cloud Account',
    'Profiles',
    'Profile Variables',
    'Cluster Configuration',
    'Infrastructure',
    'Review & Deploy',
  ];
};

// Hand-rolled horizontal progress-indicator header. BUI has no Stepper
// equivalent (confirmed absent from @backstage/ui's exports), so this
// renders a simple labeled-circle strip with a connecting line, driven
// entirely by BUI primitives + a small CSS module for the circle/line
// layout (no third-party or MUI component involved).
const StepperHeader = ({
  steps,
  activeStep,
}: {
  steps: string[];
  activeStep: number;
}) => (
  <Flex align="start" gap="0" className={styles.stepperRow}>
    {steps.map((label, index) => {
      const status = getStepStatus(index, activeStep);

      return (
        <Flex
          key={label}
          direction="column"
          align="center"
          gap="0"
          className={`${styles.step} ${styles[status]}`}
        >
          <Box className={`${styles.circle} ${styles[status]}`}>
            {status === 'completed' ? (
              <RiCheckLine size={16} />
            ) : (
              <Text as="span" weight={status === 'active' ? 'bold' : 'regular'}>
                {index + 1}
              </Text>
            )}
          </Box>
          <Text as="span" variant="body-small" className={`${styles.label} ${styles[status]}`}>
            {label}
          </Text>
        </Flex>
      );
    })}
  </Flex>
);

export const ClusterDeploymentWizard = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [state, setState] = useState<ClusterDeploymentState>(initialDeploymentState);
  const [profileVariablesValid, setProfileVariablesValid] = useState(true);

  const steps = getStepsForCloudType(state.cloudType);

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setState(initialDeploymentState);
  };

  const updateState = (updates: Partial<ClusterDeploymentState>) => {
    setState(prev => {
      // If cloudType changes, reset to initial state to avoid conflicts
      if (updates.cloudType && updates.cloudType !== prev.cloudType) {
        setActiveStep(0); // Reset to cloud type selection
        const newState = {
          ...initialDeploymentState,
          cloudType: updates.cloudType,
        };

        // Initialize virtual cluster defaults
        if (updates.cloudType === 'virtual') {
          newState.cloudConfig = {
            cpuCores: 4,
            memoryGiB: 8,
            storageGiB: 20,
            endpointType: 'LoadBalancer',
          };
        }

        return newState;
      }

      // Deep merge tfMetadata to preserve existing fields
      const newState = {
        ...prev,
        ...updates,
        tfMetadata: updates.tfMetadata
          ? { ...prev.tfMetadata, ...updates.tfMetadata }
          : prev.tfMetadata,
      };
      return newState;
    });
  };

  const canProceed = (): boolean => {
    if (state.cloudType === 'virtual') {
      // Virtual cluster steps: Cloud Type, Project, Virtual Setup, Review
      switch (activeStep) {
        case 0: // Cloud Type
          return !!state.cloudType;
        case 1: // Project
          return !!state.projectUid;
        case 2: { // Virtual Cluster Setup (name + cluster group + quotas)
          const hasClusterName = !!state.clusterName && state.clusterName.length > 0 &&
                                 /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(state.clusterName);
          const hasClusterGroup = !!state.cloudConfig.clusterGroupUid;
          const hasValidQuotas =
            (state.cloudConfig.cpuCores ?? 0) > 0 &&
            (state.cloudConfig.memoryGiB ?? 0) > 0 &&
            (state.cloudConfig.storageGiB ?? 0) > 0;
          return hasClusterName && hasClusterGroup && hasValidQuotas;
        }
        case 3: // Review & Deploy
          return true;
        default:
          return false;
      }
    }

    // Other cloud types: Cloud Type, Project, Cloud Account, Profiles, Profile Variables, Cluster Config, Infrastructure, Review
    switch (activeStep) {
      case 0: // Cloud Type
        return !!state.cloudType;
      case 1: // Project
        return !!state.projectUid;
      case 2: // Cloud Account
        return !!state.cloudAccountUid;
      case 3: // Profiles
        return state.profiles.length > 0;
      case 4: // Profile Variables
        return profileVariablesValid;
      case 5: // Cluster Configuration
        return !!state.clusterName && state.clusterName.length > 0;
      case 6: // Infrastructure
        if (state.cloudType === 'vsphere') {
          // Validate vSphere required fields
          const hasGlobalPlacement =
            !!state.cloudConfig.placement?.datacenter &&
            !!state.cloudConfig.placement?.folder &&
            !!state.cloudConfig.placement?.imageTemplateFolder;

          // Validate SSH key
          const hasSSHKey = !!state.cloudConfig.sshKeys && state.cloudConfig.sshKeys.length > 0;

          // Validate control plane
          const controlPlane = state.controlPlaneConfig;
          const hasControlPlaneSize = !!controlPlane.size && controlPlane.size > 0;
          const hasControlPlaneInstance =
            typeof controlPlane.instanceType === 'object' &&
            controlPlane.instanceType !== null &&
            !!controlPlane.instanceType.numCPUs &&
            !!controlPlane.instanceType.memoryMiB &&
            !!controlPlane.instanceType.diskGiB;
          const hasControlPlanePlacement =
            !!controlPlane.placements &&
            controlPlane.placements.length > 0 &&
            !!controlPlane.placements[0]?.cluster &&
            !!controlPlane.placements[0]?.datastore &&
            !!controlPlane.placements[0]?.network?.networkName;

          // Validate worker pools
          const hasWorkerPools = state.workerPools.length > 0;
          const allWorkersValid = state.workerPools.every(pool => {
            const hasName = !!pool.name && pool.name.trim().length > 0;
            const hasSize = pool.useAutoscaler
              ? (!!pool.minSize && pool.minSize > 0 && !!pool.maxSize && pool.maxSize > 0)
              : (!!pool.size && pool.size > 0);
            const hasInstance =
              typeof pool.instanceType === 'object' &&
              pool.instanceType !== null &&
              !!pool.instanceType.numCPUs &&
              !!pool.instanceType.memoryMiB &&
              !!pool.instanceType.diskGiB;
            const hasPlacement =
              !!pool.placements &&
              pool.placements.length > 0 &&
              !!pool.placements[0]?.cluster &&
              !!pool.placements[0]?.datastore &&
              !!pool.placements[0]?.network?.networkName;

            return hasName && hasSize && hasInstance && hasPlacement;
          });

          return hasGlobalPlacement &&
                 hasSSHKey &&
                 hasControlPlaneSize &&
                 hasControlPlaneInstance &&
                 hasControlPlanePlacement &&
                 hasWorkerPools &&
                 allWorkersValid;
        }
        // For other cloud types, just check worker pools exist
        return state.workerPools.length > 0;
      case 7: // Review & Deploy
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    if (state.cloudType === 'virtual') {
      // Virtual cluster flow: Cloud Type, Project, Virtual Setup (name + cluster group + quotas), Review
      switch (activeStep) {
        case 0:
          return (
            <CloudTypeSelection
              selectedCloudType={state.cloudType}
              onSelect={cloudType => updateState({ cloudType })}
            />
          );
        case 1:
          return (
            <ProjectSelection
              selectedProjectUid={state.projectUid}
              onSelect={(projectUid: string, projectName: string) =>
                updateState({ projectUid, projectName })
              }
            />
          );
        case 2:
          return (
            <VirtualClusterInfrastructureConfiguration
              state={state}
              onChange={(updates: any) => updateState(updates)}
            />
          );
        case 3:
          return (
            <Summary
              state={state}
              onDeploy={handleReset}
            />
          );
        default:
          return <Text>Unknown step</Text>;
      }
    }

    // Other cloud types: Cloud Type, Project, Cloud Account, Profiles, Profile Variables, Cluster Config, Infrastructure, Review
    switch (activeStep) {
      case 0:
        return (
          <CloudTypeSelection
            selectedCloudType={state.cloudType}
            onSelect={cloudType => updateState({ cloudType })}
          />
        );
      case 1:
        return (
          <ProjectSelection
            selectedProjectUid={state.projectUid}
            onSelect={(projectUid: string, projectName: string) =>
              updateState({ projectUid, projectName })
            }
          />
        );
      case 2:
        return (
          <CloudAccountSelection
            cloudType={state.cloudType!}
            projectUid={state.projectUid!}
            selectedAccountUid={state.cloudAccountUid}
            onSelect={(cloudAccountUid: string, cloudAccountName: string) =>
              updateState({ cloudAccountUid, cloudAccountName })
            }
          />
        );
      case 3:
        return (
          <ProfileSelection
            cloudType={state.cloudType!}
            projectUid={state.projectUid!}
            selectedProfiles={state.profiles}
            onUpdate={(profiles: any) => updateState({ profiles })}
          />
        );
      case 4:
        return (
          <ProfileVariables
            profiles={state.profiles}
            projectUid={state.projectUid!}
            profileVariables={state.profileVariables}
            onUpdate={(updates: any) => updateState(updates)}
            onValidationChange={setProfileVariablesValid}
          />
        );
      case 5:
        return (
          <ClusterConfiguration
            clusterName={state.clusterName}
            clusterDescription={state.clusterDescription}
            clusterTags={state.clusterTags}
            clusterVariables={state.clusterVariables}
            onUpdate={(updates: any) => updateState(updates)}
          />
        );
      case 6:
        if (state.cloudType === 'vsphere') {
          return (
            <VSphereInfrastructureConfiguration
              cloudAccountUid={state.cloudAccountUid!}
              projectUid={state.projectUid!}
              controlPlaneConfig={state.controlPlaneConfig}
              workerPools={state.workerPools}
              cloudConfig={state.cloudConfig}
              tfMetadata={state.tfMetadata}
              onUpdate={(updates: any) => updateState(updates)}
            />
          );
        }
          return (
            <InfrastructureConfiguration
              cloudType={state.cloudType!}
              controlPlaneConfig={state.controlPlaneConfig}
              workerPools={state.workerPools}
              cloudConfig={state.cloudConfig}
              onUpdate={(updates: any) => updateState(updates)}
            />
          );

      case 7:
        return (
          <Summary
            state={state}
            onDeploy={handleReset}
          />
        );
      default:
        return <Text>Unknown step</Text>;
    }
  };

  return (
    <Box p="6">
      <Card>
        <Box p="6">
          <StepperHeader steps={steps} activeStep={activeStep} />
        </Box>

        <Box p="6" style={{ minHeight: 400 }}>{renderStepContent()}</Box>

        <Flex justify="between" align="center" p="6" className={styles.actions}>
          <Button
            variant="secondary"
            isDisabled={activeStep === 0}
            onPress={handleBack}
          >
            Back
          </Button>
          <Box>
            {activeStep < steps.length - 1 && (
              <Button
                variant="primary"
                isDisabled={!canProceed()}
                onPress={handleNext}
              >
                Next
              </Button>
            )}
          </Box>
        </Flex>
      </Card>
    </Box>
  );
};
