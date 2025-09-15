import React from 'react';
import { useAiRules } from '../../hooks/useAiRules';
import { InfoCard, Progress, EmptyState, MarkdownContent } from '@backstage/core-components';
import { Button, makeStyles, useTheme, Typography, Chip, Card, CardContent, Accordion, AccordionSummary, AccordionDetails, FormControlLabel, Checkbox, IconButton, Tooltip } from '@material-ui/core';
import { Entity } from '@backstage/catalog-model';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import CodeIcon from '@material-ui/icons/Code';
import LaunchIcon from '@material-ui/icons/Launch';
import { AIRuleType, AIRule, CursorRule, CopilotRule, ClineRule, ClaudeCodeRule } from '../../types';
export interface AIRulesComponentProps {
  title?: string;
}

export const isAIRulesAvailable = (entity: Entity): boolean => {
  const sourceAnnotation = entity.metadata?.annotations?.['backstage.io/source-location'] || '';
  return sourceAnnotation.startsWith('url:');
};

const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiAccordion-root': {
      marginBottom: theme.spacing(1),
      '&:before': {
        display: 'none',
      },
    },
  },
  filterSection: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
  ruleCard: {
    marginBottom: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
  },
  ruleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    width: '100%',
  },
  ruleHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    flex: 1,
  },
  ruleType: {
    textTransform: 'uppercase',
    fontWeight: 'bold',
    fontSize: '0.75rem',
  },
  ruleContent: {
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    overflow: 'auto',
    maxHeight: '300px',
    '& > *': {
      backgroundColor: 'transparent !important',
    },
  },
  ruleMetadata: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
  },
  statsContainer: {
    display: 'flex',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  statCard: {
    minWidth: '120px',
    textAlign: 'center',
  },
  emptyStateIcon: {
    fontSize: '4rem',
    color: theme.palette.grey[400],
  },
  filterContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    '& > *': {
      marginRight: theme.spacing(1),
    },
  },
  applyFilterButton: {
    marginTop: theme.spacing(1),
  },
}));

const RuleTypeIcon = ({ type }: { type: AIRuleType }) => {
  const colors = {
    [AIRuleType.CURSOR]: '#0066CC',
    [AIRuleType.COPILOT]: '#6F42C1', 
    [AIRuleType.CLINE]: '#28A745',
    [AIRuleType.CLAUDE_CODE]: '#FF6B35',
  };
  
  return <CodeIcon style={{ color: colors[type] }} />;
};

const renderFrontmatter = (theme: any, frontmatter?: Record<string, any>) => {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return null;
  }

  // Filter out fields that are already displayed elsewhere (description, globs)
  const filteredEntries = Object.entries(frontmatter).filter(([key]) => 
    !['description', 'globs'].includes(key)
  );

  if (filteredEntries.length === 0) {
    return null;
  }

  return (
    <div style={{ 
      marginBottom: '16px', 
      padding: '16px', 
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', 
      borderRadius: '8px',
      border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`
    }}>
      <Typography variant="subtitle2" style={{ 
        marginBottom: '12px', 
        fontWeight: 'bold',
        color: theme.palette.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Metadata
      </Typography>
      {filteredEntries.map(([key, value], index) => (
        <div key={key} style={{ marginBottom: index < filteredEntries.length - 1 ? '12px' : '0' }}>
          <Typography variant="body2" style={{ 
            fontWeight: 'bold',
            textTransform: 'capitalize',
            color: theme.palette.primary.main,
            marginBottom: '4px'
          }}>
            {key}:
          </Typography>
          <Typography variant="body2" style={{ 
            lineHeight: '1.5',
            marginLeft: '8px',
            color: theme.palette.text.primary
          }}>
            {Array.isArray(value) ? value.join(', ') : String(value)}
          </Typography>
        </div>
      ))}
    </div>
  );
};

// Helper function to parse cursor rule content manually
const parseCursorContent = (content: string) => {
  return manualParseFrontmatter(content);
};

// Manual frontmatter parsing as fallback
const manualParseFrontmatter = (content: string) => {
  // Check if content starts with ---
  if (!content.trim().startsWith('---')) {
    return {
      frontmatter: undefined,
      content: content
    };
  }

  try {
    // Split by lines
    const lines = content.split('\n');
    let frontmatterEndIndex = -1;
    
    // Find the closing ---
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        frontmatterEndIndex = i;
        break;
      }
    }
    
    if (frontmatterEndIndex === -1) {
      return {
        frontmatter: undefined,
        content: content
      };
    }
    
    // Extract frontmatter lines (between the --- markers)
    const frontmatterLines = lines.slice(1, frontmatterEndIndex);
    const contentLines = lines.slice(frontmatterEndIndex + 1);
    
    // Parse the YAML manually (simple key: value pairs)
    const frontmatter: Record<string, any> = {};
    for (const line of frontmatterLines) {
      const trimmedLine = line.trim();
      if (trimmedLine && trimmedLine.includes(':')) {
        const colonIndex = trimmedLine.indexOf(':');
        const key = trimmedLine.substring(0, colonIndex).trim();
        const value = trimmedLine.substring(colonIndex + 1).trim();
        frontmatter[key] = value;
      }
    }
    
    return {
      frontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : undefined,
      content: contentLines.join('\n').trim()
    };
  } catch (error) {
    return {
      frontmatter: undefined,
      content: content
    };
  }
};

const constructFileUrl = (gitUrl: string, filePath: string): string => {
  // Remove trailing slashes from gitUrl
  const cleanGitUrl = gitUrl.replace(/\/+$/, '');
  
  // For GitHub URLs, convert to blob view
  if (cleanGitUrl.includes('github.com')) {
    return `${cleanGitUrl}/blob/main/${filePath}`;
  }
  
  // For GitLab URLs, convert to blob view
  if (cleanGitUrl.includes('gitlab.com')) {
    return `${cleanGitUrl}/-/blob/main/${filePath}`;
  }
  
  // For other git providers, try generic blob URL
  return `${cleanGitUrl}/blob/main/${filePath}`;
};

const RuleComponent = ({ rule }: { rule: AIRule }) => {
  const styles = useStyles();
  const theme = useTheme();
  
  const renderCursorRule = (rule: CursorRule) => {
    // Parse the raw content to extract frontmatter and clean content
    const { frontmatter, content } = parseCursorContent(rule.content);
    
    return (
      <Accordion className={styles.ruleCard}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <div className={styles.ruleHeader}>
            <div className={styles.ruleHeaderContent}>
              <RuleTypeIcon type={rule.type} />
              <Typography variant="h6">{rule.fileName}</Typography>
              <Chip label={rule.type} size="small" className={styles.ruleType} />
              {frontmatter?.description && (
                <Typography variant="body2" style={{ marginLeft: 8, color: theme.palette.text.secondary }}>
                  {frontmatter.description}
                </Typography>
              )}
            </div>
            {rule.gitUrl && (
              <Tooltip title="Open file in repository">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(constructFileUrl(rule.gitUrl!, rule.filePath), '_blank');
                  }}
                >
                  <LaunchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </AccordionSummary>
        <AccordionDetails>
          <div>
            <div className={styles.ruleMetadata}>
              <Chip label={`Path: ${rule.filePath}`} size="small" variant="outlined" />
              {frontmatter?.globs && (
                <Chip label={`Globs: ${Array.isArray(frontmatter.globs) ? frontmatter.globs.join(', ') : frontmatter.globs}`} size="small" variant="outlined" />
              )}
            </div>
            {renderFrontmatter(theme, frontmatter)}
            <div className={styles.ruleContent}>
              <MarkdownContent content={content} />
            </div>
          </div>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderCopilotRule = (rule: CopilotRule) => {
    // Get rule number from either order (legacy) or extract from filename
    const ruleNumber = rule.order || (rule.fileName.match(/Rule (\d+)/) || [])[1] || rule.id.split('-').pop();
    
    return (
      <Accordion className={styles.ruleCard}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <div className={styles.ruleHeader}>
            <div className={styles.ruleHeaderContent}>
              <RuleTypeIcon type={rule.type} />
              <Typography variant="h6">
                {rule.title || `Copilot Rule #${ruleNumber}`}
              </Typography>
              <Chip label={rule.type} size="small" className={styles.ruleType} />
              {rule.applyTo && (
                <Chip 
                  label={`Applies to: ${rule.applyTo}`} 
                  size="small" 
                  variant="outlined" 
                  style={{ marginLeft: 8 }}
                />
              )}
            </div>
            {rule.gitUrl && (
              <Tooltip title="Open file in repository">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(constructFileUrl(rule.gitUrl!, rule.filePath), '_blank');
                  }}
                >
                  <LaunchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </AccordionSummary>
        <AccordionDetails>
          <div>
            <div className={styles.ruleMetadata}>
              <Chip label={`Path: ${rule.filePath}`} size="small" variant="outlined" />
              {rule.frontmatter && renderFrontmatter(theme, rule.frontmatter)}
            </div>
            <div className={styles.ruleContent}>
              <MarkdownContent content={rule.content} />
            </div>
          </div>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderClineRule = (rule: ClineRule) => (
    <Accordion className={styles.ruleCard}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <div className={styles.ruleHeader}>
          <div className={styles.ruleHeaderContent}>
            <RuleTypeIcon type={rule.type} />
            <Typography variant="h6">{rule.title || rule.fileName}</Typography>
            <Chip label={rule.type} size="small" className={styles.ruleType} />
          </div>
          {rule.gitUrl && (
            <Tooltip title="Open file in repository">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(constructFileUrl(rule.gitUrl!, rule.filePath), '_blank');
                }}
              >
                <LaunchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div>
          <div className={styles.ruleMetadata}>
            <Chip label={`Path: ${rule.filePath}`} size="small" variant="outlined" />
          </div>
          <div className={styles.ruleContent}>
            <MarkdownContent content={rule.content} />
          </div>
        </div>
      </AccordionDetails>
    </Accordion>
  );

  const renderClaudeCodeRule = (rule: ClaudeCodeRule) => (
    <Accordion className={styles.ruleCard}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <div className={styles.ruleHeader}>
          <div className={styles.ruleHeaderContent}>
            <RuleTypeIcon type={rule.type} />
            <Typography variant="h6">{rule.title || rule.fileName}</Typography>
            <Chip label={rule.type} size="small" className={styles.ruleType} />
          </div>
          {rule.gitUrl && (
            <Tooltip title="Open file in repository">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(constructFileUrl(rule.gitUrl!, rule.filePath), '_blank');
                }}
              >
                <LaunchIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div>
          <div className={styles.ruleMetadata}>
            <Chip label={`Path: ${rule.filePath}`} size="small" variant="outlined" />
          </div>
          <div className={styles.ruleContent}>
            <MarkdownContent content={rule.content} />
          </div>
        </div>
      </AccordionDetails>
    </Accordion>
  );

  switch (rule.type) {
    case AIRuleType.CURSOR:
      return renderCursorRule(rule as CursorRule);
    case AIRuleType.CLAUDE_CODE:
        return renderClaudeCodeRule(rule as ClaudeCodeRule);
    case AIRuleType.COPILOT:
      return renderCopilotRule(rule as CopilotRule);
    case AIRuleType.CLINE:
      return renderClineRule(rule as ClineRule);
    default:
      return null;
  }
};

export const AIRulesComponent: React.FC<AIRulesComponentProps> = ({ title = "AI Coding Rules" } = {}) => {
  const { rulesByType, loading, error, hasGitUrl, totalRules, allowedRuleTypes, selectedRuleTypes, setSelectedRuleTypes, applyFilters, resetFilters, hasUnappliedChanges, hasSearched } = useAiRules();
  const styles = useStyles();
  
  // Define the desired rendering order
  const ruleTypeDisplayOrder = [AIRuleType.CURSOR, AIRuleType.CLAUDE_CODE, AIRuleType.COPILOT, AIRuleType.CLINE];
  
  // Helper function to format rule type names for display
  const formatRuleTypeName = (type: AIRuleType): string => {
    switch (type) {
      case AIRuleType.CURSOR:
        return 'Cursor';
      case AIRuleType.CLAUDE_CODE:
        return 'Claude Code';
      case AIRuleType.COPILOT:
        return 'Copilot';
      case AIRuleType.CLINE:
        return 'Cline';
    }
  };
  const handleTypeToggle = (type: AIRuleType, checked: boolean) => {
    const newTypes = checked 
      ? [...selectedRuleTypes, type]
      : selectedRuleTypes.filter(t => t !== type);
    setSelectedRuleTypes(newTypes);
  };

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
          title="Error Loading Rules"
          description={error}
        />
      </InfoCard>
    );
  }

  return (
    <InfoCard title={title} className={styles.root}>
      <div className={styles.filterSection}>
        <Typography variant="h6" gutterBottom>
          Filter Rule Types
        </Typography>
        <div className={styles.filterContainer}>
          {allowedRuleTypes.map(type => (
            <FormControlLabel
              key={type}
              control={
                <Checkbox
                  checked={selectedRuleTypes.includes(type)}
                  onChange={(e) => handleTypeToggle(type, e.target.checked)}
                />
              }
              label={formatRuleTypeName(type)}
            />
          ))}
        </div>
        <div className={styles.applyFilterButton}>
          <Button
            variant="contained"
            color="primary"
            onClick={applyFilters}
            disabled={!hasUnappliedChanges}
          >
            Apply Filter
          </Button>
          {hasUnappliedChanges && (
            <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
              You have unsaved filter changes. Click "Apply Filter" to update the results.
            </Typography>
          )}
          {!hasUnappliedChanges && selectedRuleTypes.length === 0 && (
            <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
              Select at least one rule type to search for AI rules.
            </Typography>
          )}
        </div>
      </div>

      {hasSearched && totalRules === 0 ? (
        <EmptyState
          missing="content"
          title="No AI Rules Found"
          description="No AI rules were found in this repository for the selected rule types."
          action={
            <Button
              variant="outlined"
              onClick={resetFilters}
            >
              Reset Filters
            </Button>
          }
        />
      ) : totalRules > 0 ? (
        <>
          <div className={styles.statsContainer}>
            <Card className={styles.statCard}>
              <CardContent>
                <Typography variant="h4">{totalRules}</Typography>
                <Typography color="textSecondary">Total Rules</Typography>
              </CardContent>
            </Card>
            {ruleTypeDisplayOrder.map(type => {
              const typeRules = rulesByType[type] || [];
              if (typeRules.length === 0) return null;
              return (
                <Card key={type} className={styles.statCard}>
                  <CardContent>
                    <Typography variant="h4">{typeRules.length}</Typography>
                    <Typography color="textSecondary">{formatRuleTypeName(type)}</Typography>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {ruleTypeDisplayOrder.map(type => {
            const typeRules = rulesByType[type] || [];
            if (typeRules.length === 0) return null;
            return (
              <div key={type}>
                <Typography variant="h5" gutterBottom style={{ marginTop: 16 }}>
                  {formatRuleTypeName(type)} Rules ({typeRules.length})
                </Typography>
                {typeRules.map(rule => (
                  <RuleComponent key={rule.id} rule={rule} />
                ))}
              </div>
            );
          })}
        </>
      ) : (
        <div style={{ marginTop: 16 }}>
          <Typography variant="body1" color="textSecondary">
            Select rule types above and click "Apply Filter" to search for AI coding rules in this repository.
          </Typography>
        </div>
      )}
    </InfoCard>
  );
};