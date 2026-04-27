import { enqueueSnackbar } from "notistack";

export async function extractError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail.map((d: { msg?: string }) => d.msg).join("; ");
    }
    return res.statusText || "Request failed";
  } catch {
    return res.statusText || "Request failed";
  }
}

export function notifyError(msg: string) {
  enqueueSnackbar(msg, { variant: "error" });
}

export function notifySuccess(msg: string) {
  enqueueSnackbar(msg, { variant: "success" });
}
