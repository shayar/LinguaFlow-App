import { context, trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("linguaflow-web");

export async function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean | undefined>,
  fn: () => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(name);

  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      span.setAttribute(key, value);
    }
  }

  try {
    return await context.with(trace.setSpan(context.active(), span), fn);
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  } finally {
    span.end();
  }
}