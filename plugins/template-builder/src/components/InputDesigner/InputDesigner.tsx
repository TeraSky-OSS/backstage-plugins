import { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import type { ParameterStep, FieldDefinition } from '../../types';
import { ParameterList } from './ParameterList';
import { FieldPropertiesForm } from './FieldPropertiesForm';

const useStyles = makeStyles(theme => ({
  root: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabs: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  contentInner: {
    flex: 1,
    overflow: 'auto',
    minHeight: 0,
  },
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(4),
    color: theme.palette.text.secondary,
  },
}));

export interface InputDesignerProps {
  parameters: ParameterStep[];
  selectedField?: { stepIndex: number; fieldName: string };
  fieldExtensions: string[];
  onAddStep: (step: ParameterStep) => void;
  onUpdateStep: (index: number, step: Partial<ParameterStep>) => void;
  onDeleteStep: (index: number) => void;
  onAddField: (stepIndex: number, fieldName: string, field: FieldDefinition) => void;
  onUpdateField: (stepIndex: number, fieldName: string, updates: Partial<FieldDefinition>) => void;
  onDeleteField: (stepIndex: number, fieldName: string) => void;
  onSelectField: (stepIndex: number, fieldName: string) => void;
}

export function InputDesigner(props: InputDesignerProps) {
  const {
    parameters,
    fieldExtensions,
    onAddStep,
    onUpdateStep,
    onDeleteStep,
    onAddField,
    onUpdateField,
    onDeleteField,
  } = props;
  
  const classes = useStyles();
  const [currentStep, setCurrentStep] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<{ 
    stepIndex: number; 
    fieldName: string; 
    field: FieldDefinition 
  } | null>(null);

  const handleAddStep = () => {
    const newStep: ParameterStep = {
      id: `step-${parameters.length + 1}`,
      title: `Step ${parameters.length + 1}`,
      properties: {},
      required: [],
    };
    onAddStep(newStep);
    setCurrentStep(parameters.length);
  };

  const handleDeleteStep = (index: number) => {
    onDeleteStep(index);
    if (currentStep >= parameters.length - 1) {
      setCurrentStep(Math.max(0, currentStep - 1));
    }
  };

  const handleAddField = () => {
    const fieldName = `field_${Object.keys(parameters[currentStep].properties).length + 1}`;
    const newField: FieldDefinition = {
      title: 'New Field',
      type: 'string',
    };
    onAddField(currentStep, fieldName, newField);
    
    // Open edit dialog
    setEditingField({ stepIndex: currentStep, fieldName, field: newField });
    setEditDialogOpen(true);
  };

  const handleEditField = (stepIndex: number, fieldName: string) => {
    const field = parameters[stepIndex].properties[fieldName];
    setEditingField({ stepIndex, fieldName, field });
    setEditDialogOpen(true);
  };

  const handleSaveField = () => {
    if (editingField) {
      onUpdateField(editingField.stepIndex, editingField.fieldName, editingField.field);
    }
    setEditDialogOpen(false);
    setEditingField(null);
  };

  const currentStepData = parameters[currentStep];

  return (
    <Box className={classes.root}>
      {parameters.length > 0 ? (
        <>
          <Tabs
            value={currentStep}
            onChange={(_, newValue) => setCurrentStep(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            className={classes.tabs}
          >
            {parameters.map((step, index) => (
              <Tab
                key={step.id}
                label={
                  <Box display="flex" alignItems="center">
                    {step.title}
                    {parameters.length > 1 && (
                      <Box
                        component="span"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteStep(index);
                        }}
                        style={{ 
                          marginLeft: 8, 
                          cursor: 'pointer', 
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </Box>
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>

          <Box className={classes.content}>
            <Box p={2} display="flex" justifyContent="space-between" borderBottom="1px solid rgba(0, 0, 0, 0.12)">
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddField}
                variant="outlined"
                color="primary"
              >
                Add Field
              </Button>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddStep}
                variant="outlined"
              >
                Add Step
              </Button>
            </Box>

            <Box className={classes.contentInner}>
              <ParameterList
                step={currentStepData}
                stepIndex={currentStep}
                selectedField={undefined}
                onSelectField={fieldName => handleEditField(currentStep, fieldName)}
                onDeleteField={fieldName => onDeleteField(currentStep, fieldName)}
                onUpdateStep={updates => onUpdateStep(currentStep, updates)}
              />
            </Box>
          </Box>
        </>
      ) : (
        <Box className={classes.emptyState}>
          <Typography variant="body1" gutterBottom>
            No parameter steps defined
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddStep}
          >
            Add First Step
          </Button>
        </Box>
      )}

      {/* Field Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Field Properties</DialogTitle>
        <DialogContent>
          {editingField && (
            <FieldPropertiesForm
              field={editingField.field}
              fieldName={editingField.fieldName}
              fieldExtensions={fieldExtensions}
              onUpdate={updates => {
                setEditingField({
                  ...editingField,
                  field: { ...editingField.field, ...updates },
                });
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveField} color="primary" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
