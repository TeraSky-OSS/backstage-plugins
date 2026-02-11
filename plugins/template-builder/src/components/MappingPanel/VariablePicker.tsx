import {
  TextField,
  ListSubheader,
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';

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

  const selectedVariable = variables.find(v => v.value === value);

  return (
    <Autocomplete
      options={variables}
      groupBy={option => option.group}
      getOptionLabel={option => option.label}
      value={selectedVariable || null}
      onChange={(_event, newValue) => {
        if (newValue) {
          onChange(newValue.value);
        }
      }}
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          variant="outlined"
          size="small"
        />
      )}
      renderGroup={params => (
        <li key={params.key}>
          <ListSubheader component="div">{params.group}</ListSubheader>
          {params.children}
        </li>
      )}
    />
  );
}
