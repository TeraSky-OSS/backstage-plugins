import { useEffect, useState } from 'react';
import { Grid, Typography, makeStyles, Link, IconButton, Tooltip } from '@material-ui/core';
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
  Header,
  Page,
  Content,
  InfoCard,
} from '@backstage/core-components';
import { usePermission } from '@backstage/plugin-permission-react';
import HomeIcon from '@material-ui/icons/Home';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import ExploreIcon from '@material-ui/icons/Explore';
import GitHubIcon from '@material-ui/icons/GitHub';

const useStyles = makeStyles(theme => ({
  content: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 'calc(100vh - 200px)', // Account for header and other elements
  },
  mainContent: {
    flex: 1,
  },
  footer: {
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(3),
    marginTop: theme.spacing(4),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: theme.spacing(4),
  },
  footerLink: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    color: theme.palette.text.secondary,
    textDecoration: 'none',
    '&:hover': {
      color: theme.palette.primary.main,
      textDecoration: 'none',
    },
  },
  footerIcon: {
    fontSize: '1.2rem',
  },
  headerLinks: {
    display: 'flex',
    gap: theme.spacing(1),
  },
  headerIcon: {
    color: theme.palette.common.white,
  },
}));

interface PortalData extends WorkshopsCatalogResponse {
  configName: string;
}

const EDUCATES_LINKS = [
  {
    href: 'https://educates.dev',
    label: 'Educates Homepage',
    Icon: HomeIcon,
  },
  {
    href: 'https://docs.educates.dev/en/stable',
    label: 'Educates Documentation',
    Icon: MenuBookIcon,
  },
  {
    href: 'https://hub.educates.dev/?type=Workshop',
    label: 'Educates Hub',
    Icon: ExploreIcon,
  },
  {
    href: 'https://github.com/educates/educates-training-platform',
    label: 'Educates GitHub Repository',
    Icon: GitHubIcon,
  },
];

export const EducatesPage = () => {
  const classes = useStyles();
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

  const HeaderLinks = () => (
    <div className={classes.headerLinks}>
      {EDUCATES_LINKS.map(({ href, label, Icon }) => (
        <Tooltip key={href} title={label}>
          <IconButton
            component={Link}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={classes.headerIcon}
          >
            <Icon />
          </IconButton>
        </Tooltip>
      ))}
    </div>
  );

  const Footer = () => (
    <div className={classes.footer}>
      <div className={classes.footerLinks}>
        {EDUCATES_LINKS.map(({ href, label, Icon }) => (
          <Link 
            key={href}
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className={classes.footerLink}
          >
            <Icon className={classes.footerIcon} />
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
        <Header title="Educates Workshops" subtitle="Browse and access available workshops from Educates training portals">
          <HeaderLinks />
        </Header>
        <Content className={classes.content}>
          <div className={classes.mainContent}>
            <InfoCard>
              <Typography>
                {enablePermissions 
                  ? 'No training portals available or you don\'t have permission to view any portals.'
                  : 'No training portals available.'}
              </Typography>
            </InfoCard>
          </div>
          <Footer />
        </Content>
      </Page>
    );
  }

  return (
    <Page themeId="tool">
      <Header title="Educates Workshops" subtitle="Browse and access available workshops from Educates training portals">
        <HeaderLinks />
      </Header>
      <Content className={classes.content}>
        <div className={classes.mainContent}>
          <Grid container spacing={3}>
            {portalsData.map(portalData => {
              return (
                <Grid key={portalData.portal.name} item xs={12}>
                  <TrainingPortalHeader 
                    portal={portalData.portal} 
                    workshopCount={portalData.workshops.length}
                  >
                    <Grid container spacing={3} style={{ marginTop: '8px' }}>
                      {portalData.workshops.map(workshop => (
                        <Grid key={workshop.name} item xs={12} sm={6} md={4}>
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
                        </Grid>
                      ))}
                    </Grid>
                  </TrainingPortalHeader>
                </Grid>
              );
            })}
          </Grid>
        </div>
        <Footer />
      </Content>
    </Page>
  );
}; 