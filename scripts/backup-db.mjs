import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";

dotenv.config();

const execFileAsync = promisify(execFile);

function ensureEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value.trim();
}

function formatPart(value) {
  return String(value).padStart(2, "0");
}

function makeTimestamp(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = formatPart(date.getUTCMonth() + 1);
  const day = formatPart(date.getUTCDate());
  const hour = formatPart(date.getUTCHours());
  const minute = formatPart(date.getUTCMinutes());
  const second = formatPart(date.getUTCSeconds());
  return `${year}-${month}-${day}_${hour}-${minute}-${second}_UTC`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolvePgDumpPath() {
  const configured = process.env.PG_DUMP_PATH?.trim();
  if (configured) return configured;
  return "pg_dump";
}

function normalizeDatabaseUrlForPgTools(databaseUrl) {
  const url = new URL(databaseUrl);

  url.searchParams.delete("schema");

  return url.toString();
}

async function run() {
  const databaseUrl = ensureEnv("DATABASE_URL");
  const pgDatabaseUrl = normalizeDatabaseUrlForPgTools(databaseUrl);

  const rootDir = process.cwd();
  const backupDir = path.join(rootDir, "backups");
  const timestamp = makeTimestamp();
  const fileName = `v2crm_${timestamp}.dump`;
  const outputFile = path.join(backupDir, fileName);
  const pgDumpPath = resolvePgDumpPath();

  ensureDir(backupDir);

  console.log("Iniciando backup...");
  console.log(`Saída: ${outputFile}`);

  const args = [
    "--dbname",
    pgDatabaseUrl,
    "--format=custom",
    "--file",
    outputFile,
    "--verbose",
    "--no-owner",
    "--no-privileges",
  ];

  const { stdout, stderr } = await execFileAsync(pgDumpPath, args, {
    env: { ...process.env, DATABASE_URL: pgDatabaseUrl },
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 20,
  });

  if (stdout?.trim()) console.log(stdout.trim());
  if (stderr?.trim()) console.log(stderr.trim());

  if (!fs.existsSync(outputFile)) {
    throw new Error("O arquivo de backup não foi criado.");
  }

  const stat = fs.statSync(outputFile);
  console.log(`Backup concluído. Tamanho: ${stat.size} bytes`);
}

run().catch((error) => {
  console.error(
    "Falha no backup:",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});