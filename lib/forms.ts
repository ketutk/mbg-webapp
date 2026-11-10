import type { z } from "zod";

export function parseForm<T extends z.ZodType>(
  schema: T,
  values: unknown,
): { data: z.infer<T>; errors?: never } | { data?: never; errors: Record<string, string> } {
  const result = schema.safeParse(values);
  if (result.success) {
    return { data: result.data };
  }
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "form";
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }
  return { errors };
}

