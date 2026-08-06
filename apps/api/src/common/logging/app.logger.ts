import { ConsoleLogger, type LogLevel, type LoggerService } from '@nestjs/common';

/**
 * Production-da JSON sətirlər; development-də Nest ConsoleLogger.
 */
export function createAppLogger(): LoggerService {
  if ((process.env.NODE_ENV ?? 'development') !== 'production') {
    return new ConsoleLogger('API');
  }

  const logger: LoggerService = {
    log(message: unknown, ...optionalParams: unknown[]) {
      write('log', message, optionalParams);
    },
    error(message: unknown, ...optionalParams: unknown[]) {
      write('error', message, optionalParams);
    },
    warn(message: unknown, ...optionalParams: unknown[]) {
      write('warn', message, optionalParams);
    },
    debug(message: unknown, ...optionalParams: unknown[]) {
      write('debug', message, optionalParams);
    },
    verbose(message: unknown, ...optionalParams: unknown[]) {
      write('verbose', message, optionalParams);
    },
  };

  return logger;
}

function write(level: LogLevel | string, message: unknown, optionalParams: unknown[]) {
  const context =
    typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
  const payload = {
    level,
    time: new Date().toISOString(),
    ...(context ? { context } : {}),
    msg: typeof message === 'string' ? message : safeJson(message),
  };
  const line = `${JSON.stringify(payload)}\n`;
  if (level === 'error') {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
