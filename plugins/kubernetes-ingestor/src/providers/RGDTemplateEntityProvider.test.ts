import { RGDTemplateEntityProvider } from './RGDTemplateEntityProvider';
import { ConfigReader } from '@backstage/config';

const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});
afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
};

const makeCrd = () => ({
  metadata: { name: 'myrgds.example.com' },
  spec: {
    names: { kind: 'MyRGD', plural: 'myrgds' },
    group: 'example.com',
    scope: 'Namespaced',
    versions: [{ name: 'v1alpha1', schema: { openAPIV3Schema: { type: 'object', properties: { spec: { type: 'object', properties: {} } } } } }],
  },
});

const makeRgd = () => ({
  metadata: { name: 'myrgds.example.com' },
  spec: {},
});

function makeProvider(publishPhaseOverrides: Record<string, any> = {}) {
  const config = new ConfigReader({
    kubernetesIngestor: {
      kro: {
        rgds: {
          publishPhase: {
            target: 'github',
            allowRepoSelection: false,
            git: {
              repoUrl: 'github.com?owner=test&repo=manifests',
              targetBranch: 'main',
              ...publishPhaseOverrides,
            },
          },
        },
      },
    },
  });
  return new RGDTemplateEntityProvider(
    { run: jest.fn() } as any,
    mockLogger as any,
    config,
    { getResource: jest.fn().mockResolvedValue(null) } as any,
  );
}

// ── branchPrefix – allowRepoSelection: false ──────────────────────────────────

describe('RGDTemplateEntityProvider – branchPrefix (allowRepoSelection: false)', () => {
  it('uses kroInstanceName (not name) in branchName', () => {
    const provider = makeProvider();
    const steps: any[] = (provider as any).extractSteps(makeCrd(), makeRgd());
    const publishStep = steps.find((s: any) => s.input?.branchName);
    expect(publishStep).toBeDefined();
    expect(publishStep.input.branchName).toContain('kroInstanceName');
    expect(publishStep.input.branchName).not.toContain('parameters.name}}');
  });

  it('prepends branchPrefix when set without trailing slash', () => {
    const provider = makeProvider({ branchPrefix: 'feature' });
    const steps: any[] = (provider as any).extractSteps(makeCrd(), makeRgd());
    const publishStep = steps.find((s: any) => s.input?.branchName);
    expect(publishStep.input.branchName).toBe('feature/create-${{ parameters.kroInstanceName }}-resource');
  });

  it('does not double-add slash when branchPrefix already ends with /', () => {
    const provider = makeProvider({ branchPrefix: 'feature/' });
    const steps: any[] = (provider as any).extractSteps(makeCrd(), makeRgd());
    const publishStep = steps.find((s: any) => s.input?.branchName);
    expect(publishStep.input.branchName).toBe('feature/create-${{ parameters.kroInstanceName }}-resource');
  });

  it('uses default branchName without prefix when branchPrefix is not set', () => {
    const provider = makeProvider();
    const steps: any[] = (provider as any).extractSteps(makeCrd(), makeRgd());
    const publishStep = steps.find((s: any) => s.input?.branchName);
    expect(publishStep.input.branchName).toBe('create-${{ parameters.kroInstanceName }}-resource');
  });
});

// ── branchPrefix – allowRepoSelection: true ───────────────────────────────────

describe('RGDTemplateEntityProvider – branchPrefix (allowRepoSelection: true)', () => {
  function makeProviderWithRepoSelection(branchPrefix?: string) {
    const config = new ConfigReader({
      kubernetesIngestor: {
        kro: {
          rgds: {
            publishPhase: {
              target: 'github',
              allowRepoSelection: true,
              git: {
                repoUrl: 'github.com?owner=test&repo=manifests',
                targetBranch: 'main',
                ...(branchPrefix !== undefined ? { branchPrefix } : {}),
              },
            },
          },
        },
      },
    });
    return new RGDTemplateEntityProvider(
      { run: jest.fn() } as any,
      mockLogger as any,
      config,
      { getResource: jest.fn().mockResolvedValue(null) } as any,
    );
  }

  it('uses Jinja2 parameters.branchPrefix in branchName', () => {
    const provider = makeProviderWithRepoSelection('feature/');
    const steps: any[] = (provider as any).extractSteps(makeCrd(), makeRgd());
    const publishStep = steps.find((s: any) => s.input?.branchName);
    expect(publishStep).toBeDefined();
    expect(publishStep.input.branchName).toBe('${{ parameters.branchPrefix }}create-${{ parameters.kroInstanceName }}-resource');
  });

  it('includes branchPrefix field with normalized default in extractParameters', () => {
    const provider = makeProviderWithRepoSelection('feature');
    const params: any[] = (provider as any).extractParameters(makeCrd(), [], makeRgd());
    const publishStep = params.find((p: any) => p.properties?.branchPrefix);
    expect(publishStep).toBeDefined();
    expect(publishStep.properties.branchPrefix.default).toBe('feature/');
  });

  it('branchPrefix default is empty string when not configured', () => {
    const provider = makeProviderWithRepoSelection();
    const params: any[] = (provider as any).extractParameters(makeCrd(), [], makeRgd());
    const publishStep = params.find((p: any) => p.properties?.branchPrefix);
    expect(publishStep).toBeDefined();
    expect(publishStep.properties.branchPrefix.default).toBe('');
  });
});
