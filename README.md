# Web Analytics SDK

A lightweight, easy-to-use web analytics tracking SDK for monitoring website usage and user interactions.

## 🚀 Features

- Simple and lightweight
- Easy to integrate
- Supports both browser and Node.js environments
- Track page views and custom events
- Configurable endpoint and debug mode

## 📦 Installation

```bash
npm install @lkahung/web-analytics
```

## 🔧 Usage

### Browser Environment

```html
<script src="https://unpkg.com/@lkahung/web-analytics"></script>
<script>
  Analytics.init({
    appId: "your-app-id",
    endpoint: "https://your-analytics-endpoint.com/collect",
    debug: true,
    isSPA: false,
  });

  // Track a page view
  Analytics.trackPageView();

  // Track a custom event
  Analytics.trackEvent("category", "action", "label", value);
</script>
```

### Node.js / Modern JavaScript

```javascript
import Analytics from "@lkahung/web-analytics";

Analytics.init({
  appId: "your-app-id",
  endpoint: "https://your-analytics-endpoint.com/collect",
  debug: true,
  isSPA: true,
});

// Track events
Analytics.trackEvent("button", "click", "signup-button");
```

## 📝 Configuration

- `appId`: **Required**. Your unique site identifier
- `isSPA`: **Required**. Boolean flag to indicate if the application is a Single Page Application
- `endpoint`: Optional. Custom collection endpoint (defaults to http://localhost:8080/collect)
- `debug`: Optional. Enable console logging (defaults to false)
- `isSPA`: Optional. Boolean flag to indicate if the application is a Single Page Application

## 🔄 SPA Integration

For Single Page Applications, make sure to set `isSPA: true` when initializing the SDK:

### Vue.js / Nuxt.js

```typescript
// plugins/analytics.client.ts
import Analytics from "@lkahung/web-analytics";

export default defineNuxtPlugin(() => {
  Analytics.init({
    appId: "your-site-id",
    endpoint: "your-endpoint",
    debug: true,
    isSPA: true, // 必须设置为 true
  });

  const router = useRouter();
  router.afterEach((to) => {
    Analytics.trackPageView(to.fullPath);
  });
});
```

### React Router

```typescript
// src/plugins/analytics.ts
import Analytics from '@lkahung/web-analytics'

// 初始化函数
export const initAnalytics = () => {
  Analytics.init({
    appId: 'your-site-id',
    endpoint: 'your-endpoint',
    debug: true,
    isSPA: true
  })
}

// src/App.tsx
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { initAnalytics } from './plugins/analytics'

function App() {
  const location = useLocation()

  useEffect(() => {
    // 初始化 SDK（仅需执行一次）
    initAnalytics()
  }, [])

  useEffect(() => {
    // 监听路由变化
    Analytics.trackPageView(location.pathname)
  }, [location])

  return (
    // ... your app components
  )
}
```

### Angular

```typescript
// src/app/plugins/analytics.ts
import Analytics from "@lkahung/web-analytics";

export const initAnalytics = () => {
  Analytics.init({
    appId: "your-site-id",
    endpoint: "your-endpoint",
    debug: true,
    isSPA: true,
  });
};

// src/app/app.component.ts
import { Component, OnInit } from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { initAnalytics } from "./plugins/analytics";

@Component({
  selector: "app-root",
  template: "<router-outlet></router-outlet>",
})
export class AppComponent implements OnInit {
  constructor(private router: Router) {
    // 初始化 SDK
    initAnalytics();

    // 监听路由变化
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        Analytics.trackPageView(event.urlAfterRedirects);
      });
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License

## 🐛 Issues

Report issues at [GitHub Issues](https://github.com/laungkahung/web-analytics/issues)
