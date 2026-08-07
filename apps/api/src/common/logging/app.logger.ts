import { ConsoleLogger, type LogLevel, type LoggerService } from '@nestjs/common';
import pino, { type Logger as PinoLogger } from 'pino';

/**
 * Development: Nest ConsoleLogger.
 * Production: pino JSON (structured logging).
 */
export function createAppLogger(): LoggerService {
  if ((process.env.NODE_ENV ?? 'development') !== 'production') {
    return new ConsoleLogger('API');
  }

  const pinoLogger: PinoLogger = pino({
    level: process.env.LOG_LEVEL?.trim() || 'info',
    base: { service: 'xidmetal-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  return {
    log(message: unknown, ...optionalParams: unknown[]) {
      writePino(pinoLogger, 'info', message, optionalParams);
    },
    error(message: unknown, ...optionalParams: unknown[]) {
      writePino(pinoLogger, 'error', message, optionalParams);
    },
    warn(message: unknown, ...optionalParams: unknown[]) {
      writePino(pinoLogger, 'warn', message, optionalParams);
    },
    debug(message: unknown, ...optionalParams: unknown[]) {
      writePino(pinoLogger, 'debug', message, optionalParams);
    },
    verbose(message: unknown, ...optionalParams: unknown[]) {
      writePino(pinoLogger, 'trace', message, optionalParams);
    },
  };
}

function writePino(
  logger: PinoLogger,
  level: 'info' | 'error' | 'warn' | 'debug' | 'trace',
  message: unknown,
  optionalParams: unknown[],
) {
  const context =
    typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
  const msg = typeof message === 'string' ? message : safeJson(message);
  const payload = context ? { context, msg } : { msg };

  if (level === 'error' && optionalParams.length > 1) {
    const err = optionalParams.find((p) => p instanceof Error);
    if (err) {
      logger.error({ ...payload, err }, msg);
      return;
    }
  }

  logger[level](payload, msg);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Nest LogLevel uyğunluğu üçün saxlanılır (test/helper) */
export type AppLogLevel = LogLevel;
