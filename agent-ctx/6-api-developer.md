---
## Task ID: 6 - api-developer (seed-messaging)
### Work Task
Create the `/api/demo/seed-messaging` one-time seed endpoint to populate demo data for the messaging AI flow.

### Work Summary
- Created `src/app/api/demo/seed-messaging/route.ts` with a single POST handler.
- **Tenant validation**: Checks that `DEMO_TENANT_ID` ("cmmxleln70000px3a43u36vum") exists before seeding; returns 404 if not found.
- **Pipeline stages**: Creates 10 stages (Sourced, Applied, Screening, Interviewing, DISC Test, Offered, Hired, Rejected, Withdrawn, No Response) with appropriate colors and flags (`isHired`/`isRejected`). Uses `findUnique` on `@@unique([tenantId, name])` to skip existing stages.
- **Job**: Upserts "Desenvolvedor Full Stack Sênior" (slug: `dev-fullstack-sr`) with `PUBLISHED` status, REMOTE/CLT, salary range 12k–20k BRL, and detailed requirements about React/Node.js/TypeScript. Uses `upsert` on `@@unique([tenantId, slug])`.
- **Candidates**: Creates 4 candidates (Ana Silva, Carlos Mendes, Juliana Costa, Pedro Santos) with `SOURCED` status, linked to the job and the "Sourced" pipeline stage. Checks by `tenantId + email` to avoid duplicates.
- **Campaign**: Creates "Outreach Dev Full Stack Q1" with `DRAFT` status, `MULTI_CHANNEL` source, `friendly` aiTone, linked to the job. Checks by `tenantId + name` to avoid duplicates.
- **Response**: Returns structured JSON with `created`/`skipped` counts per entity and a human-readable summary message.
- **Error handling**: Top-level try/catch with proper 500 responses and error message exposure.
- **Type safety**: Uses Prisma enums (`JobStatus`, `CandidateStatus`, `CampaignStatus`, `CampaignSource`) and typed `SeedResult` interface.
- File passes ESLint with 0 errors/warnings.
