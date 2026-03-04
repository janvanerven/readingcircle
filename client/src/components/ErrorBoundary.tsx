import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cream p-4">
          <div className="bg-white rounded-xl border border-warm-gray p-8 max-w-md text-center space-y-4">
            <h1 className="text-2xl font-serif font-bold text-burgundy">Something went wrong</h1>
            <p className="text-brown-light">An unexpected error occurred. Please refresh the page.</p>
            <button onClick={() => window.location.reload()}
              className="px-4 py-2 bg-burgundy text-white rounded-lg text-sm font-medium hover:bg-burgundy-light">
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
