import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="error-boundary-fallback"
          style={{
            padding: '2rem',
            textAlign: 'center',
            maxWidth: '480px',
            margin: '2rem auto',
          }}
          role="alert"
        >
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Une erreur est survenue</h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-muted, #666)' }}>
            L&apos;application a rencontré un problème. Vous pouvez recharger la page pour
            réessayer.
          </p>
          <button type="button" onClick={this.handleReload} className="btn btn-primary">
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
