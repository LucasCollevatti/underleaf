# Reporting a security vulnerability

Do not open a public issue with credentials, tokens, document contents or an
unfixed vulnerability.

This repository uses GitHub Private Vulnerability Reporting. The repository
owner must keep **Settings → Security → Private vulnerability reporting**
enabled. When it is enabled, submit a private report through:

<https://github.com/LucasCollevatti/underleaf/security/advisories/new>

If that private form is unavailable, contact the repository owner through an
existing private channel and do not disclose the details publicly. Include the
affected commit/version, deployment mode, reproduction steps, impact and a
safe mitigation. Redact secrets and personal or document data from logs.

The project is self-hosted: operators must also rotate exposed credentials,
restrict the affected service to the trusted LAN/VPN, preserve relevant private
logs, and record the remediation in their own incident process.
