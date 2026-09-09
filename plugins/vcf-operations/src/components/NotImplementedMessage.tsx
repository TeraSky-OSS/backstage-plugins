import { FC } from 'react';
import { Alert, Badge, Box, Card, CardBody, CardHeader, Flex, Text } from '@backstage/ui';
import { RiTimeLine } from '@remixicon/react';

interface NotImplementedMessageProps {
  entityType: string;
  entityKind?: string;
  reason: string;
}

export const NotImplementedMessage: FC<NotImplementedMessageProps> = ({
  entityType,
  entityKind,
  reason,
}) => {
  return (
    <Box p="4">
      <Alert
        status="info"
        title="VCF Operations Metrics - Coming Soon"
        description={
          <>
            Metrics support for <strong>{entityType}</strong>
            {entityKind && (
              <>
                {' '}of kind <strong>{entityKind}</strong>
              </>
            )} is currently being developed and will be available in an upcoming release.
          </>
        }
      />

      <Card style={{ marginTop: 'var(--bui-space-4)', textAlign: 'center' }}>
        <CardHeader>
          <Flex align="center" justify="center" gap="2">
            <RiTimeLine size={32} style={{ color: 'var(--bui-fg-secondary)' }} />
            <Text weight="bold">Feature In Development</Text>
          </Flex>
        </CardHeader>
        <CardBody>
          <Text style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginBottom: 'var(--bui-space-2)' }}>
            {reason}
          </Text>
          <Badge icon={<RiTimeLine />}>Coming Soon</Badge>
        </CardBody>
      </Card>
    </Box>
  );
};
