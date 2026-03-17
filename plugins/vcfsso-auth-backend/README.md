# vcfsso-auth-backend

Welcome to the VCF SSO authentication backend module!

[![npm latest version](https://img.shields.io/npm/v/@terasky/backstage-plugin-vcfsso-auth-backend/latest.svg)](https://www.npmjs.com/package/@terasky/backstage-plugin-vcfsso-auth-backend)

The `vcfsso-auth-backend` module for Backstage integrates VCF SSO as an OIDC authentication provider for the Backstage auth backend. It uses the standard OIDC authenticator and includes a custom profile transform to handle VCF SSO's non-standard identity claims (the `acct` claim is used for the email address instead of the standard `email` claim).

For detailed docs go to https://terasky-oss.github.io/backstage-plugins/plugins/vcf-automation/vcfsso/backend/about

## Contributing
Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## License
This project is licensed under the Apache-2.0 License.
