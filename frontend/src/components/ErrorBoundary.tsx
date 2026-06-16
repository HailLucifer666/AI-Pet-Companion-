/** ErrorBoundary — a minimal class boundary. Catches a render/runtime error in its
 *  subtree, calls onError once, and renders `fallback` (default: nothing). Used to
 *  keep optional flourishes (e.g. the Quickening's 3D cinematic) from ever trapping
 *  the user on a blank screen — the parent flips to a safe path on the onError call. */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  onError?: (error: Error) => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
