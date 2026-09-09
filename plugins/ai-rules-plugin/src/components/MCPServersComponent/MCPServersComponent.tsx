import { Fragment } from 'react';
import {
  InfoCard,
  Progress,
  EmptyState,
  CodeSnippet,
} from '@backstage/core-components';
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Badge,
  Flex,
  Text,
} from '@backstage/ui';
import { MCPServerInfo } from '../../types/mcp';
import { useMCPServers } from '../../hooks/useMCPServers';
import styles from './MCPServersComponent.module.css';

export interface MCPServersComponentProps {
  title?: string;
}

export const MCPServersComponent = ({ title = "MCP Servers" }: MCPServersComponentProps) => {
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
      case 'vscode': return 'VSCode';
      case 'cursor': return 'Cursor';
      case 'claude': return 'Claude';
      case 'windsurf': return 'Windsurf';
      case 'cline': return 'Cline';
      default: return source;
    }
  };

  return (
    <InfoCard title={title}>
      {Object.entries(serversBySource).map(([source, sourceServers]) => (
        <div key={source} className={styles.sourceAccordion}>
          <Accordion>
            <AccordionTrigger>
              <Flex align="center" gap="4" style={{ width: '100%' }}>
                <Text variant="title-small" weight="bold">
                  {formatSourceName(source)} MCP Servers
                </Text>
                <Badge>{`${sourceServers.length} server${sourceServers.length !== 1 ? 's' : ''}`}</Badge>
              </Flex>
            </AccordionTrigger>
            <AccordionPanel>
              <div className={styles.serversList}>
                {sourceServers.map((server) => (
                  <div key={server.name} className={styles.serverAccordion}>
                    <Accordion>
                      <AccordionTrigger>
                        <Flex align="center" gap="4" style={{ width: '100%', flexWrap: 'wrap' }}>
                          <Text weight="bold">{server.name}</Text>
                          <Badge>{server.type}</Badge>
                          {server.config.command && (
                            <Badge>{`${server.config.command}`}</Badge>
                          )}
                        </Flex>
                      </AccordionTrigger>
                      <AccordionPanel>
                        <div className={styles.serverContent}>
                          {server.config.command && (
                            <div>
                              <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginBottom: 'var(--bui-space-1)' }}>Command</Text>
                              <div className={styles.commandContainer}>
                                {server.config.command} {server.config.args?.join(' ')}
                              </div>
                            </div>
                          )}
                          <div className={styles.detailsContainer}>
                            <div>
                              {server.config.env && Object.keys(server.config.env).length > 0 && (
                                <>
                                  <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginBottom: 'var(--bui-space-1)' }}>Environment Variables</Text>
                                  <div className={styles.envContainer}>
                                    <div className={styles.envGrid}>
                                      {Object.entries(server.config.env).map(([key, value]) => (
                                        <Fragment key={key}>
                                          <Text className={styles.envKey}>{key}</Text>
                                          <Text className={styles.envValue}>{value}</Text>
                                        </Fragment>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                            <div>
                              <Text variant="body-small" style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginBottom: 'var(--bui-space-1)' }}>Raw Configuration</Text>
                              <div className={styles.rawConfig}>
                                <CodeSnippet text={server.rawConfig} language="json" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionPanel>
                    </Accordion>
                  </div>
                ))}
              </div>
            </AccordionPanel>
          </Accordion>
        </div>
      ))}
    </InfoCard>
  );
};
