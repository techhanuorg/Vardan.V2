import { Component, ErrorInfo, ReactNode } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-md w-full p-8 rounded-2xl border border-rose-100 dark:border-rose-950 bg-white dark:bg-slate-900 shadow-xl text-center">
            <div className="inline-flex p-3 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 mb-4">
              <AlertOctagon className="h-10 w-10" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              An unexpected error occurred. Please try reloading the application.
            </p>
            {this.state.error && (
              <pre className="text-left text-xs bg-slate-50 dark:bg-slate-950 p-4 rounded-lg overflow-x-auto text-slate-600 dark:text-slate-400 mb-6 max-h-40 border border-slate-100 dark:border-slate-800">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
