# Vikunja on Railway

Reproducible Railway infrastructure for a personal or independently deployed
[Vikunja](https://github.com/go-vikunja/vikunja) instance.

## Architecture

| Resource   | Configuration                                                                    |
| ---------- | -------------------------------------------------------------------------------- |
| `vikunja`  | Official image pinned in `.railway/docker-images.json`, one replica, port `3456` |
| `postgres` | Railway-managed PostgreSQL used over the private network                         |
| `files`    | Railway S3-compatible bucket in the US East (`iad`) region                       |

The deployment uses Vikunja's `/api/v1/info` endpoint as its health check.
Application sleeping is intentionally disabled because Vikunja performs
background work such as reminders.

## Environment variables

| Name                            | Service   | Required | Secret | Source                                    | Purpose                                         | Example                              |
| ------------------------------- | --------- | -------- | ------ | ----------------------------------------- | ----------------------------------------------- | ------------------------------------ |
| `PORT`                          | `vikunja` | Yes      | No     | Literal                                   | Railway HTTP target port                        | `3456`                               |
| `VIKUNJA_SERVICE_INTERFACE`     | `vikunja` | Yes      | No     | Literal                                   | Address and port Vikunja listens on             | `:3456`                              |
| `VIKUNJA_SERVICE_PUBLICURL`     | `vikunja` | Yes      | No     | Railway runtime reference                 | Public URL used by the API and frontend         | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `VIKUNJA_SERVICE_SECRET`        | `vikunja` | Yes      | Yes    | User-provided, retained with `preserve()` | Signs tokens and other cryptographic data       | Generate with `openssl rand -hex 32` |
| `VIKUNJA_DATABASE_TYPE`         | `vikunja` | Yes      | No     | Literal                                   | Selects PostgreSQL                              | `postgres`                           |
| `VIKUNJA_DATABASE_HOST`         | `vikunja` | Yes      | No     | PostgreSQL resource reference             | Private database host and port                  | Railway-managed                      |
| `VIKUNJA_DATABASE_USER`         | `vikunja` | Yes      | No     | PostgreSQL resource reference             | Database user                                   | Railway-managed                      |
| `VIKUNJA_DATABASE_PASSWORD`     | `vikunja` | Yes      | Yes    | PostgreSQL resource reference             | Database password                               | Railway-managed                      |
| `VIKUNJA_DATABASE_DATABASE`     | `vikunja` | Yes      | No     | PostgreSQL resource reference             | Database name                                   | Railway-managed                      |
| `VIKUNJA_DATABASE_SSLMODE`      | `vikunja` | Yes      | No     | Literal                                   | Uses Railway's private network without TLS      | `disable`                            |
| `VIKUNJA_FILES_TYPE`            | `vikunja` | Yes      | No     | Literal                                   | Selects S3-compatible attachment storage        | `s3`                                 |
| `VIKUNJA_FILES_S3_ENDPOINT`     | `vikunja` | Yes      | No     | Bucket resource reference                 | S3 API endpoint                                 | Railway-managed                      |
| `VIKUNJA_FILES_S3_BUCKET`       | `vikunja` | Yes      | No     | Bucket resource reference                 | Globally unique S3 bucket name                  | Railway-managed                      |
| `VIKUNJA_FILES_S3_REGION`       | `vikunja` | Yes      | No     | Bucket resource reference                 | S3 region                                       | Railway-managed                      |
| `VIKUNJA_FILES_S3_ACCESSKEY`    | `vikunja` | Yes      | Yes    | Bucket resource reference                 | S3 access key ID                                | Railway-managed                      |
| `VIKUNJA_FILES_S3_SECRETKEY`    | `vikunja` | Yes      | Yes    | Bucket resource reference                 | S3 secret access key                            | Railway-managed                      |
| `VIKUNJA_FILES_S3_USEPATHSTYLE` | `vikunja` | Yes      | No     | Literal                                   | Uses Railway's virtual-hosted-style bucket URLs | `false`                              |

Additional Vikunja settings can be added to the `env` block using the
documented `VIKUNJA_<SECTION>_<KEY>` naming convention.

## Deploy

Install the pinned Railway IaC dependency:

```sh
npm install
```

Authenticate and create or link an empty Railway project:

```sh
railway login
railway init --name railway-vikunja
```

Review the proposed infrastructure before applying it:

```sh
railway config plan
railway config apply
```

After the initial apply, set a unique stable application secret without
committing it:

```sh
openssl rand -hex 32 | railway variable set VIKUNJA_SERVICE_SECRET --stdin --service vikunja
```

Generate the public Railway domain, targeting Vikunja's HTTP port:

```sh
railway domain --service vikunja --port 3456 --json
railway redeploy --service vikunja --yes
```

The redeploy resolves `VIKUNJA_SERVICE_PUBLICURL` from
`RAILWAY_PUBLIC_DOMAIN`. Wait for a successful deployment and verify
`https://<generated-domain>/api/v1/info` before creating an account.

## Registration

Vikunja allows registration by default. Create the first account, then set
`VIKUNJA_SERVICE_ENABLEREGISTRATION=false` on the `vikunja` service if this
will be a private instance.

## Persistence and backups

PostgreSQL contains users, projects, tasks, and application metadata. The
`files` bucket contains uploaded task attachments. Back up both resources on
the same schedule so their state remains consistent.

Enable Railway backups for PostgreSQL before storing important data. Railway
does not currently provide automatic bucket backups, so separately copy the
bucket's objects to offsite S3-compatible storage. Test restores into a
separate Railway project; do not test a restore by overwriting the active
instance.

## Upgrades

1. Read the Vikunja release notes and migration guidance.
2. Back up PostgreSQL and the `files` bucket.
3. Use `CHECK_RAILWAY_DOCKER_IMAGE_UPDATES`, or the canonical
   `@reggi/knitto` image command locally, to propose a patch or
   minor change in `.railway/docker-images.json`.
4. Review and merge the image update pull request deliberately.
5. Run `railway config plan` and review the exact changes.
6. Apply only after approval, then wait for a successful health check.

Vikunja runs database migrations during startup. Do not roll back to an older
image after a migration unless the release notes explicitly confirm that the
database schema is backward compatible.
