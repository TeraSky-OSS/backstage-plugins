import { KubernetesObject } from '@backstage/plugin-kubernetes';
import { EntityMeta } from '@backstage/catalog-model';

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
    metadata: EntityMeta;
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
    metadata: EntityMeta;
  };
}

export interface GetCrossplanePolicyReportsResponse {
  items: PolicyReport[];
}
