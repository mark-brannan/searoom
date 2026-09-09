// Suspense covers a pending asset load; it does not cover a rejected one.
// useGLTF re-throws a failed .glb fetch during render, and with no
// boundary in the tree React unmounts from the root — one flagged 3D
// panel would blank the whole app (offline, a blocking extension, a CDN
// 404, or a browser with no WebGL context).
//
// This is deliberately a plain, dependency-free class component: it lives
// inside the 3D component's own subtree so a consumer inherits the
// protection instead of having to remember to wrap it.

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  /** Rendered in place of the children once they have thrown. */
  fallback: ReactNode;
  /** Lets a consumer degrade further — e.g. back to a 2D scene. */
  onError?: (error: unknown) => void;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

export class ModelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Visible in the console, not to the user: the fallback is the
    // message. Keeping it here means a silent 3D failure is still
    // diagnosable from a bug report.
    console.warn('3D model failed to render; falling back.', error, info);
    this.props.onError?.(error);
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
