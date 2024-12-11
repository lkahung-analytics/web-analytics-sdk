declare module '@lkahung/web-analytics' {
  interface AnalyticsConfig {
    appId: string;
    endpoint: string;
    debug?: boolean;
    isSPA: boolean; // 必填参数，用于区分是否为单页应用
  }

  interface Analytics {
    init(config: AnalyticsConfig): void;
    trackPageView(path: string): void;
  }

  const analytics: Analytics;
  export default analytics;
}
