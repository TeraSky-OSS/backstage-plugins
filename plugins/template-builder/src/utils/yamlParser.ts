import * as yaml from 'js-yaml';

export interface ParsedTemplate {
  valid: boolean;
  error?: string;
  data?: any;
}

export function parseYAML(yamlString: string): ParsedTemplate {
  try {
    const data = yaml.load(yamlString);
    return {
      valid: true,
      data,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error parsing YAML',
    };
  }
}

export function isValidTemplateYAML(yamlString: string): boolean {
  try {
    const parsed = yaml.load(yamlString) as any;
    return (
      parsed &&
      parsed.apiVersion === 'scaffolder.backstage.io/v1beta3' &&
      parsed.kind === 'Template' &&
      parsed.metadata &&
      parsed.metadata.name &&
      parsed.spec
    );
  } catch {
    return false;
  }
}

export function formatYAML(yamlString: string): string {
  try {
    const parsed = yaml.load(yamlString);
    return yaml.dump(parsed, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
      sortKeys: false,
    });
  } catch {
    return yamlString;
  }
}
