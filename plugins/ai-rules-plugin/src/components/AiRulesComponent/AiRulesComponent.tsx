import React, { useState, useCallback, useMemo } from 'react';
import { useAiRules } from '../../hooks/useAiRules';
import { InfoCard, Progress, EmptyState, MarkdownContent, CodeSnippet } from '@backstage/core-components';
import {
  Button,
  makeStyles,
  useTheme,
  Typography,
  Chip,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  IconButton,
  Tooltip,
  TextField,
  Snackbar,
} from '@material-ui/core';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import { Entity } from '@backstage/catalog-model';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import CodeIcon from '@material-ui/icons/Code';
import LaunchIcon from '@material-ui/icons/Launch';
import FileCopyIcon from '@material-ui/icons/FileCopy';
import GetAppIcon from '@material-ui/icons/GetApp';
import { AIRuleType, AIRule, CursorRule, CopilotRule, ClineRule, ClaudeCodeRule } from '../../types';

export interface AIRulesComponentProps {
  title?: string;
}

export const isAIRulesAvailable = (entity: Entity): boolean => {
  const sourceAnnotation = entity.metadata?.annotations?.['backstage.io/source-location'] || '';
  return sourceAnnotation.startsWith('url:');
};

// ─── Type metadata ────────────────────────────────────────────────────────────

const RULE_TYPE_COLORS: Record<AIRuleType, string> = {
  [AIRuleType.CURSOR]: '#0066CC',
  [AIRuleType.COPILOT]: '#6F42C1',
  [AIRuleType.CLINE]: '#28A745',
  [AIRuleType.CLAUDE_CODE]: '#FF6B35',
  [AIRuleType.WINDSURF]: '#00B4D8',
  [AIRuleType.ROO_CODE]: '#6610F2',
  [AIRuleType.CODEX]: '#10A37F',
  [AIRuleType.GEMINI]: '#4285F4',
  [AIRuleType.AMAZON_Q]: '#FF9900',
  [AIRuleType.CONTINUE]: '#1A73E8',
  [AIRuleType.AIDER]: '#E83E8C',
};

const RULE_TYPE_DISPLAY_NAMES: Record<AIRuleType, string> = {
  [AIRuleType.CURSOR]: 'Cursor',
  [AIRuleType.COPILOT]: 'Copilot',
  [AIRuleType.CLINE]: 'Cline',
  [AIRuleType.CLAUDE_CODE]: 'Claude Code',
  [AIRuleType.WINDSURF]: 'Windsurf',
  [AIRuleType.ROO_CODE]: 'Roo Code',
  [AIRuleType.CODEX]: 'OpenAI Codex',
  [AIRuleType.GEMINI]: 'Gemini CLI',
  [AIRuleType.AMAZON_Q]: 'Amazon Q',
  [AIRuleType.CONTINUE]: 'Continue',
  [AIRuleType.AIDER]: 'Aider',
};

const RULE_TYPE_DISPLAY_ORDER: AIRuleType[] = [
  AIRuleType.CURSOR,
  AIRuleType.CLAUDE_CODE,
  AIRuleType.COPILOT,
  AIRuleType.CLINE,
  AIRuleType.WINDSURF,
  AIRuleType.ROO_CODE,
  AIRuleType.CODEX,
  AIRuleType.GEMINI,
  AIRuleType.AMAZON_Q,
  AIRuleType.CONTINUE,
  AIRuleType.AIDER,
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiAccordion-root': {
      marginBottom: theme.spacing(1),
      '&:before': { display: 'none' },
    },
  },
  filterSection: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
  },
  searchBar: {
    marginBottom: theme.spacing(2),
    width: '100%',
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
    overflow: 'hidden',
  },
  ruleHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    flexShrink: 0,
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
    '& > *': { backgroundColor: 'transparent !important' },
  },
  ruleMetadata: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
  },
  statsContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
    alignItems: 'center',
  },
  statCard: {
    minWidth: '100px',
    textAlign: 'center',
  },
  filterContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    '& > *': { marginRight: theme.spacing(1) },
  },
  applyFilterButton: {
    marginTop: theme.spacing(1),
  },
  viewToggle: {
    marginBottom: theme.spacing(1),
  },
  exportButton: {
    marginLeft: 'auto',
  },
}));

// ─── Helper functions ─────────────────────────────────────────────────────────

const parseCursorContent = (content: string) => manualParseFrontmatter(content);

const manualParseFrontmatter = (content: string) => {
  if (!content.trim().startsWith('---')) {
    return { frontmatter: undefined, content };
  }
  try {
    const lines = content.split('\n');
    let frontmatterEndIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') { frontmatterEndIndex = i; break; }
    }
    if (frontmatterEndIndex === -1) return { frontmatter: undefined, content };
    const frontmatterLines = lines.slice(1, frontmatterEndIndex);
    const contentLines = lines.slice(frontmatterEndIndex + 1);
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
      content: contentLines.join('\n').trim(),
    };
  } catch (_e) {
    return { frontmatter: undefined, content };
  }
};

const constructFileUrl = (gitUrl: string, filePath: string): string => {
  const cleanGitUrl = gitUrl.replace(/\/+$/, '');

  try {
    const host = new URL(cleanGitUrl).hostname.toLowerCase();
    if (host === 'github.com' || host.endsWith('.github.com')) {
      return `${cleanGitUrl}/blob/main/${filePath}`;
    }
    if (host === 'gitlab.com' || host.endsWith('.gitlab.com')) {
      return `${cleanGitUrl}/-/blob/main/${filePath}`;
    }
  } catch (_e) {
    // Fallback to default format when URL parsing fails.
  }

  return `${cleanGitUrl}/blob/main/${filePath}`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const RuleTypeIcon = ({ type }: { type: AIRuleType }) => (
  <CodeIcon style={{ color: RULE_TYPE_COLORS[type] ?? '#888', flexShrink: 0 }} />
);

const renderFrontmatter = (theme: any, frontmatter?: Record<string, any>) => {
  if (!frontmatter || Object.keys(frontmatter).length === 0) return null;
  const filteredEntries = Object.entries(frontmatter).filter(([key]) =>
    !['description', 'globs'].includes(key),
  );
  if (filteredEntries.length === 0) return null;
  return (
    <div style={{
      marginBottom: 16,
      padding: 16,
      backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      borderRadius: 8,
      border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
    }}>
      <Typography variant="subtitle2" style={{ marginBottom: 12, fontWeight: 'bold', color: theme.palette.text.secondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Metadata
      </Typography>
      {filteredEntries.map(([key, value], index) => (
        <div key={key} style={{ marginBottom: index < filteredEntries.length - 1 ? 12 : 0 }}>
          <Typography variant="body2" style={{ fontWeight: 'bold', textTransform: 'capitalize', color: theme.palette.primary.main, marginBottom: 4 }}>
            {key}:
          </Typography>
          <Typography variant="body2" style={{ lineHeight: '1.5', marginLeft: 8, color: theme.palette.text.primary }}>
            {Array.isArray(value) ? value.join(', ') : String(value)}
          </Typography>
        </div>
      ))}
    </div>
  );
};

// Content viewer with raw/rendered toggle
const RuleContentViewer = ({ content }: { content: string }) => {
  const styles = useStyles();
  const [view, setView] = useState<'rendered' | 'raw'>('rendered');
  return (
    <div>
      <ToggleButtonGroup
        size="small"
        value={view}
        exclusive
        onChange={(_e: any, v: any) => { if (v) setView(v); }}
        className={styles.viewToggle}
      >
        <ToggleButton value="rendered">Rendered</ToggleButton>
        <ToggleButton value="raw">Raw</ToggleButton>
      </ToggleButtonGroup>
      {view === 'rendered' ? (
        <div className={styles.ruleContent}>
          <MarkdownContent content={content} />
        </div>
      ) : (
        <CodeSnippet text={content} language="markdown" />
      )}
    </div>
  );
};

// Copy-to-clipboard button
const CopyButton = ({ content }: { content: string }) => {
  const [open, setOpen] = useState(false);
  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content).then(() => setOpen(true));
  }, [content]);
  return (
    <>
      <Tooltip title="Copy content">
        <IconButton size="small" onClick={handleCopy}>
          <FileCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Snackbar
        open={open}
        autoHideDuration={2000}
        onClose={() => setOpen(false)}
        message="Copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

// Generic rule renderer for agents with simple markdown + title
const GenericRuleAccordion = ({
  rule,
  label,
}: {
  rule: AIRule & { title?: string; mode?: string; alwaysApply?: boolean; applyTo?: string; frontmatter?: Record<string, any> };
  label?: string;
}) => {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Accordion className={styles.ruleCard}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <div className={styles.ruleHeader}>
          <div className={styles.ruleHeaderContent}>
            <RuleTypeIcon type={rule.type} />
            <Typography variant="h6">{rule.title || rule.fileName}</Typography>
            <Chip label={label ?? rule.type} size="small" className={styles.ruleType} />
            {rule.mode && <Chip label={`Mode: ${rule.mode}`} size="small" variant="outlined" />}
            {rule.alwaysApply !== undefined && (
              <Chip label={rule.alwaysApply ? 'Always Apply' : 'On Demand'} size="small" variant="outlined" />
            )}
            {rule.applyTo && <Chip label={`Applies to: ${rule.applyTo}`} size="small" variant="outlined" />}
          </div>
          <div className={styles.ruleHeaderActions}>
            <CopyButton content={rule.content} />
            {rule.gitUrl && (
              <Tooltip title="Open file in repository">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); window.open(constructFileUrl(rule.gitUrl!, rule.filePath), '_blank'); }}>
                  <LaunchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div>
          <div className={styles.ruleMetadata}>
            <Chip label={`Path: ${rule.filePath}`} size="small" variant="outlined" />
          </div>
          {rule.frontmatter && renderFrontmatter(theme, rule.frontmatter)}
          <RuleContentViewer content={rule.content} />
        </div>
      </AccordionDetails>
    </Accordion>
  );
};

const RuleComponent = ({ rule }: { rule: AIRule }) => {
  const styles = useStyles();
  const theme = useTheme();

  const renderCursorRule = (r: CursorRule) => {
    const { frontmatter, content } = parseCursorContent(r.content);
    return (
      <Accordion className={styles.ruleCard}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <div className={styles.ruleHeader}>
            <div className={styles.ruleHeaderContent}>
              <RuleTypeIcon type={r.type} />
              <Typography variant="h6">{r.fileName}</Typography>
              <Chip label={r.type} size="small" className={styles.ruleType} />
              {frontmatter?.description && (
                <Typography variant="body2" style={{ marginLeft: 8, color: theme.palette.text.secondary }}>
                  {frontmatter.description}
                </Typography>
              )}
            </div>
            <div className={styles.ruleHeaderActions}>
              <CopyButton content={content} />
              {r.gitUrl && (
                <Tooltip title="Open file in repository">
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); window.open(constructFileUrl(r.gitUrl!, r.filePath), '_blank'); }}>
                    <LaunchIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          </div>
        </AccordionSummary>
        <AccordionDetails>
          <div>
            <div className={styles.ruleMetadata}>
              <Chip label={`Path: ${r.filePath}`} size="small" variant="outlined" />
              {frontmatter?.globs && (
                <Chip label={`Globs: ${Array.isArray(frontmatter.globs) ? frontmatter.globs.join(', ') : frontmatter.globs}`} size="small" variant="outlined" />
              )}
            </div>
            {renderFrontmatter(theme, frontmatter)}
            <RuleContentViewer content={content} />
          </div>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderCopilotRule = (r: CopilotRule) => (
    <Accordion className={styles.ruleCard}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <div className={styles.ruleHeader}>
          <div className={styles.ruleHeaderContent}>
            <RuleTypeIcon type={r.type} />
            <Typography variant="h6">{r.title || r.fileName}</Typography>
            <Chip label={r.type} size="small" className={styles.ruleType} />
            {r.applyTo && <Chip label={`Applies to: ${r.applyTo}`} size="small" variant="outlined" style={{ marginLeft: 8 }} />}
          </div>
          <div className={styles.ruleHeaderActions}>
            <CopyButton content={r.content} />
            {r.gitUrl && (
              <Tooltip title="Open file in repository">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); window.open(constructFileUrl(r.gitUrl!, r.filePath), '_blank'); }}>
                  <LaunchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div>
          <div className={styles.ruleMetadata}>
            <Chip label={`Path: ${r.filePath}`} size="small" variant="outlined" />
            {r.frontmatter && renderFrontmatter(theme, r.frontmatter)}
          </div>
          <RuleContentViewer content={r.content} />
        </div>
      </AccordionDetails>
    </Accordion>
  );

  const renderClineRule = (r: ClineRule) => (
    <Accordion className={styles.ruleCard}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <div className={styles.ruleHeader}>
          <div className={styles.ruleHeaderContent}>
            <RuleTypeIcon type={r.type} />
            <Typography variant="h6">{r.title || r.fileName}</Typography>
            <Chip label={r.type} size="small" className={styles.ruleType} />
          </div>
          <div className={styles.ruleHeaderActions}>
            <CopyButton content={r.content} />
            {r.gitUrl && (
              <Tooltip title="Open file in repository">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); window.open(constructFileUrl(r.gitUrl!, r.filePath), '_blank'); }}>
                  <LaunchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div>
          <div className={styles.ruleMetadata}>
            <Chip label={`Path: ${r.filePath}`} size="small" variant="outlined" />
          </div>
          <RuleContentViewer content={r.content} />
        </div>
      </AccordionDetails>
    </Accordion>
  );

  const renderClaudeCodeRule = (r: ClaudeCodeRule) => (
    <Accordion className={styles.ruleCard}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <div className={styles.ruleHeader}>
          <div className={styles.ruleHeaderContent}>
            <RuleTypeIcon type={r.type} />
            <Typography variant="h6">{r.title || r.fileName}</Typography>
            <Chip label="claude-code" size="small" className={styles.ruleType} />
          </div>
          <div className={styles.ruleHeaderActions}>
            <CopyButton content={r.content} />
            {r.gitUrl && (
              <Tooltip title="Open file in repository">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); window.open(constructFileUrl(r.gitUrl!, r.filePath), '_blank'); }}>
                  <LaunchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </div>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <div>
          <div className={styles.ruleMetadata}>
            <Chip label={`Path: ${r.filePath}`} size="small" variant="outlined" />
          </div>
          <RuleContentViewer content={r.content} />
        </div>
      </AccordionDetails>
    </Accordion>
  );

  switch (rule.type) {
    case AIRuleType.CURSOR: return renderCursorRule(rule as CursorRule);
    case AIRuleType.CLAUDE_CODE: return renderClaudeCodeRule(rule as ClaudeCodeRule);
    case AIRuleType.COPILOT: return renderCopilotRule(rule as CopilotRule);
    case AIRuleType.CLINE: return renderClineRule(rule as ClineRule);
    default: return <GenericRuleAccordion rule={rule as any} />;
  }
};

// ─── Export helper ────────────────────────────────────────────────────────────

const exportRulesToMarkdown = (rules: AIRule[]) => {
  const lines: string[] = ['# AI Coding Rules Export\n'];
  const grouped: Partial<Record<AIRuleType, AIRule[]>> = {};
  for (const rule of rules) {
    if (!grouped[rule.type]) grouped[rule.type] = [];
    grouped[rule.type]!.push(rule);
  }
  for (const type of RULE_TYPE_DISPLAY_ORDER) {
    const typeRules = grouped[type];
    if (!typeRules || typeRules.length === 0) continue;
    lines.push(`## ${RULE_TYPE_DISPLAY_NAMES[type]}\n`);
    for (const rule of typeRules) {
      const title = (rule as any).title || rule.fileName;
      lines.push(`### ${title}\n`);
      lines.push(`_File: \`${rule.filePath}\`_\n`);
      lines.push(`${rule.content}\n`);
    }
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ai-rules-export.md';
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Main component ───────────────────────────────────────────────────────────

export const AIRulesComponent: React.FC<AIRulesComponentProps> = ({ title = 'AI Coding Rules' } = {}) => {
  const { rulesByType, rules, loading, error, hasGitUrl, totalRules, allowedRuleTypes, selectedRuleTypes, setSelectedRuleTypes, applyFilters, resetFilters, hasUnappliedChanges, hasSearched } = useAiRules();
  const styles = useStyles();

  const [searchQuery, setSearchQuery] = useState('');

  const formatRuleTypeName = (type: AIRuleType): string => RULE_TYPE_DISPLAY_NAMES[type] ?? type;

  const handleTypeToggle = (type: AIRuleType, checked: boolean) => {
    const newTypes = checked
      ? [...selectedRuleTypes, type]
      : selectedRuleTypes.filter(t => t !== type);
    setSelectedRuleTypes(newTypes);
  };

  // Filter rules by search query
  const filteredRulesByType = useMemo(() => {
    if (!searchQuery.trim()) return rulesByType;
    const q = searchQuery.toLowerCase();
    const filtered: Partial<Record<AIRuleType, AIRule[]>> = {};
    for (const type of RULE_TYPE_DISPLAY_ORDER) {
      const typeRules = (rulesByType[type] || []).filter(rule => {
        const r = rule as any;
        return (
          rule.content?.toLowerCase().includes(q) ||
          rule.fileName?.toLowerCase().includes(q) ||
          r.title?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q)
        );
      });
      if (typeRules.length > 0) filtered[type] = typeRules;
    }
    return filtered;
  }, [rulesByType, searchQuery]);

  const filteredTotal = useMemo(
    () => Object.values(filteredRulesByType).reduce((sum, arr) => sum + (arr?.length ?? 0), 0),
    [filteredRulesByType],
  );

  if (loading) {
    return <InfoCard title={title}><Progress /></InfoCard>;
  }

  if (!hasGitUrl) {
    return (
      <InfoCard title={title}>
        <EmptyState missing="content" title="No Git Repository" description="This component doesn't have a Git source URL configured." />
      </InfoCard>
    );
  }

  if (error) {
    return (
      <InfoCard title={title}>
        <EmptyState missing="content" title="Error Loading Rules" description={error} />
      </InfoCard>
    );
  }

  return (
    <InfoCard title={title} className={styles.root}>
      {/* Filter section */}
      <div className={styles.filterSection}>
        <Typography variant="h6" gutterBottom>Filter Rule Types</Typography>
        <div className={styles.filterContainer}>
          {allowedRuleTypes.map(type => (
            <FormControlLabel
              key={type}
              control={<Checkbox checked={selectedRuleTypes.includes(type)} onChange={(e) => handleTypeToggle(type, e.target.checked)} />}
              label={formatRuleTypeName(type)}
            />
          ))}
        </div>
        <div className={styles.applyFilterButton}>
          <Button variant="contained" color="primary" onClick={applyFilters} disabled={!hasUnappliedChanges}>
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
          action={<Button variant="outlined" onClick={resetFilters}>Reset Filters</Button>}
        />
      ) : totalRules > 0 ? (
        <>
          {/* Search bar */}
          <TextField
            className={styles.searchBar}
            variant="outlined"
            size="small"
            label="Search rules"
            placeholder="Search by name, title, or content…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Stats + export */}
          <div className={styles.statsContainer}>
            <Card className={styles.statCard}>
              <CardContent>
                <Typography variant="h4">{searchQuery ? filteredTotal : totalRules}</Typography>
                <Typography color="textSecondary">{searchQuery ? 'Matching' : 'Total Rules'}</Typography>
              </CardContent>
            </Card>
            {RULE_TYPE_DISPLAY_ORDER.map(type => {
              const typeRules = (searchQuery ? filteredRulesByType : rulesByType)[type] || [];
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
            <Tooltip title="Download all rules as Markdown">
              <Button
                variant="outlined"
                size="small"
                startIcon={<GetAppIcon />}
                className={styles.exportButton}
                onClick={() => exportRulesToMarkdown(rules)}
              >
                Export
              </Button>
            </Tooltip>
          </div>

          {/* Rules grouped by type */}
          {RULE_TYPE_DISPLAY_ORDER.map(type => {
            const typeRules = (searchQuery ? filteredRulesByType : rulesByType)[type] || [];
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

          {searchQuery && filteredTotal === 0 && (
            <EmptyState missing="content" title="No matching rules" description={`No rules match "${searchQuery}". Clear the search to show all rules.`} />
          )}
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
