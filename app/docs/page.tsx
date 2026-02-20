"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    SwaggerUIBundle: any;
    SwaggerUIStandalonePreset: any;
  }
}

export default function DocsPage() {
  useEffect(() => {
    // Carregar scripts do Swagger UI dinamicamente
    const script1 = document.createElement("script");
    script1.src =
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-bundle.js";
    script1.async = true;

    const script2 = document.createElement("script");
    script2.src =
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-standalone-preset.js";
    script2.async = true;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui.css";

    document.head.appendChild(link);
    document.head.appendChild(script1);
    document.head.appendChild(script2);

    script2.onload = () => {
      if (window.SwaggerUIBundle) {
        window.SwaggerUIBundle({
          url: "/api/docs",
          dom_id: "#swagger-ui",
          presets: [
            window.SwaggerUIBundle.presets.apis,
            window.SwaggerUIStandalonePreset,
          ],
          layout: "StandaloneLayout",
          deepLinking: true,
          defaultModelsExpandDepth: 1,
          defaultModelExpandDepth: 1,
        });
      }
    };

    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script1);
      document.head.removeChild(script2);
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <div id="swagger-ui"></div>
    </div>
  );
}
