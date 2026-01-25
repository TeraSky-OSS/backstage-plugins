import { KubernetesResourceGraph } from './KubernetesResourceGraph';

describe('KubernetesResourceGraph', () => {
  it('should be defined', () => {
    expect(KubernetesResourceGraph).toBeDefined();
  });

  it('should be a function component', () => {
    expect(typeof KubernetesResourceGraph).toBe('function');
  });
});

