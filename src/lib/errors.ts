import { unstable_rethrow } from "next/navigation";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorResponse(error: unknown) {
  unstable_rethrow(error);
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Something went wrong." }, { status: 500 });
}
