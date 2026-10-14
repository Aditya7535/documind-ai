# SentinelOne Enterprise - Cybersecurity Incident Response & Ransomware Playbook

## 1. Incident Classification & Response SLAs
Security incidents detected by the Security Operations Center (SOC) are categorized into three severity levels:
- **Tier 1 (Critical)**: Active ransomware infection, unauthorized administrative domain access, or data exfiltration in progress.
  - Initial Response SLA: **15 minutes**.
  - Escalation: Immediate mobilization of the Executive Cyber Crisis Team.
- **Tier 2 (High)**: Compromised employee credential, lateral movement alerts, or brute-force attacks against Nextcloud storage gateways.
  - Initial Response SLA: **1 hour**.
- **Tier 3 (Medium)**: Isolated malware detection halted by endpoint EDR.
  - Initial Response SLA: **4 hours**.

## 2. Containment Procedures for Storage & Nextcloud Repositories
Upon confirmation of a Tier 1 incident affecting file servers:
1. **Network Isolation**: Sever outbound WAN connectivity from Nextcloud Apache instances immediately while keeping internal Docker container bridge networking intact for forensic telemetry capture.
2. **Snapshot Preservation**: Trigger instant Point-in-Time snapshots of the MariaDB relational database and Nextcloud persistent volumes (`/var/www/html/data`).
3. **Session Revocation**: Invalidate all active WebDAV API tokens and force an administrative password reset across all user directories.

## 3. Ransomware Policy & Negotiation Guidelines
- **Zero-Ransom Directive**: SentinelOne enforces a strict policy against paying ransoms or extortion demands under any circumstances.
- **Authority**: Only the Chief Legal Officer (CLO) and Chief Executive Officer (CEO) jointly possess legal authority to communicate with external ransomware adversaries.

## 4. Recovery & RAG Document Re-Indexing
Following forensic sign-off:
- Storage volumes must be re-scanned using ClamAV signature engines.
- Re-index all sanitized documents into the DocuMind Vector Engine using the Nextcloud WebDAV synchronization endpoint.
