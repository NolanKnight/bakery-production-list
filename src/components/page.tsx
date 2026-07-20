import { ReactNode } from "react";

export default abstract class Page {
  public constructor(protected functions: {}) {}

  public abstract get: () => ReactNode;
}
