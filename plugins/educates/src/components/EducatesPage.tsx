import { useEffect, useState } from 'react';
import { Grid, Link, Text } from '@backstage/ui';
import { WorkshopCard } from './WorkshopCard';
import { TrainingPortalHeader } from './TrainingPortalHeader';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { educatesApiRef } from '../api/EducatesClient';
import {
  WorkshopsCatalogResponse,
  TrainingPortalInfo,
  portalViewPermission,
} from '@terasky/backstage-plugin-educates-common';
import {
  Progress,
  ErrorPanel,
  Page,
  Content,
  InfoCard,
} from '@backstage/core-components';
import { usePermission } from '@backstage/plugin-permission-react';
import { RiHomeLine, RiBookLine, RiCompassLine, RiGithubLine } from '@remixicon/react';
import styles from './EducatesPage.module.css';

interface PortalData extends WorkshopsCatalogResponse {
  configName: string;
}

const EDUCATES_LINKS = [
  {
    href: 'https://educates.dev',
    label: 'Educates Homepage',
    Icon: RiHomeLine,
  },
  {
    href: 'https://docs.educates.dev/en/stable',
    label: 'Educates Documentation',
    Icon: RiBookLine,
  },
  {
    href: 'https://hub.educates.dev/?type=Workshop',
    label: 'Educates Hub',
    Icon: RiCompassLine,
  },
  {
    href: 'https://github.com/educates/educates-training-platform',
    label: 'Educates GitHub Repository',
    Icon: RiGithubLine,
  },
];

export const EducatesPage = () => {
  const config = useApi(configApiRef);
  const educatesApi = useApi(educatesApiRef);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [portalsData, setPortalsData] = useState<PortalData[]>([]);

  // Get configured training portals
  const trainingPortals = config.getConfigArray('educates.trainingPortals').map(portal => ({
    name: portal.getString('name'),
    url: portal.getString('url'),
  })) as TrainingPortalInfo[];

  // Check if permissions are enabled
  const enablePermissions = config.getOptionalBoolean('educates.enablePermissions') ?? false;

  // Check permissions for each portal using conditional permissions
  const portalPermissions = trainingPortals.map(portal => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { allowed: canView, loading: viewLoading } = usePermission({
      permission: portalViewPermission,
      resourceRef: portal.name,
    });

    return {
      portalName: portal.name,
      canView: enablePermissions ? canView : true,
      loading: viewLoading,
    };
  });

  useEffect(() => {
    const fetchWorkshops = async () => {
      try {
        const results = await Promise.all(
          trainingPortals
            .filter(portal =>
              !enablePermissions || portalPermissions.find(p => p.portalName === portal.name)?.canView
            )
            .map(async portal => {
              const response = await educatesApi.getWorkshops(portal.name);
              return {
                ...response,
                configName: portal.name,
              };
            }),
        );
        setPortalsData(results);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if all permission checks are done
    if (!portalPermissions.some(p => p.loading)) {
      fetchWorkshops();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, educatesApi, portalPermissions, enablePermissions]);

  const handleStartWorkshop = async (
    portalName: string,
    workshopEnvName: string,
  ) => {
    try {
      const session = await educatesApi.requestWorkshop(
        portalName,
        workshopEnvName,
        true, // Always open in new tab
      );

      if (session.url) {
        window.open(session.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err as Error);
    }
  };

  const Footer = () => (
    <div className={styles.footer}>
      <div className={styles.footerLinks}>
        {EDUCATES_LINKS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );

  if (loading || portalPermissions.some(p => p.loading)) {
    return <Progress />;
  }

  if (error) {
    return <ErrorPanel error={error} />;
  }

  if (portalsData.length === 0) {
    return (
      <Page themeId="tool">
        <Content className={styles.content}>
          <div className={styles.mainContent}>
            <InfoCard>
              <Text>
                {enablePermissions
                  ? 'No training portals available or you don\'t have permission to view any portals.'
                  : 'No training portals available.'}
              </Text>
            </InfoCard>
          </div>
          <Footer />
        </Content>
      </Page>
    );
  }

  return (
    <Page themeId="tool">
      <Content className={styles.content}>
        <div className={styles.mainContent}>
          <Grid.Root columns="12" gap="5">
            {portalsData.map(portalData => (
              <Grid.Item key={portalData.portal.name} colSpan="12">
                <TrainingPortalHeader
                  portal={portalData.portal}
                  workshopCount={portalData.workshops.length}
                >
                  <Grid.Root columns="12" gap="5" style={{ marginTop: 'var(--bui-space-2)' }}>
                    {portalData.workshops.map(workshop => (
                      <Grid.Item key={workshop.name} colSpan={{ xs: '12', sm: '6', md: '4' }}>
                        <WorkshopCard
                          workshop={workshop}
                          portalName={portalData.configName}
                          onStartWorkshop={() =>
                            handleStartWorkshop(
                              portalData.configName,
                              workshop.environment.name,
                            )
                          }
                          enablePermissions={enablePermissions}
                        />
                      </Grid.Item>
                    ))}
                  </Grid.Root>
                </TrainingPortalHeader>
              </Grid.Item>
            ))}
          </Grid.Root>
        </div>
        <Footer />
      </Content>
    </Page>
  );
};
