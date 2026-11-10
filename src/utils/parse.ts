import { BadRequestError } from "./errors.ts";

export function firstParam(value: string | string[] | undefined): string {
  const param = Array.isArray(value) ? value[0] : value;

  if (!param) {
    throw new BadRequestError("Missing parameter");
  }

  return param;
}

export function parseId(value: string | string[] | undefined): number {
  const id = Number(firstParam(value));
  if (!Number.isInteger(id) || id <= 0) {
    throw new BadRequestError("Invalid id");
  }
  return id;
}
