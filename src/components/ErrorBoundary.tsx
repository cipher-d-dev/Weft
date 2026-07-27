/**
 * Weft — ErrorBoundary
 *
 * Phase 7: Per-surface crash isolation. Wraps each major surface
 * (HomeScreen, ControlCenterScreen, CustomizationScreen) so a crash
 * in one surface doesn't kill the entire launcher.
 *
 * A launcher that crashes to a black screen is unusable — the user
 * would be locked out of their device. The ErrorBoundary catches
 * render errors and shows a minimal recovery UI instead.
 *
 * Usage:
 *   <ErrorBoundary name="ControlCenter">
 *     <ControlCenterScreen ... />
 *   </ErrorBoundary>
 *
 * The `name` prop is used for logging and in the fallback message.
 */

import React, { Component, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  children: ReactNode;
  /** Display name used in the fallback UI and error logs. */
  name?: string;
  /** Optional custom fallback — replaces the default recovery UI. */
  fallback?: ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message ?? 'Unknown error',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const name = this.props.name ?? 'Unknown surface';
    // In production, send this to your crash reporting service here.
    console.error(`[ErrorBoundary:${name}] Caught render error:`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Custom fallback takes priority
    if (this.props.fallback) {
      return this.props.fallback;
    }

    const name = this.props.name ?? 'Surface';

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{name} crashed</Text>
        <Text style={styles.message} numberOfLines={3}>
          {this.state.errorMessage}
        </Text>
        <TouchableOpacity
          onPress={this.handleRetry}
          style={styles.retryButton}
          accessibilityRole="button"
          accessibilityLabel={`Retry ${name}`}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

// ---------------------------------------------------------------------------
// Styles — minimal, always readable regardless of paradigm
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080C12',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  message: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
