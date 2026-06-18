import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ru.proplushka.app",
  appName: "ПроПлюшка",
  webDir: "mobile-shell",
  server: {
    url: "https://proplushka.ru",
    cleartext: false,
  },
};

export default config;
