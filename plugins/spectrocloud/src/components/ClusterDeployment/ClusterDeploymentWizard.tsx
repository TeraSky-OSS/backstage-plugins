import { useState } from 'react';
import {
  Stepper,
  Step,
  StepLabel,
  Paper,
  Box,
  Button,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { CloudTypeSelection } from './steps/CloudTypeSelection';
import { ProjectSelection } from './steps/ProjectSelection';
import { CloudAccountSelection } from './steps/CloudAccountSelection';
import { ProfileSelection } from './steps/ProfileSelection';
import { ProfileVariables } from './steps/ProfileVariables';
import { ClusterConfiguration } from './steps/ClusterConfiguration';
import { InfrastructureConfiguration } from './steps/InfrastructureConfiguration';
import { VSphereInfrastructureConfiguration } from './steps/VSphereInfrastructureConfiguration';
import { Summary } from './steps/Summary';
import { ClusterDeploymentState, initialDeploymentState } from './types';

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(3),
  },
  stepper: {
    marginBottom: theme.spacing(3),
  },
  content: {
    padding: theme.spacing(3),
    minHeight: 400,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(3),
    paddingTop: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  button: {
    marginLeft: theme.spacing(1),
  },
}));

const STEPS = [
  'Cloud Type',
  'Project',
  'Cloud Account',
  'Profiles',
  'Profile Variables',
  'Cluster Configuration',
  'Infrastructure',
  'Review & Deploy',
];

export const ClusterDeploymentWizard = () => {
  const classes = useStyles();
  const [activeStep, setActiveStep] = useState(0);
  const [state, setState] = useState<ClusterDeploymentState>(initialDeploymentState);
  const [profileVariablesValid, setProfileVariablesValid] = useState(true);

  const handleNext = () => {
    if (activeStep < STEPS.length - 1) {
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
        return state.cloudType === 'vsphere' ? (
          <VSphereInfrastructureConfiguration
            cloudAccountUid={state.cloudAccountUid!}
            projectUid={state.projectUid!}
            controlPlaneConfig={state.controlPlaneConfig}
            workerPools={state.workerPools}
            cloudConfig={state.cloudConfig}
            tfMetadata={state.tfMetadata}
            onUpdate={(updates: any) => updateState(updates)}
          />
        ) : (
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
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Box className={classes.root}>
      <Paper>
        <Stepper activeStep={activeStep} className={classes.stepper}>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box className={classes.content}>{renderStepContent()}</Box>

        <Box className={classes.actions}>
          <Button
            disabled={activeStep === 0}
            onClick={handleBack}
            className={classes.button}
          >
            Back
          </Button>
          <Box>
            {activeStep < STEPS.length - 1 && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                disabled={!canProceed()}
                className={classes.button}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
