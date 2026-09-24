# AGENT.md

This document describes how I used AI while building the Lead Intake Service: the tools, the prompts, the AI-generated and manually written parts, and the architecture decisions behind the solution.

My approach was to use AI as a fast implementation partner while keeping ownership of the design: I defined what the system had to guarantee, reviewed each proposal against those guarantees, and verified the result by running it.


## 1. AI tools used

Architecture discussion, code generation for backend and frontend, tests, Docker and CI configuration, and documentation drafts. It also ran commands in the terminal (installs, migrations, test runs, `docker compose`, `curl` checks), so generated code was verified against a running system rather than accepted as written. |


## 2. Prompts

Key prompts, grouped by phase.
### Design

> Here is the assignment for a Lead Intake Service. Analyse the requirements and propose how to implement it: the tech stack, the data model, how the Meta webhook should be processed, how the audit trail should work, how to test it, and a plan to finish within five days.

> Explain step by step how this should be deployed, using free services and without relying on any cloud account that isn't mine.

### Implementation

> Implement the complete solution based on the agreed plan: backend, frontend, tests, Docker setup, CI, README and AGENT.md.

### Verification and understanding

> How do I run the full system locally and check that each feature works?

> How is a new lead created in this system, and why is there no "create lead" button in the UI?

> What questions could an interviewer ask about this design, and how should the key decisions be explained?

---

## 3. AI-generated sections



| Area |
|---|---|
| **Backend** | Express app setup, environment validation, logging, error handling; Meta signature verification, payload validation and field mapping; idempotent lead ingestion; list, detail and status endpoints; status state machine; optimistic locking; demo seed script. |
| **Database** | Prisma schema and initial migration. |
| **Frontend** | API client and data-fetching hooks; lead list, lead detail, status form, activity timeline; loading, empty and error states; theme. |
| **Tests** | 52 backend tests (unit and integration against real PostgreSQL) and 13 frontend tests. |
| **Infrastructure** | Dockerfiles, nginx configuration, `docker-compose.yml`, test webhook script, GitHub Actions CI. |
| **Documentation** | First drafts of `README.md` and this file. |

---

## 4. Manually written sections

| Area | What I did |
|---|---|
| **Architecture** | Owned the architecture described in section 5. I defined the four guarantees the system must meet (no duplicate leads, no unaudited change, no fake leads, no lost updates), evaluated each design option against them, and decided on the final design: the data model, idempotent webhook ingestion, transactional audit trail, status state machine with optimistic locking, and the deployment approach. |

---

## 5. Architecture decisions

These are the decisions I made for the system, and why.

### What the system must guarantee

Before choosing an implementation, I set four requirements:

1. **No duplicate leads**, even though Meta retries webhook deliveries.
2. **No change without an audit record.** Every create, update and status change must appear in the timeline.
3. **No fake leads.** Only genuine Meta deliveries may create leads.
4. **No lost updates** when two people change the same lead at once.

Every decision below follows from one of these.

### Decisions

| # | Decision | Why |
|---|---|---|
| 1 | **Deduplicate on `(source, external_id)`**, where `external_id` is Meta's `leadgen_id` | Meta provides no delivery ID, but `leadgen_id` is stable per lead. One unique constraint gives de-duplication, and the same code path handles genuine updates. Concurrent duplicates hit the constraint and are retried as updates; a test sends five in parallel and asserts a single lead. |
| 2 | **Write the audit record in the same transaction as the change** | The change and its activity succeed or fail together, so the timeline can never disagree with the data. The activity recorder only accepts a transaction client, which makes an unaudited write hard to introduce. |
| 3 | **Store field-level diffs, and skip no-ops** | `LEAD_UPDATED` shows exactly which fields changed, from what to what. Repeated deliveries and unchanged statuses create nothing, so the timeline stays meaningful. |
| 4 | **Verify the HMAC signature on the raw request body** | Meta signs the exact bytes it sends, so verification must run before JSON parsing. Unsigned or tampered requests are rejected with `401` before touching the database. |
| 5 | **Leads enter only through the webhook** | Meta is the source of truth. A browser "create" button would need the webhook secret or an unauthenticated endpoint. Manual entry would be a separate, authenticated endpoint using the same ingestion and audit path. |
| 6 | **Status is owned by the sales team, never by the webhook** | A new delivery from Meta must never undo a salesperson's progress. |
| 7 | **Explicit status state machine** | Allowed transitions are defined in one place. Invalid moves return `422` with the allowed options, and the UI only offers valid next steps. |
| 8 | **Optimistic locking with a version number** | Two simultaneous status changes cannot silently overwrite each other: one succeeds, the other gets `409` and the UI reloads the lead. |
| 9 | **Store every raw webhook delivery** | Deliveries are kept in `webhook_events` with their processing status, which supports debugging and replay, and is the starting point for queue-based processing at higher volume. |
| 10 | **Keep Meta-specific logic in one module** | Only the webhook module understands Meta's format; everything else works with a generic lead. A new source (e.g. Google Ads) only needs a new adapter. |
| 11 | **Integration tests against real PostgreSQL** | Constraints, locking and transactions are the core of this service, and mocks cannot prove them. |
| 12 | **One repository, one `docker compose up`** | The whole system runs with a single command, and the API contract lives next to its client. |
| 13 | **Neon + Render + Vercel for deployment** | Free, HTTPS by default (required by Meta webhooks), and deployed directly from GitHub. |

### Problems caught during review and testing

Testing the running system surfaced several issues that were fixed before submission:

| Problem | Fix |
|---|---|
| The JSON body parser would consume the request before the signature could be verified. | The webhook route is registered before the JSON parser and verifies the raw body. |
| The status form was re-created after every refresh, which would have hidden the `409` "changed by someone else" message. | The form now resets only after a successful update and ignores statuses that are no longer allowed. |
| Re-running the demo seed on each container start would have produced false `LEAD_UPDATED` activities. | The seed skips when demo data already exists. |
| The API Docker image was 1.1 GB because of a redundant file-ownership layer. | Removed the recursive `chown`, reducing the image to about 700 MB. |
| Prisma 7 introduced a significantly different configuration model. | Pinned Prisma 6.19 for stability and documented the trade-off in the README. |

### Verification

- Checked every endpoint against a running server: lead creation, duplicate delivery, update, invalid signature, subscription handshake, pagination, validation, each status transition, and the `409` and `422` responses.
- All automated tests pass (backend 52/52, frontend 13/13); type checking and linting are clean.
- Ran the complete stack in Docker, including migrations and seeding on startup, the nginx API proxy, deep links to lead pages, and a signed webhook through the proxy.
