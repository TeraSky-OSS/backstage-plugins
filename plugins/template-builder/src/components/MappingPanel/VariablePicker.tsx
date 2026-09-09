import { Combobox } from '@backstage/ui';
import type { Key } from 'react';

export interface Variable {
  label: string;
  value: string;
  group: string;
}

export interface VariablePickerProps {
  variables: Variable[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function VariablePicker(props: VariablePickerProps) {
  const {
    variables,
    value,
    onChange,
    label = 'Select Variable',
    placeholder = 'Choose a variable...',
  } = props;

  const groups = new Map<string, Variable[]>();
  for (const variable of variables) {
    const group = groups.get(variable.group) ?? [];
    group.push(variable);
    groups.set(variable.group, group);
  }
  const options = Array.from(groups.entries()).map(([title, groupVariables]) => ({
    title,
    options: groupVariables.map(v => ({ id: v.value, label: v.label })),
  }));

  return (
    <Combobox
      options={options}
      label={label}
      placeholder={placeholder}
      selectedKey={value ?? null}
      onSelectionChange={(key: Key | null) => {
        if (key !== null) {
          onChange(String(key));
        }
      }}
    />
  );
}
