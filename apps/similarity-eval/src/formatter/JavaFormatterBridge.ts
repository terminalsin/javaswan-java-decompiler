import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class JavaFormatterBridge {
  constructor(private readonly formatterJarPath: string) {}

  async format(sourceContent: string): Promise<string> {
    const { stdout } = await execFileAsync(
      'java',
      ['-jar', this.formatterJarPath],
      {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30_000,
        encoding: 'utf-8',
      },
    );
    // execFile with input requires passing through stdin
    return stdout;
  }

  async formatWithStdin(sourceContent: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = execFile(
        'java',
        ['-jar', this.formatterJarPath],
        {
          maxBuffer: 10 * 1024 * 1024,
          timeout: 30_000,
          encoding: 'utf-8',
        },
        (err, stdout, stderr) => {
          if (err) {
            reject(new Error(stderr || err.message));
          } else {
            resolve(stdout);
          }
        },
      );
      proc.stdin!.write(sourceContent);
      proc.stdin!.end();
    });
  }
}
