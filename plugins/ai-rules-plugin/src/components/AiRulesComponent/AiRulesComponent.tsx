import { useState, useCallback, useMemo } from 'react';
import { useAiRules } from '../../hooks/useAiRules';
import { InfoCard, Progress, EmptyState, MarkdownContent, CodeSnippet } from '@backstage/core-components';
import {
  Accordion,
  AccordionPanel,
  AccordionTrigger,
  Badge,
  Box,
  Button,
  ButtonIcon,
  Card,
  CardBody,
  Checkbox,
  Flex,
  Text,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  TooltipTrigger,
} from '@backstage/ui';
import { Entity } from '@backstage/catalog-model';
import { RiCodeLine, RiExternalLinkLine, RiFileCopyLine, RiCheckLine, RiDownloadLine } from '@remixicon/react';
import { AIRuleType, AIRule, CursorRule, CopilotRule, ClineRule, ClaudeCodeRule } from '../../types';
import styles from './AiRulesComponent.module.css';

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

// ─── Helper functions ─────────────────────────────────────────────────────────

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

const parseCursorContent = (content: string) => manualParseFrontmatter(content);

const constructFileUrl = (gitUrl: string, filePath: string): string => {
  const cleanGitUrl = gitUrl.replace(/\/+$/, '');
  if (cleanGitUrl.includes('github.com')) return `${cleanGitUrl}/blob/main/${filePath}`;
  if (cleanGitUrl.includes('gitlab.com')) return `${cleanGitUrl}/-/blob/main/${filePath}`;
  return `${cleanGitUrl}/blob/main/${filePath}`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const RuleTypeIcon = ({ type }: { type: AIRuleType }) => (
  <RiCodeLine style={{ color: RULE_TYPE_COLORS[type] ?? '#888', flexShrink: 0 }} />
);

const renderFrontmatter = (frontmatter?: Record<string, any>) => {
  if (!frontmatter || Object.keys(frontmatter).length === 0) return null;
  const filteredEntries = Object.entries(frontmatter).filter(([key]) =>
    !['description', 'globs'].includes(key),
  );
  if (filteredEntries.length === 0) return null;
  return (
    <div className={styles.frontmatterBox}>
      <Text variant="body-small" weight="bold" style={{ display: 'block', marginBottom: 'var(--bui-space-2)', color: 'var(--bui-fg-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Metadata
      </Text>
      {filteredEntries.map(([key, value]) => (
        <div key={key} style={{ marginBottom: 'var(--bui-space-2)' }}>
          <Text weight="bold" style={{ display: 'block', textTransform: 'capitalize' }}>
            {key}:
          </Text>
          <Text style={{ display: 'block', marginLeft: 'var(--bui-space-1)' }}>
            {Array.isArray(value) ? value.join(', ') : String(value)}
          </Text>
        </div>
      ))}
    </div>
  );
};

// Content viewer with raw/rendered toggle
const RuleContentViewer = ({ content }: { content: string }) => {
  const [view, setView] = useState<'rendered' | 'raw'>('rendered');
  return (
    <div>
      <ToggleButtonGroup
        className={styles.viewToggle}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[view]}
        onSelectionChange={keys => {
          const [v] = Array.from(keys);
          if (v) setView(v as 'rendered' | 'raw');
        }}
      >
        <ToggleButton id="rendered" size="small">Rendered</ToggleButton>
        <ToggleButton id="raw" size="small">Raw</ToggleButton>
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
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [content]);
  return (
    <TooltipTrigger>
      <ButtonIcon
        aria-label={copied ? 'Copied' : 'Copy content'}
        size="small"
        variant="tertiary"
        icon={copied ? <RiCheckLine /> : <RiFileCopyLine />}
        onPress={handleCopy}
      />
      <Tooltip>{copied ? 'Copied!' : 'Copy content'}</Tooltip>
    </TooltipTrigger>
  );
};

const OpenInRepoButton = ({ gitUrl, filePath }: { gitUrl: string; filePath: string }) => (
  <TooltipTrigger>
    <ButtonIcon
      aria-label="Open file in repository"
      size="small"
      variant="tertiary"
      icon={<RiExternalLinkLine />}
      onPress={() => window.open(constructFileUrl(gitUrl, filePath), '_blank')}
    />
    <Tooltip>Open file in repository</Tooltip>
  </TooltipTrigger>
);

// Shared shell for a single rule accordion: header (icon/title/badges) + actions + details
const RuleAccordionShell = ({
  icon,
  title,
  badges,
  gitUrl,
  filePath,
  frontmatter,
  extraMetadata,
  content,
}: {
  icon: React.ReactNode;
  title: string;
  badges?: React.ReactNode;
  gitUrl?: string;
  filePath: string;
  frontmatter?: Record<string, any>;
  extraMetadata?: React.ReactNode;
  content: string;
}) => (
  <Box className={styles.ruleCard} style={{ position: 'relative' }}>
    <Accordion>
      <AccordionTrigger>
        <Flex align="center" gap="2" style={{ flexWrap: 'wrap', paddingRight: 'var(--bui-space-16)' }}>
          {icon}
          <Text variant="title-small" weight="bold">{title}</Text>
          {badges}
        </Flex>
      </AccordionTrigger>
      <AccordionPanel>
        <div className={styles.ruleMetadata}>
          <Badge>{`Path: ${filePath}`}</Badge>
          {extraMetadata}
        </div>
        {renderFrontmatter(frontmatter)}
        <RuleContentViewer content={content} />
      </AccordionPanel>
    </Accordion>
    <Flex gap="1" style={{ position: 'absolute', top: 'var(--bui-space-2)', right: 'var(--bui-space-2)' }}>
      <CopyButton content={content} />
      {gitUrl && <OpenInRepoButton gitUrl={gitUrl} filePath={filePath} />}
    </Flex>
  </Box>
);

// Generic rule renderer for agents with simple markdown + title
const GenericRuleAccordion = ({
  rule,
  label,
}: {
  rule: AIRule & { title?: string; mode?: string; alwaysApply?: boolean; applyTo?: string; frontmatter?: Record<string, any> };
  label?: string;
}) => (
  <RuleAccordionShell
    icon={<RuleTypeIcon type={rule.type} />}
    title={rule.title || rule.fileName}
    badges={
      <>
        <Badge>{label ?? rule.type}</Badge>
        {rule.mode && <Badge>{`Mode: ${rule.mode}`}</Badge>}
        {rule.alwaysApply !== undefined && (
          <Badge>{rule.alwaysApply ? 'Always Apply' : 'On Demand'}</Badge>
        )}
        {rule.applyTo && <Badge>{`Applies to: ${rule.applyTo}`}</Badge>}
      </>
    }
    gitUrl={rule.gitUrl}
    filePath={rule.filePath}
    frontmatter={rule.frontmatter}
    content={rule.content}
  />
);

const RuleComponent = ({ rule }: { rule: AIRule }) => {
  const renderCursorRule = (r: CursorRule) => {
    const { frontmatter, content } = parseCursorContent(r.content);
    return (
      <RuleAccordionShell
        icon={<RuleTypeIcon type={r.type} />}
        title={r.fileName}
        badges={
          <>
            <Badge>{r.type}</Badge>
            {frontmatter?.description && (
              <Text style={{ color: 'var(--bui-fg-secondary)' }}>{frontmatter.description}</Text>
            )}
          </>
        }
        gitUrl={r.gitUrl}
        filePath={r.filePath}
        frontmatter={frontmatter}
        extraMetadata={frontmatter?.globs && (
          <Badge>{`Globs: ${Array.isArray(frontmatter.globs) ? frontmatter.globs.join(', ') : frontmatter.globs}`}</Badge>
        )}
        content={content}
      />
    );
  };

  const renderCopilotRule = (r: CopilotRule) => (
    <RuleAccordionShell
      icon={<RuleTypeIcon type={r.type} />}
      title={r.title || r.fileName}
      badges={
        <>
          <Badge>{r.type}</Badge>
          {r.applyTo && <Badge>{`Applies to: ${r.applyTo}`}</Badge>}
        </>
      }
      gitUrl={r.gitUrl}
      filePath={r.filePath}
      frontmatter={r.frontmatter}
      content={r.content}
    />
  );

  const renderClineRule = (r: ClineRule) => (
    <RuleAccordionShell
      icon={<RuleTypeIcon type={r.type} />}
      title={r.title || r.fileName}
      badges={<Badge>{r.type}</Badge>}
      gitUrl={r.gitUrl}
      filePath={r.filePath}
      content={r.content}
    />
  );

  const renderClaudeCodeRule = (r: ClaudeCodeRule) => (
    <RuleAccordionShell
      icon={<RuleTypeIcon type={r.type} />}
      title={r.title || r.fileName}
      badges={<Badge>claude-code</Badge>}
      gitUrl={r.gitUrl}
      filePath={r.filePath}
      content={r.content}
    />
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

  const rulesOrPromptContent = totalRules > 0 ? (
    <>
      {/* Search bar */}
      <TextField
        className={styles.searchBar}
        size="small"
        label="Search rules"
        placeholder="Search by name, title, or content…"
        value={searchQuery}
        onChange={setSearchQuery}
      />

      {/* Stats + export */}
      <div className={styles.statsContainer}>
        <Card className={styles.statCard}>
          <CardBody>
            <Text variant="title-large" weight="bold" style={{ display: 'block' }}>{searchQuery ? filteredTotal : totalRules}</Text>
            <Text style={{ color: 'var(--bui-fg-secondary)' }}>{searchQuery ? 'Matching' : 'Total Rules'}</Text>
          </CardBody>
        </Card>
        {RULE_TYPE_DISPLAY_ORDER.map(type => {
          const typeRules = (searchQuery ? filteredRulesByType : rulesByType)[type] || [];
          if (typeRules.length === 0) return null;
          return (
            <Card key={type} className={styles.statCard}>
              <CardBody>
                <Text variant="title-large" weight="bold" style={{ display: 'block' }}>{typeRules.length}</Text>
                <Text style={{ color: 'var(--bui-fg-secondary)' }}>{formatRuleTypeName(type)}</Text>
              </CardBody>
            </Card>
          );
        })}
        <TooltipTrigger>
          <Button
            variant="secondary"
            size="small"
            iconStart={<RiDownloadLine />}
            className={styles.exportButton}
            onPress={() => exportRulesToMarkdown(rules)}
          >
            Export
          </Button>
          <Tooltip>Download all rules as Markdown</Tooltip>
        </TooltipTrigger>
      </div>

      {/* Rules grouped by type */}
      {RULE_TYPE_DISPLAY_ORDER.map(type => {
        const typeRules = (searchQuery ? filteredRulesByType : rulesByType)[type] || [];
        if (typeRules.length === 0) return null;
        return (
          <div key={type}>
            <Text variant="title-medium" weight="bold" style={{ display: 'block', marginTop: 'var(--bui-space-4)', marginBottom: 'var(--bui-space-2)' }}>
              {formatRuleTypeName(type)} Rules ({typeRules.length})
            </Text>
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
    <div style={{ marginTop: 'var(--bui-space-4)' }}>
      <Text style={{ color: 'var(--bui-fg-secondary)' }}>
        Select rule types above and click "Apply Filter" to search for AI coding rules in this repository.
      </Text>
    </div>
  );

  return (
    <InfoCard title={title}>
      {/* Filter section */}
      <div className={styles.filterSection}>
        <Text variant="title-small" weight="bold" style={{ display: 'block', marginBottom: 'var(--bui-space-2)' }}>Filter Rule Types</Text>
        <div className={styles.filterContainer}>
          {allowedRuleTypes.map(type => (
            <Checkbox
              key={type}
              isSelected={selectedRuleTypes.includes(type)}
              onChange={isSelected => handleTypeToggle(type, isSelected)}
            >
              {formatRuleTypeName(type)}
            </Checkbox>
          ))}
        </div>
        <div className={styles.applyFilterButton}>
          <Button variant="primary" onPress={applyFilters} isDisabled={!hasUnappliedChanges}>
            Apply Filter
          </Button>
          {hasUnappliedChanges && (
            <Text style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginTop: 'var(--bui-space-2)' }}>
              You have unsaved filter changes. Click "Apply Filter" to update the results.
            </Text>
          )}
          {!hasUnappliedChanges && selectedRuleTypes.length === 0 && (
            <Text style={{ color: 'var(--bui-fg-secondary)', display: 'block', marginTop: 'var(--bui-space-2)' }}>
              Select at least one rule type to search for AI rules.
            </Text>
          )}
        </div>
      </div>

      {hasSearched && totalRules === 0 ? (
        <EmptyState
          missing="content"
          title="No AI Rules Found"
          description="No AI rules were found in this repository for the selected rule types."
          action={<Button variant="secondary" onPress={resetFilters}>Reset Filters</Button>}
        />
      ) : rulesOrPromptContent}
    </InfoCard>
  );
};
