import React from 'react';
import {
  InfoCard,
  Progress,
  EmptyState,
  CodeSnippet,
} from '@backstage/core-components';
import {
  makeStyles,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@material-ui/core';
import { Theme } from '@material-ui/core/styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { MCPServerInfo } from '../../types/mcp';
import { useMCPServers } from '../../hooks/useMCPServers';

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    '& .MuiAccordion-root': {
      marginBottom: theme.spacing(1),
      '&:before': {
        display: 'none',
      },
    },
  },
  sourceAccordion: {
    backgroundColor: theme.palette.background.default,
    marginBottom: theme.spacing(2),
    width: '100%',
    '& .MuiAccordionSummary-root': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    '& .MuiAccordionDetails-root': {
      padding: theme.spacing(2),
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing(2),
    },
  },
  serversList: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    width: '100%',
  },
  serverAccordion: {
    backgroundColor: theme.palette.background.paper,
    width: '100%',
    '& .MuiAccordionSummary-root': {
      minHeight: '48px',
      '&.Mui-expanded': {
        minHeight: '48px',
      },
    },
    '& .MuiAccordionSummary-content': {
      margin: '12px 0',
      '&.Mui-expanded': {
        margin: '12px 0',
      },
    },
    '& .MuiAccordionDetails-root': {
      padding: theme.spacing(3),
    },
  },
  envContainer: {
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
  },
  envGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: theme.spacing(1),
    alignItems: 'center',
  },
  envKey: {
    fontWeight: 'bold',
    color: theme.palette.text.secondary,
    padding: theme.spacing(0.5, 1),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.875rem',
  },
  envValue: {
    wordBreak: 'break-word',
    padding: theme.spacing(0.5, 1),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    fontSize: '0.875rem',
  },
  rawConfig: {
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    '& pre': {
      margin: 0,
    },
  },
  sectionTitle: {
    marginBottom: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  serverContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
    width: '100%',
  },
  commandContainer: {
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    overflowX: 'auto',
    whiteSpace: 'pre',
  },
  detailsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: theme.spacing(3),
  },
}));


export interface MCPServersComponentProps {
  title?: string;
}

export const MCPServersComponent = ({ title = "MCP Servers" }: MCPServersComponentProps) => {
  const styles = useStyles();
  const { servers, loading, error, hasGitUrl } = useMCPServers();

  if (loading) {
    return (
      <InfoCard title={title}>
        <Progress />
      </InfoCard>
    );
  }

  if (!hasGitUrl) {
    return (
      <InfoCard title={title}>
        <EmptyState
          missing="content"
          title="No Git Repository"
          description="This component doesn't have a Git source URL configured."
        />
      </InfoCard>
    );
  }

  if (error) {
    return (
      <InfoCard title={title}>
        <EmptyState
          missing="content"
          title="Error Loading MCP Servers"
          description={error}
        />
      </InfoCard>
    );
  }

  if (servers.length === 0) {
    return (
      <InfoCard title={title}>
        <EmptyState
          missing="content"
          title="No MCP Servers Found"
          description="No MCP server configurations were found in this repository."
        />
      </InfoCard>
    );
  }

  // Group servers by source
  const serversBySource = servers.reduce((acc, server) => {
    const source = server.source;
    if (!acc[source]) {
      acc[source] = [];
    }
    acc[source].push(server);
    return acc;
  }, {} as Record<string, MCPServerInfo[]>);

  const formatSourceName = (source: string) => {
    switch (source) {
      case 'vscode':
        return 'VSCode';
      case 'cursor':
        return 'Cursor';
      case 'claude':
        return 'Claude';
      default:
        return source;
    }
  };

  return (
    <InfoCard title={title} className={styles.root}>
      {Object.entries(serversBySource).map(([source, sourceServers]) => (
        <Accordion key={source} defaultExpanded={false} className={styles.sourceAccordion}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px' }}>
              <Typography variant="h6">
                {formatSourceName(source)} MCP Servers
              </Typography>
              <Chip
                label={`${sourceServers.length} server${sourceServers.length !== 1 ? 's' : ''}`}
                size="small"
                color="primary"
              />
            </div>
          </AccordionSummary>
          <AccordionDetails>
            <div className={styles.serversList}>
              {sourceServers.map((server) => (
                <Accordion key={server.name} className={styles.serverAccordion}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px' }}>
                    <Typography variant="subtitle1">{server.name}</Typography>
                    <Chip 
                      label={server.type} 
                      size="small" 
                      color={server.type === 'local' ? 'default' : 'secondary'}
                      variant="outlined"
                    />
                    {server.config.command && (
                      <Chip 
                        label={`${server.config.command}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </div>
                </AccordionSummary>
                <AccordionDetails>
                  <div className={styles.serverContent}>
                    {server.config.command && (
                      <div>
                        <Typography variant="subtitle2" className={styles.sectionTitle}>Command</Typography>
                        <div className={styles.commandContainer}>
                          {server.config.command} {server.config.args?.join(' ')}
                        </div>
                      </div>
                    )}
                    <div className={styles.detailsContainer}>
                      <div>
                        {server.config.env && Object.keys(server.config.env).length > 0 && (
                          <>
                            <Typography variant="subtitle2" className={styles.sectionTitle}>Environment Variables</Typography>
                            <div className={styles.envContainer}>
                              <div className={styles.envGrid}>
                                {Object.entries(server.config.env).map(([key, value]) => (
                                  <React.Fragment key={key}>
                                    <Typography className={styles.envKey}>{key}</Typography>
                                    <Typography className={styles.envValue}>{value}</Typography>
                                  </React.Fragment>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <div>
                        <Typography variant="subtitle2" className={styles.sectionTitle}>Raw Configuration</Typography>
                        <div className={styles.rawConfig}>
                          <CodeSnippet text={server.rawConfig} language="json" />
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionDetails>
              </Accordion>
            ))}
            </div>
          </AccordionDetails>
        </Accordion>
      ))}
    </InfoCard>
  );
};
