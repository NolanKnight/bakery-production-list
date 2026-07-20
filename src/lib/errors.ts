import { ConvexError } from "convex/values";
import { toast } from "sonner";

export const toastError = (e: unknown) => {
  toast.error(
    e instanceof ConvexError
      ? (e.data as { message: string }).message
      : "Failed due to an unknown error.",
  );
};
