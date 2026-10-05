import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("usage: node scripts/log.mjs <logfile> <command> [...args]");
  process.exit(1);
}

const [logFile, ...commandArgs] = args;

if (commandArgs.length === 0) {
  console.error("usage: node scripts/log.mjs <logfile> <command> [...args]");
  process.exit(1);
}

const target = resolve(process.cwd(), logFile);
const dir = dirname(target);

if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const stream = createWriteStream(target, { flags: "a" });
const write = (chunk) => {
  stream.write(chunk);
};

const child = spawn(commandArgs[0], commandArgs.slice(1), {
  stdio: ["inherit", "pipe", "pipe"],
  env: process.env,
  shell: process.platform === "win32",
});

child.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  write(chunk);
});

child.stderr.on("data", (chunk) => {
  process.stderr.write(chunk);
  write(chunk);
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});

child.on("close", (code, signal) => {
  stream.end(() => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
});