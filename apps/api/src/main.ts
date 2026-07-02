// apps/api/src/main.ts
//
// Bootstrap the ChatRealty product API (standalone NestJS / Express).
//
// ENV: load the repo-root .env.local BEFORE importing AppModule, because the
// reused core reads process.env at import time (MONGODB_URI in src/lib/mongoose,
// SECRETS_ENCRYPTION_KEY in src/lib/secrets). __dirname at runtime is
// dist/apps/api/src, so the repo root is four levels up; in ts-node dev it is
// apps/api/src, three levels up. We try a couple of candidate paths so both work.

import "reflect-metadata";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

function loadRepoEnv(): void {
  const candidates = [
    // From dist/apps/api/src → repo root is ../../../../
    resolve(__dirname, "../../../../.env.local"),
    // From apps/api/src (ts-node dev) → repo root is ../../../
    resolve(__dirname, "../../../.env.local"),
    // CWD fallback (running from repo root).
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "../../.env.local"),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      loadEnv({ path });
      return;
    }
  }
  // Fall back to default dotenv behavior (process.cwd()/.env) — non-fatal.
  loadEnv();
}

loadRepoEnv();

import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { CoreExceptionFilter } from "./common/core-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global /v1 prefix for every route.
  app.setGlobalPrefix("v1");

  // Validate + strip unknown query/body props.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Reuse the Next app's centralized error mapper for thrown core errors.
  app.useGlobalFilters(new CoreExceptionFilter());

  // Swagger / OpenAPI at /docs with the crt_live bearer scheme.
  const swaggerConfig = new DocumentBuilder()
    .setTitle("ChatRealty API")
    .setDescription(
      "Headless real-estate backend. Reuses the ChatRealty core (tenant resolver + DB adapters) from the Next app's src/lib. Authenticate with a crt_live_* bearer token.",
    )
    .setVersion("1.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "crt_live",
        description: "A crt_live_* API token minted in Settings → Integrations.",
      },
      "crt_live",
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(
    `ChatRealty API listening on http://localhost:${port}/v1  (docs: http://localhost:${port}/docs)`,
  );
}

bootstrap();
