# Security Assurance Case

This document is the security assurance case for TeraSky's OSS Backstage Plugins. It provides a structured argument that the project's security requirements are met, and is maintained in accordance with the [OpenSSF Best Practices](https://www.bestpractices.dev/projects/12423) badge criteria.

It covers four required elements:

1. [Threat Model](#1-threat-model)
2. [Trust Boundaries](#2-trust-boundaries)
3. [Secure Design Principles](#3-secure-design-principles)
4. [Common Implementation Security Weaknesses](#4-common-implementation-security-weaknesses)

---

## 1. Threat Model

### System Description

This repository contains a collection of Backstage plugins that extend an internal developer portal (IDP). Plugins span three layers:

- **Frontend plugins** — React components rendered in a user's browser inside the Backstage single-page application.
- **Backend plugins** — Node.js services running inside the Backstage backend process, acting as authenticated proxies or data aggregators between Backstage and external systems.
- **Common libraries** — Shared TypeScript packages (permission definitions, type declarations) that have no runtime surface of their own.

A typical deployment runs the Backstage application inside a private Kubernetes cluster, accessible to authenticated employees only. Some deployments expose Backstage behind a corporate SSO gateway.

### Assets and Security Goals

| Asset | Confidentiality | Integrity | Availability |
|---|---|---|---|
| Kubernetes API credentials (service account tokens, kubeconfigs) | High | High | Medium |
| Cloud platform credentials (VCF, SpectroCloud, ScaleOps API keys) | High | High | Medium |
| Backstage catalog entity data | Medium | High | Medium |
| RBAC policy definitions | High | High | Medium |
| Software template definitions and scaffolded code | Medium | High | Medium |
| User session tokens / OIDC tokens | High | High | Medium |
| Audit logs | Low | High | Medium |

### Threat Actors

| Actor | Motivation | Capability |
|---|---|---|
| Authenticated internal user | Curiosity, privilege escalation, insider threat | Low to medium — has valid session, no special access |
| Compromised internal account | Lateral movement, data exfiltration | Medium — valid session, potentially elevated privileges |
| External attacker (unauthenticated) | Reconnaissance, credential theft | Low against a properly network-restricted Backstage instance |
| Malicious npm dependency | Supply chain compromise | Medium — could execute arbitrary code in the build or at runtime |
| AI agent / MCP client | Unintended data access through MCP actions | Low to medium — depends on how MCP endpoints are exposed |

### Threat Catalogue

| ID | Threat | Affected Component | STRIDE Category |
|---|---|---|---|
| T-01 | Unauthorized access to sensitive Kubernetes data via frontend plugin calls | All backend plugins | Spoofing / Elevation of Privilege |
| T-02 | SSRF — backend plugin forwards user-controlled URLs to internal services | Backends acting as proxies (ScaleOps, SpectroCloud, VCF) | Elevation of Privilege |
| T-03 | Credential leakage in logs or error responses | All backend plugins | Information Disclosure |
| T-04 | Cross-site scripting (XSS) through user-controlled content rendered in the SPA | All frontend plugins | Tampering / Information Disclosure |
| T-05 | Excessive data exposure through MCP actions to unauthorized agents | Catalog MCP, RBAC MCP, Scaffolder MCP, ScaleOps Backend, SpectroCloud Backend | Information Disclosure |
| T-06 | Privilege escalation via misconfigured Backstage permissions | All plugins using permission framework | Elevation of Privilege |
| T-07 | Dependency confusion or malicious npm package | All packages | Tampering |
| T-08 | OIDC token theft or replay | SpectroCloud Auth, VCF SSO Auth | Spoofing |
| T-09 | Injection through scaffolder action inputs written to filesystem | scaffolder-backend-module-terasky-utils, scaffolder-backend-module-spring-initializer | Tampering |
| T-10 | Insecure kubeconfig handling (logging, storing in memory longer than necessary) | kubernetes-ingestor, spectrocloud-cluster-provider, vcfa-vks-cluster-provider | Information Disclosure |

---

## 2. Trust Boundaries

A trust boundary is a point where data or code execution transitions between different levels of trust. The following boundaries exist in a deployment that includes these plugins.

### Boundary Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  User's Browser                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Backstage SPA (React, frontend plugins)                             │   │
│  │  Trust level: USER SESSION — authenticated but untrusted user input  │   │
│  └──────────────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────────────┼───────────────────────────────────────┘
                          BOUNDARY B1 │ HTTPS + Backstage auth cookie/token
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Backstage Backend Process (Node.js)                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Backend plugins (proxies, ingestors, permission checks)             │   │
│  │  Trust level: SERVER — service identity, validated tokens            │   │
│  └──────┬────────────────────┬───────────────────┬──────────────────────┘   │
└─────────┼────────────────────┼───────────────────┼─────────────────────────┘
BOUNDARY  │ B2                 │ B3                │ B4
 Kube API │ (TLS+SA token)     │ Cloud APIs        │ MCP clients
          ▼                    ▼ (TLS+API key)     ▼ (stdio / HTTP)
   ┌─────────────┐    ┌──────────────────┐   ┌───────────────────┐
   │ Kubernetes  │    │ VCF / SpectroCloud│   │ AI Agents / MCP   │
   │ API Servers │    │ ScaleOps APIs     │   │ Clients           │
   └─────────────┘    └──────────────────┘   └───────────────────┘
```

### Boundary Descriptions

| ID | Boundary | Data in Transit | Trust Transition |
|---|---|---|---|
| B1 | Browser ↔ Backstage Backend | Backstage REST API calls, entity data, UI assets | User session trust → server-validated identity |
| B2 | Backstage Backend ↔ Kubernetes API Servers | Kubernetes API requests (JSON/protobuf over TLS) | Server identity → cluster RBAC checks on service account |
| B3 | Backstage Backend ↔ Cloud Platform APIs | REST API calls over TLS with API keys or OIDC tokens | Server identity → platform API authorization |
| B4 | MCP Clients ↔ Backstage MCP Backend plugins | MCP protocol messages (stdio or HTTP/SSE) | AI agent identity → Backstage auth + permission checks |
| B5 | Backstage Backend ↔ Backstage Database | Entity catalog, tasks, session data | Server identity → database credentials |
| B6 | CI/CD Pipeline ↔ npm Registry | Package publishing | Build identity → npm token scoped to `@terasky` org |

### Key Controls at Each Boundary

**B1** — All browser-to-backend traffic must carry a valid Backstage session token. Backstage's built-in `IdentityService` validates the token on every request. Plugin backends never trust data from the frontend without re-validating identity.

**B2** — Kubernetes access uses minimal-privilege service accounts created per plugin (e.g. the Kubernetes Ingestor uses a read-only ClusterRole). Kubeconfigs are loaded from environment/secret at startup and are never echoed in API responses.

**B3** — API credentials for VCF, SpectroCloud, and ScaleOps are injected as environment variables or Kubernetes Secrets. They are never returned to the frontend and never logged.

**B4** — MCP endpoints enforce the same Backstage permission checks as the equivalent REST endpoints. The MCP server does not bypass the permission framework.

**B5** — Database credentials follow Backstage standard practice (environment variables, never hardcoded). The plugins themselves do not read from the database directly; they use Backstage's `CatalogClient` and `DatabaseService` abstractions.

**B6** — npm publishing uses an organisation-scoped token stored as a GitHub Actions secret. Packages are published from CI only, not from developer workstations.

---

## 3. Secure Design Principles

This section maps the eight Saltzer & Schroeder secure design principles to their application in these plugins.

### 3.1 Economy of Mechanism

**Principle:** Keep the design simple and small.

**Application:**  
Each plugin is scoped to a single domain (e.g. Crossplane resources, Kyverno policy reports). Shared functionality is factored into `-common` libraries rather than duplicated. Backend plugins act as thin, stateless proxies or data-fetchers rather than implementing complex business logic. The permission framework integration reuses Backstage's built-in `PermissionPolicy` interface rather than inventing a custom access control layer.

### 3.2 Fail-Safe Defaults

**Principle:** Base access decisions on permission rather than exclusion. The default is denial.

**Application:**  
All backend plugins that expose sensitive data (kubeconfigs, cloud credentials, RBAC policies) integrate with Backstage's permission framework. Permissions are defined with explicit `allow` rules; if no rule matches, the request is denied. Frontend components that depend on a successful permission check render an empty or restricted state when the check fails, rather than surfacing partial data.

### 3.3 Complete Mediation

**Principle:** Every access to every object must be checked for authority.

**Application:**  
Backend plugins never cache authorization decisions. Each API request passes through the Backstage `PermissionsService` independently. The MCP backends apply the same permission checks as the REST equivalents, ensuring AI agents cannot bypass authorisation by using the MCP transport instead of HTTP.

### 3.4 Open Design

**Principle:** The security of a mechanism should not depend on the secrecy of its design.

**Application:**  
All plugin code is published under the Apache 2.0 licence and is publicly auditable. Security-sensitive logic (permission definitions, credential handling) is in public code, not in obscured or minified bundles. The threat model and this assurance case are themselves publicly documented.

### 3.5 Separation of Privilege

**Principle:** Where feasible, a protection mechanism requiring two keys is more robust than one requiring a single key.

**Application:**  
Sensitive operations require both a valid Backstage user session **and** a satisfying permission policy. For example, the SpectroCloud kubeconfig download requires the user to be authenticated *and* to hold the `spectrocloud.kubeconfig.read` permission. The frontend and backend are separate packages, so a bug in frontend rendering cannot directly access backend credentials.

### 3.6 Least Privilege

**Principle:** Every program and user should operate with the least set of privileges necessary.

**Application:**  
- Kubernetes cluster access uses read-only `ClusterRole` / `Role` bindings wherever possible (Kubernetes Ingestor, Kubernetes Resources, Crossplane Resources).
- SpectroCloud and VCF API credentials are scoped to the minimum required permissions documented in each plugin's configuration guide.
- Node.js backend processes do not request elevated OS privileges.
- MCP action schemas declare only the parameters they need; they do not accept free-form execution instructions.

### 3.7 Least Common Mechanism

**Principle:** Minimise the amount of mechanism common to more than one user and depended on by all users.

**Application:**  
Plugins do not share credential stores or in-memory caches that could leak data between tenants. Each plugin has its own isolated configuration block. `-common` packages contain only type definitions and permission constants, not stateful singletons.

### 3.8 Psychological Acceptability

**Principle:** It is essential that the human interface be designed for ease of use so that users routinely and automatically apply the protection mechanisms correctly.

**Application:**  
- Plugin installation guides document the minimum required configuration and explain *why* each credential is needed.
- The `app-module-global-signin-page` plugin eliminates the need to write custom TypeScript for sign-in configuration, reducing the chance of misconfiguration.
- Permission definitions ship with human-readable names and descriptions that appear in Backstage's permission management UI.
- Error messages visible to end-users describe what access is required without exposing internal stack traces or credential details.

---

## 4. Common Implementation Security Weaknesses

This section addresses the [OWASP Top 10 (2021)](https://owasp.org/www-project-top-ten/) and selected [CWE/SANS Top 25](https://cwe.mitre.org/top25/) weaknesses, and explains how each is countered in these plugins.

### OWASP Top 10

#### A01 — Broken Access Control

**Risk:** Users act outside of their intended permissions.

**Countermeasures:**
- All backend endpoints that return sensitive data are gated on Backstage's `PermissionsService`.
- Permission definitions are declared in `-common` packages and enforced symmetrically in both the REST backend and MCP backend.
- Frontend components react to permission denials by hiding or disabling actions rather than just relying on server-side enforcement.
- Read the [Backstage Permissions documentation](https://backstage.io/docs/permissions/overview) for the underlying framework guarantees.

**Threats mitigated:** T-01, T-05, T-06

#### A02 — Cryptographic Failures

**Risk:** Sensitive data is exposed due to weak or absent cryptography.

**Countermeasures:**
- All communication with external APIs (Kubernetes, VCF, SpectroCloud, ScaleOps) is over TLS. Plugins do not support disabling TLS verification in production configurations.
- Credentials are never persisted to disk or included in log output. They are held in process memory only for the duration of a request where possible.
- OIDC token exchange (SpectroCloud Auth, VCF SSO Auth) relies on RS256-signed JWTs validated by the upstream provider.

**Threats mitigated:** T-03, T-08, T-10

#### A03 — Injection

**Risk:** Hostile data sent to an interpreter causes unintended commands.

**Countermeasures:**
- All frontend plugins use React's JSX rendering, which HTML-escapes content by default. No use of `dangerouslySetInnerHTML` with user-supplied data.
- Scaffolder actions that write files to the workspace use parameterised path construction and do not execute user-supplied strings as shell commands.
- Kubernetes resource names and namespaces sourced from user input are validated against Kubernetes naming constraints before being used in API calls.
- TypeScript's type system prevents large categories of injection by making untyped strings explicit at compile time.

**Threats mitigated:** T-04, T-09

#### A04 — Insecure Design

**Risk:** Missing or ineffective security controls due to poor architecture.

**Countermeasures:**
- This assurance case, the threat model, and the trust boundary analysis constitute the project's security design review artefacts.
- New backend endpoints follow the Backstage backend plugin conventions, which include authentication and permission scaffolding by default.
- Security requirements are documented in the plugin README files and in this assurance case.

#### A05 — Security Misconfiguration

**Risk:** Insecure default configuration, or incomplete setup.

**Countermeasures:**
- Each plugin's documentation explicitly lists which configuration values are required and which are optional, with explanations of the security implications.
- Plugins do not ship with insecure defaults (e.g. no `allow-all` permission policy is provided as an example without a clear security warning).
- The `SECURITY.md` file documents how to report vulnerabilities.

#### A06 — Vulnerable and Outdated Components

**Risk:** Components with known vulnerabilities are used.

**Countermeasures:**
- The repository has Dependabot enabled for npm dependency updates.
- `yarn audit` is part of the local development workflow and is referenced in the contributing guide.
- Backstage itself provides a dependency update cadence; this project tracks Backstage releases and updates compatible plugin versions accordingly.
- The project targets a specific, actively maintained Backstage version (currently `1.49.4`) and updates regularly.

#### A07 — Identification and Authentication Failures

**Risk:** Broken authentication allows attackers to assume other users' identities.

**Countermeasures:**
- Authentication is entirely delegated to Backstage's `AuthService` and the underlying identity providers (OIDC, OAuth2). These plugins do not implement their own authentication schemes.
- The auth-related plugins (SpectroCloud Auth, VCF SSO Auth) implement only the Backstage `AuthProviderFactory` interface, relying on Backstage's battle-tested session management.
- OIDC token validation (signature, expiry, audience) is performed by the upstream Backstage auth framework and by the identity provider.

**Threats mitigated:** T-08

#### A08 — Software and Data Integrity Failures

**Risk:** Code and infrastructure that is not protected against integrity violations.

**Countermeasures:**
- All packages are published to npm from GitHub Actions CI using a scoped npm token. Direct publish from developer machines is not part of the release process.
- The `package.json` files for each plugin specify exact peer dependency versions, reducing the risk of unexpected transitive dependency resolution.
- Commit signing is encouraged for maintainers (see `CONTRIBUTING.md`).

**Threats mitigated:** T-07

#### A09 — Security Logging and Monitoring Failures

**Risk:** Insufficient logging makes attacks invisible.

**Countermeasures:**
- All backend plugins use Backstage's `LoggerService` for structured logging.
- Significant security-relevant events (authentication failures, permission denials) are logged at `warn` or `error` level with enough context to identify the affected entity and user.
- Credentials and personally identifiable information are explicitly excluded from log statements. Backend errors are normalised before being sent to the frontend to avoid leaking internal details.

**Threats mitigated:** T-03

#### A10 — Server-Side Request Forgery (SSRF)

**Risk:** An attacker tricks the server into making requests to unintended destinations.

**Countermeasures:**
- Backend plugins that proxy requests to external systems (ScaleOps, SpectroCloud, VCF) construct the target URL from server-side configuration, not from user-supplied input. Users cannot supply arbitrary target hosts.
- The Kubernetes API access pattern uses kubeconfigs loaded at startup; the API server URL is not overrideable per-request by a frontend caller.
- MCP action handlers validate all input parameters against a declared JSON schema before processing.

**Threats mitigated:** T-02

---

### CWE/SANS Top 25 — Selected Items

| CWE | Weakness | Countermeasure |
|---|---|---|
| CWE-89 — SQL Injection | Not directly applicable (no raw SQL queries). Entity queries use Backstage's `CatalogClient` which abstracts the database layer. | Abstraction layer eliminates direct SQL. |
| CWE-79 — Cross-site Scripting | React JSX escapes all rendered strings by default. No use of `dangerouslySetInnerHTML` with untrusted data. YAML content in viewers (Crossplane, KRO) is rendered as pre-formatted text, not executed HTML. | React escaping + CSP headers on the Backstage server. |
| CWE-22 — Path Traversal | Scaffolder actions that write files use Backstage's `resolveSafeChildPath` utility to prevent writing outside the task workspace. | `resolveSafeChildPath` validation on all file write operations. |
| CWE-20 — Improper Input Validation | All MCP action inputs and scaffolder action inputs are validated against a declared JSON schema. Kubernetes resource names are validated before use in API calls. | JSON Schema validation + TypeScript types. |
| CWE-200 — Exposure of Sensitive Information | API credentials and kubeconfigs are never returned in API responses. Error messages are sanitised before reaching the frontend. | Explicit redaction of secrets in log and error handling code. |
| CWE-287 — Improper Authentication | Authentication is delegated entirely to Backstage's `AuthService`. No custom authentication logic in these plugins. | Backstage auth framework. |
| CWE-269 — Improper Privilege Management | The permission framework requires explicit allow rules. Service accounts use minimal-privilege roles. | Backstage permission framework + least-privilege service accounts. |
| CWE-918 — SSRF | Backend proxy endpoints construct target URLs from server-side config, not user input. | Server-side URL construction (see A10 above). |

---

## Revision History

| Date | Summary |
|---|---|
| 2026-04-09 | Initial assurance case created. |
