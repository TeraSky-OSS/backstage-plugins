import { useState } from 'react';
import { Button, Dialog, DialogBody, DialogFooter, DialogHeader, List, ListRow, Text } from '@backstage/ui';
import { RiCheckboxCircleLine, RiCloseCircleLine, RiAlertLine } from '@remixicon/react';
import type { ValidationError } from '../../api/types';

export interface ValidateButtonProps {
  onValidate: () => ValidationError[];
}

export function ValidateButton(props: ValidateButtonProps) {
  const { onValidate } = props;
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const handleValidate = () => {
    const validationErrors = onValidate();
    setErrors(validationErrors);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  const errorItems = errors.map((error, index) => ({ ...error, id: index }));

  return (
    <>
      <Button variant="secondary" iconStart={<RiCheckboxCircleLine />} onPress={handleValidate}>
        Validate
      </Button>

      <Dialog isOpen={open} onOpenChange={isOpen => !isOpen && handleClose()} width="800px">
        <DialogHeader>
          {errors.length === 0 ? 'Validation Passed' : 'Validation Results'}
        </DialogHeader>
        <DialogBody>
          {errors.length === 0 ? (
            <Text color="success">Template is valid! No errors found.</Text>
          ) : (
            <>
              <Text as="p" style={{ marginBottom: 'var(--bui-space-2)' }}>
                Found {errorCount} error(s) and {warningCount} warning(s)
              </Text>
              <List items={errorItems}>
                {item => (
                  <ListRow
                    key={item.id}
                    id={item.id}
                    textValue={item.message}
                    description={item.path}
                    icon={
                      item.severity === 'error' ? (
                        <RiCloseCircleLine color="var(--bui-fg-negative)" />
                      ) : (
                        <RiAlertLine color="var(--bui-fg-warning)" />
                      )
                    }
                  >
                    {item.message}
                  </ListRow>
                )}
              </List>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="secondary" onPress={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
