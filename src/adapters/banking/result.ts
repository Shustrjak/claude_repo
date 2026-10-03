import type { ErrorCode, Result } from "./types";

export function ok(): Result<void>;
export function ok<T>(data: T): Result<T>;
export function ok<T>(data?: T): Result<T | undefined> {
  return { ok: true, data };
}

export function fail<T = never>(code: ErrorCode, fields?: string[]): Result<T> {
  return fields === undefined ? { ok: false, error: { code } } : { ok: false, error: { code, fields } };
}
