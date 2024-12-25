declare module "@lkahung/web-analytics" {
  interface AnalyticsConfig {
    appId: string;
    endpoint: string;
    routerMode: "history" | "hash"; // 必填参数，用于区分路由模式，默认为history
    isSPA?: boolean; // 必填参数，用于区分是否为单页应用
    debug?: boolean; // 选填参数，用于开启调试模式，默认为false
    uploadType?: "batch" | "single"; // 选填参数，用于区分上传方式，默认为batch
    uploadInterval?: number; // 选填参数，用于设置上传间隔，默认为5000ms
    batchSize?: number; // 选填参数，用于设置批量上传的数量，默认为20
    autoTrackRouter?: boolean; // 选填参数，用于设置上传重试次数，默认为true
  }

  interface Analytics {
    init(config: AnalyticsConfig): void;
    trackEvent(
      category: string,
      action: string,
      label?: string,
      value?: string
    ): void;
    trackPageLeave(): void;
  }

  const analytics: Analytics;
  export default analytics;
}
