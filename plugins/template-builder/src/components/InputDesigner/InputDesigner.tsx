import { useState } from 'react';
import {
  Box,
  Button,
  ButtonIcon,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  Flex,
  Tab,
  TabList,
  Tabs,
  Text,
} from '@backstage/ui';
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react';
import type { ParameterStep, FieldDefinition } from '../../types';
import { ParameterList } from './ParameterList';
import { FieldPropertiesForm } from './FieldPropertiesForm';

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
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {parameters.length > 0 ? (
        <>
          <Tabs
            selectedKey={String(currentStep)}
            onSelectionChange={key => setCurrentStep(Number(key))}
          >
            <TabList>
              {parameters.map((step, index) => (
                <Tab key={step.id} id={String(index)}>
                  {step.title}
                </Tab>
              ))}
            </TabList>
          </Tabs>

          <Box style={{ flex: 1, overflow: 'hidden', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <Flex
              justify="between"
              align="center"
              p="2"
              style={{ borderBottom: '1px solid var(--bui-border-1)' }}
            >
              <Flex gap="2">
                <Button
                  size="small"
                  iconStart={<RiAddLine />}
                  onPress={handleAddField}
                  variant="secondary"
                >
                  Add Field
                </Button>
                <Button
                  size="small"
                  iconStart={<RiAddLine />}
                  onPress={handleAddStep}
                  variant="secondary"
                >
                  Add Step
                </Button>
              </Flex>
              {parameters.length > 1 && (
                <ButtonIcon
                  aria-label={`Delete step ${currentStepData.title}`}
                  icon={<RiDeleteBinLine />}
                  size="small"
                  variant="tertiary"
                  onPress={() => handleDeleteStep(currentStep)}
                />
              )}
            </Flex>

            <Box style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
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
        <Box style={{ textAlign: 'center', padding: 'var(--bui-space-4)' }}>
          <Text as="div" variant="body-medium" color="secondary">
            No parameter steps defined
          </Text>
          <Box mt="2">
            <Button variant="primary" iconStart={<RiAddLine />} onPress={handleAddStep}>
              Add First Step
            </Button>
          </Box>
        </Box>
      )}

      {/* Field Edit Dialog */}
      <Dialog isOpen={editDialogOpen} onOpenChange={open => !open && setEditDialogOpen(false)}>
        <DialogHeader>
          <Text variant="title-small" weight="bold">Edit Field Properties</Text>
        </DialogHeader>
        <DialogBody>
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
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onPress={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onPress={handleSaveField} variant="primary">
            Save
          </Button>
        </DialogFooter>
      </Dialog>
    </Box>
  );
}
