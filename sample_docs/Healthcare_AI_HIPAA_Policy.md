# ApexHealth Technologies - HIPAA Compliance & Clinical AI Security Policy

## 1. Scope & Executive Overview
This document defines mandatory governance policies for deploying Generative AI and Retrieval-Augmented Generation (RAG) systems across ApexHealth hospital networks and patient portal infrastructure.

## 2. Patient Data Protection & Encryption Standards
All Protected Health Information (PHI) and electronic health records (ePHI) ingested into the document processing pipeline must adhere to the following encryption standards:
- **Data at Rest**: Encrypted using AES-256 (Advanced Encryption Standard with 256-bit keys) with AWS KMS Customer Managed Keys (CMK) rotated annually.
- **Data in Transit**: Enforced TLS 1.3 encryption across all internal microservices and external WebDAV/Nextcloud storage connections.
- **De-Identification**: Direct identifiers (Patient Full Name, Social Security Number, National Health ID, and biometric markers) must undergo automatic masking or pseudonymization via HIPAA Safe Harbor protocol before embedding into vector stores.

## 3. Large Language Model (LLM) Fine-Tuning Restrictions
To prevent accidental training memorization or extraction attacks:
- Foundational models (such as Claude 3.5 Sonnet or Amazon Titan) must never be fine-tuned directly on raw patient case histories.
- All GenAI inference must execute strictly via ephemeral RAG prompt synthesis with zero data retention policies on provider API endpoints.

## 4. Incident Response & Mandatory Audit Logging
- **Audit Log Retention**: Access logs for all vector queries and WebDAV file downloads must be immutable and retained for a minimum of **7 years** in accordance with 45 CFR § 164.316(b)(2).
- **Breach Notification SLA**: Any suspected unauthorized access or exfiltration of ePHI requires immediate incident classification and formal notification to the Compliance Office within **24 hours**.

## 5. Storage Architecture & Backup
- Document artifacts uploaded via DocuMind AI are dual-persisted to internal Nextcloud on-premise storage (`/DocuMind` namespace) and HIPAA-compliant private S3 buckets with Object Lock enabled.
