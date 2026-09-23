#!/usr/bin/env node
import { build, context } from 'esbuild';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = new Set(process.argv.slice(2));
for (const arg of args) {
  if (!['--watch', '--serve'].includes(arg)) {
    throw new Error(`Unknown argument: ${arg}`);
  }
}
const serve = args.has('--serve');
const watch = args.has('--watch') || serve;
const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, 'movie-catalog/public');
const outDir = path.join(publicDir, 'assets/dist');
const options = [
  {
    entryPoints: [path.join(publicDir, 'assets/js/app.js')],
    bundle: true,
    minify: true,
    sourcemap: true,
    format: 'esm',
    target: ['es2020'],
    outfile: path.join(outDir, 'bundle.js'),
    logLevel: 'info'
  },
  {
    entryPoints: [path.join(publicDir, 'assets/css/bundle-entry.css')],
    bundle: true,
    minify: true,
    sourcemap: true,
    outfile: path.join(outDir, 'bundle.css'),
    logLevel: 'info'
  }
];

if (!watch) {
  await Promise.all(options.map(option => build(option)));
  console.log(`Bundles written to ${outDir}`);
} else {
  const contexts = [];
  let server;
  let stopping = false;

  async function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    server?.kill('SIGTERM');
    await Promise.all(contexts.map(buildContext => buildContext.dispose()));
    process.exitCode = code;
  }

  process.once('SIGINT', () => { void stop(); });
  process.once('SIGTERM', () => { void stop(); });

  try {
    // Build once before starting PHP so it cannot serve an outdated bundle.
    for (const option of options) contexts.push(await context(option));
    await Promise.all(contexts.map(buildContext => buildContext.rebuild()));
    await Promise.all(contexts.map(buildContext => buildContext.watch()));
    console.log('Watching JS and CSS. Reload the browser after changes.');

    if (serve) {
      const host = process.env.HOST || '0.0.0.0';
      const port = Number(process.env.PORT || 8080);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT must be an integer between 1 and 65535');
      }
      server = spawn('php', ['-S', `${host}:${port}`, '-t', publicDir], {
        cwd: root,
        stdio: 'inherit'
      });
      server.once('error', error => {
        console.error(`Unable to start PHP (install PHP 8.3+ and put it on PATH): ${error.message}`);
        void stop(1);
      });
      server.once('exit', (code, signal) => {
        if (!stopping) void stop(code ?? (signal ? 1 : 0));
      });
    }
  } catch (error) {
    console.error(error.message);
    await stop(1);
  }
}
