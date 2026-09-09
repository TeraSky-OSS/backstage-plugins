import { Box, ButtonIcon, Flex, Text } from '@backstage/ui';
import { TrainingPortalStatus } from '@terasky/backstage-plugin-educates-common';
import { InfoCard } from '@backstage/core-components';
import { RiArrowDownSLine, RiArrowUpSLine } from '@remixicon/react';
import { useState } from 'react';
import styles from './TrainingPortalHeader.module.css';

interface TrainingPortalHeaderProps {
  portal: TrainingPortalStatus;
  workshopCount: number;
  children?: React.ReactNode;
}

export const TrainingPortalHeader = ({ portal, workshopCount, children }: TrainingPortalHeaderProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <InfoCard>
      <Box p="4">
        <div
          className={styles.headerContainer}
          onClick={toggleExpanded}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              toggleExpanded();
            }
          }}
        >
          {portal.logo && (
            <img
              src={portal.logo}
              alt={`${portal.name} logo`}
              className={styles.logo}
            />
          )}
          <Box className={styles.titleSection}>
            <Flex align="baseline" gap="2">
              <Text variant="title-small" weight="bold">
                {portal.title || portal.name}
              </Text>
              <Text style={{ color: 'var(--bui-fg-secondary)' }}>
                ({workshopCount} workshop{workshopCount !== 1 ? 's' : ''})
              </Text>
            </Flex>
            <Text style={{ color: 'var(--bui-fg-secondary)', display: 'block' }}>
              Active Sessions: {portal.sessions.allocated} / {portal.sessions.maximum || 'Unlimited'}
            </Text>
          </Box>
          <ButtonIcon
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            variant="tertiary"
            icon={isExpanded ? <RiArrowUpSLine /> : <RiArrowDownSLine />}
            onPress={toggleExpanded}
          />
        </div>

        {isExpanded && (
          <Box className={styles.contentSection}>
            {Object.entries(portal.labels).length > 0 && (
              <>
                <Box className={styles.labelContainer}>
                  {Object.entries(portal.labels).map(([key, value]) => (
                    <Text key={key} style={{ color: 'var(--bui-fg-secondary)' }}>
                      {key}: {value}
                    </Text>
                  ))}
                </Box>
                <hr style={{ margin: 'var(--bui-space-4) 0', border: 'none', borderTop: '1px solid var(--bui-border-1)' }} />
              </>
            )}
            {children}
          </Box>
        )}
      </Box>
    </InfoCard>
  );
};
