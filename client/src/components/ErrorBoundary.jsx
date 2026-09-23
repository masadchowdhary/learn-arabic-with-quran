import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary-container" style={{ padding: '2rem', textAlign: 'center', marginTop: '50px' }}>
          <h2>Oops, something went wrong.</h2>
          <p>We're sorry, but an unexpected error occurred.</p>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem' }}
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ whiteSpace: 'pre-wrap', marginTop: '2rem', textAlign: 'left', background: '#f5f5f5', padding: '1rem', borderRadius: '8px', color: 'black' }}>
              <summary>Error Details</summary>
              <br />
              {this.state.error.toString()}
              <br />
              {this.state.errorInfo?.componentStack}
            </details>
          )}
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
