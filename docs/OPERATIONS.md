# Operations

## Backups

```bash
./scripts/backup.sh ./backups
```

Dumps the Postgres database (`pg_dump`, gzipped) and archives the uploads directory.
Schedule it daily via host cron or a dedicated backup container. Copy the output
off-box — a backup on the same disk doesn't survive disk failure.

Restore with:

```bash
./scripts/restore.sh ./backups/db_20260101_020000.sql.gz
```

## Scheduled jobs

The app has no built-in job queue (deliberately, to avoid adding Redis/BullMQ
infrastructure for a 200-employee deployment). One maintenance task is exposed as a
protected HTTP endpoint, meant to be called by host-level cron:

- **Monthly leave accrual** — `POST /api/cron/accrue-leave` with header
  `Authorization: Bearer $CRON_SECRET`. Adds each paid leave type's
  `defaultDaysPerYear / 12` to every active employee's balance for the current year.
  Schedule it once a month; calling it more than once in the same month double-accrues.

  ```cron
  0 2 1 * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/accrue-leave
  ```

## Encryption at rest

`ENCRYPTION_KEY` (32 bytes, base64) encrypts `Employee.bankAccountNumber` and
`Employee.nationalId` at the application layer (AES-256-GCM, see `src/lib/crypto.ts`).
Losing this key makes existing encrypted values unrecoverable — back it up separately
from the database, not alongside it.

Salary figures (`EmployeeSalary.basicSalary`, `EmployeeSalaryComponent.amount`) are
**not** column-encrypted: they're used in plain arithmetic throughout payroll
calculations and reporting, with no SQL-level aggregation to preserve, but converting
them to encrypted strings would touch core payroll logic for little real benefit given
RBAC already restricts who can see them and every change is now audit-logged. If you
need encryption-at-rest to cover these numeric fields too, do it at the
database/disk layer (e.g., an encrypted volume, or Postgres transparent data
encryption), not in the application.

## Password resets

There's no email service configured, so password resets are admin-initiated:
an admin generates a one-time link from an employee's profile page and shares it with
the user out-of-band (Slack, in person, etc.). The link expires in 1 hour and can only
be used once. Any logged-in user can also change their own password from the account
menu → "Change password".

## Audit log

Every sensitive write (salary changes, employment changes, leave decisions, payroll
runs, bank/national ID edits, password resets) is recorded in `AuditLog` with the
acting user, a timestamp, and a human-readable summary. View it at `/audit-log`
(Super Admin / HR Admin only).

## Rate limiting

Login attempts are rate-limited in-memory (5 attempts per 15 minutes per email,
`src/lib/rate-limit.ts`). This is per-process state — fine for the single-instance
self-hosted deployment this app targets; a horizontally-scaled deployment behind a
load balancer would need to move this to a shared store (Redis) since each instance
would otherwise track its own counters.
