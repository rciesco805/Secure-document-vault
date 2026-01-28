import { serverInstance } from './rollbar';
import { NextResponse } from 'next/server';
import { NextApiResponse } from 'next';

export interface ErrorContext {
  path?: string;
  method?: string;
  userId?: string;
  teamId?: string;
  documentId?: string;
  action?: string;
  [key: string]: unknown;
}

export function reportError(
  error: Error | unknown,
  context: ErrorContext = {}
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  
  if (serverInstance) {
    serverInstance.error(err, {
      ...context,
      timestamp: new Date().toISOString(),
    });
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.error('[Rollbar Error]', err.message, context);
  }
}

export function reportWarning(
  message: string,
  context: ErrorContext = {}
): void {
  if (serverInstance) {
    serverInstance.warning(message, {
      ...context,
      timestamp: new Date().toISOString(),
    });
  }
}

export function reportInfo(
  message: string,
  context: ErrorContext = {}
): void {
  if (serverInstance) {
    serverInstance.info(message, {
      ...context,
      timestamp: new Date().toISOString(),
    });
  }
}

export function withErrorReporting<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context: ErrorContext = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      reportError(error, context);
      throw error;
    }
  }) as T;
}

export function createApiErrorResponse(
  error: Error | unknown,
  context: ErrorContext = {},
  statusCode: number = 500
): NextResponse {
  reportError(error, context);
  
  const message = error instanceof Error ? error.message : 'Internal server error';
  const isProduction = process.env.NODE_ENV === 'production';
  
  return NextResponse.json(
    {
      error: isProduction ? 'Internal server error' : message,
      ...(isProduction ? {} : { stack: error instanceof Error ? error.stack : undefined }),
    },
    { status: statusCode }
  );
}

export function handleApiError(
  res: NextApiResponse,
  error: Error | unknown,
  context: ErrorContext = {},
  statusCode: number = 500
): void {
  reportError(error, context);
  
  const message = error instanceof Error ? error.message : 'Internal server error';
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(statusCode).json({
    error: isProduction ? 'Internal server error' : message,
    ...(isProduction ? {} : { stack: error instanceof Error ? error.stack : undefined }),
  });
}

export async function withPrismaErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {}
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    reportError(error, {
      ...context,
      source: 'prisma',
    });
    throw error;
  }
}

export function captureException(error: Error | unknown): string | null {
  if (!serverInstance) return null;
  
  const err = error instanceof Error ? error : new Error(String(error));
  const uuid = serverInstance.error(err);
  return typeof uuid === 'string' ? uuid : null;
}
