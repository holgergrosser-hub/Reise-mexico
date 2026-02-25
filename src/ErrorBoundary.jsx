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
      const message = this.state.error?.message || String(this.state.error);
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
            Bitte kopiere mir diese Fehlermeldung (und wenn möglich den Console-Log aus F12):
          </p>
          <pre style={{
            whiteSpace: 'pre-wrap',
            background: 'rgba(0,0,0,0.25)',
            padding: 12,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.25)'
          }}>{message}</pre>
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
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
