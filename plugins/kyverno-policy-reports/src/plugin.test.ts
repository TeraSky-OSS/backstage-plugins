import { 
  kyvernoPolicyReportsPlugin, 
  KyvernoPolicyReportsTable, 
  KyvernoOverviewCard,
  KyvernoCrossplaneOverviewCard,
  KyvernoCrossplanePolicyReportsTable,
} from './plugin';

describe('kyvernoPolicyReportsPlugin', () => {
  it('should be defined', () => {
    expect(kyvernoPolicyReportsPlugin).toBeDefined();
  });

  it('should have the correct plugin ID', () => {
    expect(kyvernoPolicyReportsPlugin.getId()).toBe('kyverno-policy-reports');
  });

  it('should export KyvernoPolicyReportsTable extension', () => {
    expect(KyvernoPolicyReportsTable).toBeDefined();
  });

  it('should export KyvernoOverviewCard extension', () => {
    expect(KyvernoOverviewCard).toBeDefined();
  });

  it('should export KyvernoCrossplaneOverviewCard extension', () => {
    expect(KyvernoCrossplaneOverviewCard).toBeDefined();
  });

  it('should export KyvernoCrossplanePolicyReportsTable extension', () => {
    expect(KyvernoCrossplanePolicyReportsTable).toBeDefined();
  });
});

