# Roadmap

This document outlines the planned direction for TeraSky's Backstage Plugins. It is a living document — items may be added, reprioritised, or removed as requirements evolve and community feedback is incorporated.

> **Want to influence the roadmap?** Open a [GitHub Issue](https://github.com/TeraSky-OSS/backstage-plugins/issues) with the `enhancement` label, or join the discussion on an existing one.

---

## Table of Contents

- [Guiding Principles](#guiding-principles)
- [Current Focus Areas](#current-focus-areas)
- [Near-Term (Next 1–3 Months)](#near-term-next-13-months)
- [Medium-Term (3–6 Months)](#medium-term-36-months)
- [Long-Term / Aspirational](#long-term--aspirational)
- [Recently Completed](#recently-completed)

---

## Guiding Principles

- **Composability** — plugins should work independently and compose naturally with each other and with the broader Backstage ecosystem.
- **AI-readiness** — every major plugin surface should eventually be reachable via MCP actions so that AI agents and automation tools can interact with Backstage data programmatically.
- **Permission-first** — all new functionality that exposes sensitive data or performs mutations must integrate with Backstage's permission framework from day one.
- **New Frontend System** — all frontend plugins target the Backstage New Frontend System (NFS) and avoid legacy patterns.
- **Community-driven** — external contributions are welcome and the backlog is publicly visible via GitHub Issues.

---

## Current Focus Areas

### MCP / AI Integration
The addition of [Catalog MCP Backend](./plugins/catalog-mcp-backend), [RBAC MCP Backend](./plugins/rbac-mcp-backend), [Scaffolder MCP Backend](./plugins/scaffolder-mcp-backend), and MCP actions in the [ScaleOps Backend](./plugins/scaleops-backend) and [SpectroCloud Backend](./plugins/spectrocloud-backend) signals a deliberate push to make every major plugin surface reachable by AI agents. The near-term roadmap continues this direction.

### Kubernetes Ecosystem Depth
Plugins like the [Kubernetes Ingestor](./plugins/kubernetes-ingestor), [Crossplane Resources](./plugins/crossplane-resources), [KRO Resources](./plugins/kro-resources), and [Kyverno Policy Reports](./plugins/kyverno-policy-reports) form a growing Kubernetes-native catalog surface. Upcoming work focuses on richer resource graphs, improved event streaming, and deeper multi-cluster support.

### Cloud Platform Integrations
The VCF Automation, VCF Operations, and SpectroCloud plugin suites are actively expanded to cover more resource types, improve ingestion fidelity, and align with the latest platform API versions.

---

## Near-Term (Next 1–3 Months)

### MCP Expansion
- [ ] **Kubernetes Ingestor MCP actions** — expose cluster discovery, entity refresh triggers, and GVK configuration queries as MCP actions.

### Kubernetes Ecosystem
- [ ] **Kubernetes Resources graph improvements** — improve loading time, and improve layout for large graphs.
- [ ] **Kubernetes Ingestor: GitOps annotation support** — auto-detect and annotate entities with GitOps source repository and path information derived from Flux/ArgoCD labels.

### Developer Tooling
- [ ] **Template Builder: import from existing templates** — allow loading an existing template YAML into the visual editor to facilitate editing rather than only authoring from scratch.

### Quality & Compatibility
- [ ] Ensure all plugins are validated against Backstage `1.50.x` as it releases.
- [ ] Increase unit test coverage across all plugin suites.
- [ ] Add end-to-end Playwright tests for the relevant frontend plugins.

---

## Medium-Term (3–6 Months)

### MCP Expansion (continued)
- [ ] **VCF Automation MCP Backend** — provide MCP actions to query deployments, resources, and projects from VCF Automation.
- [ ] **VCF Operations MCP Backend** — expose VCF Operations metrics and alerts as MCP actions.
- [ ] **Educates MCP Backend** — allow AI agents to discover and launch Educates workshops programmatically.

### SpectroCloud Suite
- [ ] **SpectroCloud cluster cost visibility** — surface cluster cost data from Palette in the SpectroCloud entity card.
- [ ] **SpectroCloud virtual cluster support** — extend the ingestor and frontend to handle virtual (nested) clusters alongside host clusters.

### VCF Suite
- [ ] **VCF Automation: day-2 actions** — add scaffolder actions for triggering VCF Automation deployment operations (scale, update, delete).
- [ ] **VCFA VKS Cluster Provider: OIDC authentication** — extend the cluster provider to optionally use OIDC user tokens in addition to service account credentials.

### AI Rules Plugin
- [ ] **Rule synchronisation** — support pushing the active rule set back to a remote Git repository or object storage so that all developers always have the latest rules.
- [ ] **Rule conflict detection** — identify and surface conflicting rules across different sources in the UI.

### Frontend Foundations
- [ ] **Entity Overview cards for all major plugin suites** — ensure every plugin that surfaces data also exposes a compact overview card usable in the entity overview tab.
- [ ] **Consistent empty-state and error-state UX** — standardise loading, empty, and error states across all frontend plugins.

---

## Long-Term / Aspirational

These items represent directions we are interested in exploring but have not yet committed to a timeline.

- **Unified cost intelligence surface** — aggregate cost data from ScaleOps, VCF Operations, and cloud billing into a single Backstage cost card, with per-entity drill-down.
- **Backstage Signals / real-time updates** — leverage the Backstage Signals framework to push live Kubernetes event and status updates to the frontend without polling.
- **Plugin marketplace integration** — submit all stable plugins to the official [Backstage Plugin Marketplace](https://backstage.io/plugins) with verified metadata.
- **Helm chart for the demo app** — publish a Helm chart for the reference Backstage application (in `packages/`) to make it trivial to deploy the full plugin demo environment.
- **integrate dynamic plugins support in the demo app** - make the demo app more usable for different use cases.
- **AI-assisted template authoring** — integrate the Template Builder with a language model so that natural-language descriptions of a workflow can seed the visual canvas automatically.

---
