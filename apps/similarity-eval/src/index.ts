import { createProgram } from './cli.js';
import { createBenchmarkCommand } from './benchmark/benchmarkCommand.js';

const program = createProgram();
program.enablePositionalOptions();
program.addCommand(createBenchmarkCommand());
program.parse();
