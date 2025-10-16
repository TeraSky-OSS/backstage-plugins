import { KubernetesObject } from '@backstage/plugin-kubernetes';

export interface PolicyReportSummary {
  error: number;
  fail: number;
  pass: number;
  skip: number;
  warn: number;
}

export interface PolicyReportResult {
  category: string;
  message: string;
  policy: string;
  result: string;
  rule: string;
  severity: string;
  timestamp: {
    seconds: number;
  };
}

export interface PolicyReport {
  metadata: {
    uid: string;
    namespace: string;
  };
  scope: {
    kind: string;
    name: string;
  };
  summary: PolicyReportSummary;
  results?: PolicyReportResult[];
  clusterName: string;
}

export interface GetPolicyReportsRequest {
  entity: {
    metadata: {
      name: string;
      namespace: string;
    };
  };
}

export interface GetPolicyReportsResponse {
  items: PolicyReport[];
}

export interface GetPolicyRequest {
  clusterName: string;
  namespace?: string;
  policyName: string;
}

export interface GetPolicyResponse {
  policy: KubernetesObject;
}

export interface GetCrossplanePolicyReportsRequest {
  entity: {
    metadata: {
      name: string;
      namespace?: string;
      annotations?: Record<string, string>;
    };
  };
}

export interface GetCrossplanePolicyReportsResponse {
  items: PolicyReport[];
}
