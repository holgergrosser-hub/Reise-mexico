import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    try {
      // Zusätzlich in die Konsole loggen, falls verfügbar
      // eslint-disable-next-line no-console
      console.error('App crashed:', error, errorInfo);
    } catch {
      // ignore
    }
  }

  render() {
    if (this.state.error) {
      const error = this.state.error;
      const message = error?.message || String(error);
      const name = error?.name || 'Error';
      const stack = error?.stack || '';
      const href = (() => {
        try {
          return window.location?.href || '';
        } catch {
          return '';
        }
      })();
      const ua = (() => {
        try {
          return navigator.userAgent || '';
        } catch {
          return '';
        }
      })();
      const now = (() => {
        try {
          return new Date().toString();
        } catch {
          return '';
        }
      })();

      return (
        <div style={{
          minHeight: '100vh',
          padding: 20,
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <h1 style={{ marginBottom: 12 }}>❌ App-Fehler</h1>
          <p style={{ marginBottom: 12 }}>
            Bitte kopiere mir diese Fehlermeldung (am besten inkl. Stack unten):
          </p>
          <pre style={{
            whiteSpace: 'pre-wrap',
            background: 'rgba(0,0,0,0.25)',
            padding: 12,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.25)'
          }}>{name}: {message}</pre>

          {stack && (
            <details style={{ marginTop: 12 }} open>
              <summary>Stack Trace</summary>
              <pre style={{
                whiteSpace: 'pre-wrap',
                background: 'rgba(0,0,0,0.25)',
                padding: 12,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.25)'
              }}>{stack}</pre>
            </details>
          )}

          {this.state.errorInfo?.componentStack && (
            <details style={{ marginTop: 12 }}>
              <summary>Component Stack</summary>
              <pre style={{
                whiteSpace: 'pre-wrap',
                background: 'rgba(0,0,0,0.25)',
                padding: 12,
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.25)'
              }}>{this.state.errorInfo.componentStack}</pre>
            </details>
          )}

          <details style={{ marginTop: 12 }}>
            <summary>Umgebung</summary>
            <pre style={{
              whiteSpace: 'pre-wrap',
              background: 'rgba(0,0,0,0.25)',
              padding: 12,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.25)'
            }}>{`URL: ${href}\nZeit: ${now}\nUser-Agent: ${ua}`}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
