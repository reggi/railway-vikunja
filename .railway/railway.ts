import {
  bucket,
  defineRailway,
  image,
  postgres,
  preserve,
  project,
  service,
} from "railway/iac";

export default defineRailway(() => {
  const database = postgres("postgres");
  const files = bucket("files", {
    region: "iad",
  });

  const vikunja = service("vikunja", {
    source: image("ghcr.io/go-vikunja/vikunja:2.6.0"),
    healthcheck: "/api/v1/info",
    healthcheckTimeout: 60,
    replicas: 1,
    env: {
      PORT: "3456",
      VIKUNJA_SERVICE_INTERFACE: ":3456",
      VIKUNJA_SERVICE_PUBLICURL:
        "https://${{RAILWAY_PUBLIC_DOMAIN}}",
      VIKUNJA_SERVICE_SECRET: preserve(),
      VIKUNJA_DATABASE_TYPE: "postgres",
      VIKUNJA_DATABASE_HOST: database.env.PGHOST,
      VIKUNJA_DATABASE_USER: database.env.PGUSER,
      VIKUNJA_DATABASE_PASSWORD: database.env.PGPASSWORD,
      VIKUNJA_DATABASE_DATABASE: database.env.PGDATABASE,
      VIKUNJA_DATABASE_SSLMODE: "disable",
      VIKUNJA_FILES_TYPE: "s3",
      VIKUNJA_FILES_S3_ENDPOINT: "${{files.ENDPOINT}}",
      VIKUNJA_FILES_S3_BUCKET: "${{files.BUCKET}}",
      VIKUNJA_FILES_S3_REGION: "${{files.REGION}}",
      VIKUNJA_FILES_S3_ACCESSKEY: "${{files.ACCESS_KEY_ID}}",
      VIKUNJA_FILES_S3_SECRETKEY: "${{files.SECRET_ACCESS_KEY}}",
      VIKUNJA_FILES_S3_USEPATHSTYLE: "false",
    },
  });

  return project("railway-vikunja", {
    resources: [database, files, vikunja],
  });
});
