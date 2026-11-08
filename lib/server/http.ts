import "server-only";
import { connection, NextResponse } from "next/server";
import type { z } from "zod";
import { getCurrentUser, HttpError } from "./auth";
import type { AuthUser, Role } from "@/lib/types";

export { HttpError };

const NO_STORE = { "Cache-Control": "no-store" };

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201, headers: NO_STORE });
}

function checkCsrf(req: Request, expectJsonBody: boolean) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return;
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = req.headers.get("origin");
  if (!origin || !host) {
    throw new HttpError(403, "FORBIDDEN", "Missing origin header");
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "FORBIDDEN", "Invalid origin header");
  }

  if (originHost !== host) {
    throw new HttpError(403, "FORBIDDEN", "Cross-origin request blocked");
  }

  if (expectJsonBody) {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw new HttpError(403, "FORBIDDEN", "Content-Type must be application/json");
    }
  }
}

function flattenZodFields(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "form";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

type RouteParams = Promise<Record<string, string>>;

interface RouteOptions<TSchema extends z.ZodType | undefined, TRoles extends "public" | readonly Role[]> {
  roles: TRoles;
  body?: TSchema;
}

interface HandlerArgs<TBody, TRoles extends "public" | readonly Role[]> {
  req: Request;
  params: RouteParams;
  body: TBody;
  user: TRoles extends "public" ? AuthUser | null : AuthUser;
}

export function route<
  TSchema extends z.ZodType | undefined = undefined,
  TRoles extends "public" | readonly Role[] = readonly Role[],
>(
  options: RouteOptions<TSchema, TRoles>,
  handler: (
    args: HandlerArgs<
      TSchema extends z.ZodType ? z.infer<TSchema> : undefined,
      TRoles
    >,
  ) => Promise<NextResponse>,
) {
  return async (
    req: Request,
    ctx: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    await connection();
    try {
      checkCsrf(req, Boolean(options.body));

      const user = await getCurrentUser();
      if (options.roles !== "public") {
        if (!user) {
          throw new HttpError(401, "UNAUTHENTICATED", "Please log in to continue.");
        }
        if (!options.roles.includes(user.role)) {
          throw new HttpError(
            403,
            "FORBIDDEN",
            "You do not have permission to perform this action.",
          );
        }
      }

      let parsedBody: unknown = undefined;
      if (options.body) {
        let rawJson: unknown;
        try {
          rawJson = await req.json();
        } catch {
          throw new HttpError(400, "VALIDATION", "Invalid JSON request body");
        }
        const parsed = options.body.safeParse(rawJson);
        if (!parsed.success) {
          const fields = flattenZodFields(parsed.error);
          const firstMsg = parsed.error.issues[0]?.message ?? "Invalid input";
          throw new HttpError(400, "VALIDATION", firstMsg, fields);
        }
        parsedBody = parsed.data;
      }

      return await handler({
        req,
        params: ctx.params,
        body: parsedBody as TSchema extends z.ZodType ? z.infer<TSchema> : undefined,
        user: user as TRoles extends "public" ? AuthUser | null : AuthUser,
      });
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json(
          {
            error: {
              code: err.code,
              message: err.message,
              ...(err.fields ? { fields: err.fields } : {}),
            },
          },
          { status: err.status, headers: NO_STORE },
        );
      }
      console.error("[api error]", err);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Something went wrong. Please try again.",
          },
        },
        { status: 500, headers: NO_STORE },
      );
    }
  };
}

