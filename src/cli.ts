import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { Studio } from './application.js';
import { doctor } from './process.js';
import { serve } from './server.js';
import { StudioError, errorInfo, type Project } from './domain.js';

const help = `Paper Studio — internal animation prototype
Usage: npm run studio -- <command> [arguments] [--data ./data]
  doctor
  serve [--port 4310]
  create <script.txt> [--title "Film"] [--style paper-cut|multiplane|shadow-box] [--language vi|en]
  list
  show <project-id>
  voice <project-id>
  render <project-id> [--profile preview|final]
  export <project-id> <package.json>
  import <package.json>
  retry <job-id>
CLI and server cannot simultaneously own the same data directory.
`;

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      data: { type: 'string' },
      port: { type: 'string' },
      title: { type: 'string' },
      style: { type: 'string' },
      language: { type: 'string' },
      profile: { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  const [command, ...args] = positionals;
  if (!command || values.help) {
    process.stdout.write(help);
    return;
  }
  if (command === 'doctor') {
    console.log(JSON.stringify(await doctor(), null, 2));
    return;
  }
  const app = await Studio.open(path.resolve(values.data ?? process.env.STUDIO_DATA ?? 'data'));
  const required = (index: number) => {
    const value = args[index];
    if (!value) throw new StudioError('MISSING_ARGUMENT', help);
    return value;
  };
  const output = (value: unknown) => console.log(JSON.stringify(value, null, 2));
  try {
    switch (command) {
      case 'serve': {
        const port = Number(values.port ?? 4310);
        if (!Number.isInteger(port) || port < 1 || port > 65535)
          throw new StudioError('INVALID_PORT', 'Port phải từ 1–65535.');
        const server = await serve(app, port);
        console.log(`Paper Studio: ${server.url}`);
        await new Promise<void>((resolve) => {
          process.once('SIGINT', resolve);
          process.once('SIGTERM', resolve);
        });
        await server.close();
        break;
      }
      case 'create': {
        const language = values.language ?? 'vi';
        if (language !== 'vi' && language !== 'en')
          throw new StudioError('INVALID_LANGUAGE', 'language phải vi hoặc en.');
        output(
          await app.create(
            await readFile(required(0), 'utf8'),
            values.title ?? 'Untitled',
            values.style ?? 'paper-cut',
            language,
          ),
        );
        break;
      }
      case 'list':
        output(await app.store.list<Project>('projects'));
        break;
      case 'show':
        output(await app.snapshot(required(0)));
        break;
      case 'voice': {
        const { project } = await app.store.current(required(0));
        output(await app.voice(project.id, project.currentRevisionId));
        break;
      }
      case 'render': {
        const { project } = await app.store.current(required(0));
        const job = await app.enqueue(
          project.id,
          project.currentRevisionId,
          values.profile ?? 'preview',
        );
        const done = await app.wait(job.id);
        output(done);
        if (done.status !== 'succeeded') process.exitCode = 1;
        break;
      }
      case 'retry': {
        const job = await app.retry(required(0)),
          done = await app.wait(job.id);
        output(done);
        if (done.status !== 'succeeded') process.exitCode = 1;
        break;
      }
      case 'export':
        await writeFile(required(1), JSON.stringify(await app.export(required(0)), null, 2) + '\n');
        output({ file: path.resolve(required(1)) });
        break;
      case 'import':
        output(await app.import(JSON.parse(await readFile(required(0), 'utf8'))));
        break;
      default:
        throw new StudioError('UNKNOWN_COMMAND', help);
    }
  } finally {
    await app.close();
  }
}
main().catch((error) => {
  console.error(JSON.stringify({ error: errorInfo(error) }));
  process.exitCode = 1;
});
