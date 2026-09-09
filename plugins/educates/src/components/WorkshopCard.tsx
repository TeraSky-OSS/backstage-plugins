import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Text,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import {
  Workshop,
  workshopStartPermission,
} from '@terasky/backstage-plugin-educates-common';
import { Progress } from '@backstage/core-components';
import { usePermission } from '@backstage/plugin-permission-react';
import { RiBriefcase4Line, RiTimeLine, RiGraduationCapLine, RiExternalLinkLine } from '@remixicon/react';
import styles from './WorkshopCard.module.css';

interface WorkshopCardProps {
  workshop: Workshop;
  portalName: string;
  onStartWorkshop: () => void;
  enablePermissions: boolean;
}

export const WorkshopCard = ({ workshop, portalName, onStartWorkshop, enablePermissions }: WorkshopCardProps) => {
  const available = workshop.environment.capacity - workshop.environment.allocated;
  const hasCapacity = available > 0;

  // Check permission to start this specific workshop
  const { allowed: canStart, loading: permissionLoading } = usePermission({
    permission: workshopStartPermission,
    resourceRef: `${portalName}:${workshop.name}`,
  });

  const canStartWorkshop = enablePermissions ? canStart : true;

  const getStartButtonTooltip = () => {
    if (enablePermissions && !canStart) {
      return 'You do not have permission to start this workshop';
    }
    if (!hasCapacity) {
      return 'No available capacity for this workshop';
    }
    return '';
  };

  if (permissionLoading) {
    return (
      <Card className={styles.card}>
        <CardBody>
          <Progress />
        </CardBody>
      </Card>
    );
  }

  const startButtonTooltip = getStartButtonTooltip();
  const startButton = (
    <Button
      variant="primary"
      isDisabled={!hasCapacity || !canStartWorkshop}
      onPress={onStartWorkshop}
      iconEnd={<RiExternalLinkLine />}
    >
      Start Workshop
    </Button>
  );

  return (
    <Card className={styles.card}>
      <CardHeader>
        <Text weight="bold" variant="title-small">{workshop.title}</Text>
        <Text style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginBottom: 'var(--bui-space-2)' }}>
          {workshop.name}
        </Text>
        <Box className={styles.chipContainer}>
          {workshop.vendor && (
            <Badge icon={<RiBriefcase4Line />}>{workshop.vendor}</Badge>
          )}
          {workshop.difficulty && (
            <Badge icon={<RiGraduationCapLine />}>{workshop.difficulty}</Badge>
          )}
          {workshop.duration && (
            <Badge icon={<RiTimeLine />}>{workshop.duration}</Badge>
          )}
        </Box>
        {workshop.tags.length > 0 && (
          <Box className={`${styles.chipContainer} ${styles.tagChips}`}>
            {workshop.tags.map((tag: string) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </Box>
        )}
      </CardHeader>
      <CardBody className={styles.content}>
        <Text className={styles.description} style={{ color: 'var(--bui-fg-secondary)', display: 'block' }}>
          {workshop.description}
        </Text>
        <Box>
          <Text style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>
            Available: {available} / {workshop.environment.capacity}
          </Text>
          <Progress
            value={(workshop.environment.allocated / workshop.environment.capacity) * 100}
            variant="determinate"
          />
        </Box>
      </CardBody>
      <CardFooter>
        {startButtonTooltip ? (
          <TooltipTrigger>
            {startButton}
            <Tooltip>{startButtonTooltip}</Tooltip>
          </TooltipTrigger>
        ) : (
          startButton
        )}
      </CardFooter>
    </Card>
  );
};
