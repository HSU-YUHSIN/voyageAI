
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-8 text-center text-slate-900">
                    <h1 className="text-4xl font-black mb-4">Something went wrong.</h1>
                    <p className="text-lg text-slate-600 mb-8 max-w-md">
                        We encountered an unexpected error. This might be due to a temporary glitch or an invalid response from the AI.
                    </p>
                    {this.state.error && (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-red-600 text-sm font-mono mb-8 max-w-2xl overflow-auto text-left">
                            {this.state.error.toString()}
                        </div>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition"
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
