const REQUEST_TIMEOUT_MS = 10_000;

const probes = [
  {
    id: "domestic",
    url: "https://myip.ipip.net/json",
    parse(payload) {
      if (payload.ret !== "ok" || !payload.data?.ip) {
        throw new Error("invalid_response");
      }
      return {
        ip: payload.data.ip,
        location: payload.data.location?.filter(Boolean).join(" · ") || "位置未知",
        provider: "IPIP",
      };
    },
  },
  {
    id: "overseas",
    url: "/api/ip",
    parse(payload) {
      if (!payload.ip) {
        throw new Error("invalid_response");
      }
      const location = [countryName(payload.country), payload.region, payload.city]
        .filter(Boolean)
        .join(" · ");
      const network = [payload.organization, payload.asn ? `AS${payload.asn}` : null]
        .filter(Boolean)
        .join(" · ");
      return {
        ip: payload.ip,
        location: [location, network].filter(Boolean).join(" — ") || "位置未知",
        provider: payload.colo ? `Cloudflare · ${payload.colo}` : "Cloudflare",
      };
    },
  },
  {
    id: "global",
    url: "https://api.ip.sb/geoip",
    fallbackUrl: "https://api.ipify.org?format=json",
    parse(payload, usedFallback) {
      if (!payload.ip) {
        throw new Error("invalid_response");
      }
      const location = usedFallback
        ? "位置未知"
        : [countryName(payload.country_code) || payload.country, payload.region, payload.city]
            .filter(Boolean)
            .join(" · ");
      const network = usedFallback
        ? ""
        : [payload.organization, payload.asn ? `AS${payload.asn}` : null]
            .filter(Boolean)
            .join(" · ");
      return {
        ip: payload.ip,
        location: [location, network].filter(Boolean).join(" — ") || "位置未知",
        provider: usedFallback ? "IPify（备用）" : "IP.SB",
      };
    },
  },
];

const results = new Map();
const retryButton = document.querySelector("#retry-all");

function countryName(countryCode) {
  if (!countryCode || typeof Intl.DisplayNames !== "function") {
    return countryCode || "";
  }
  try {
    return new Intl.DisplayNames(["zh-CN"], { type: "region" }).of(countryCode) || countryCode;
  } catch {
    return countryCode;
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`http_${response.status}`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timer);
  }
}

async function runProbe(probe) {
  setCardState(probe.id, "loading");
  let payload;
  let usedFallback = false;

  try {
    try {
      payload = await fetchJson(probe.url);
    } catch (error) {
      if (!probe.fallbackUrl) {
        throw error;
      }
      payload = await fetchJson(probe.fallbackUrl);
      usedFallback = true;
    }

    const result = probe.parse(payload, usedFallback);
    results.set(probe.id, result);
    setCardState(probe.id, "success", result);
  } catch {
    results.delete(probe.id);
    setCardState(probe.id, "error");
  }
}

function setCardState(id, state, result = null) {
  const card = document.querySelector(`[data-probe="${id}"]`);
  const status = card.querySelector(".status");
  const statusText = card.querySelector(".status-text");
  const ip = card.querySelector(".ip-address");
  const location = card.querySelector(".location");
  const provider = card.querySelector(".provider");
  const copyButton = card.querySelector(".copy-button");

  status.className = `status ${state}`;

  if (state === "loading") {
    statusText.textContent = "检测中";
    ip.textContent = "—";
    location.textContent = "正在获取位置…";
    copyButton.disabled = true;
    return;
  }

  if (state === "error") {
    statusText.textContent = "连接失败";
    ip.textContent = "无法检测";
    location.textContent = "检测点未响应，请重新检测";
    copyButton.disabled = true;
    return;
  }

  statusText.textContent = "已连接";
  ip.textContent = result.ip;
  location.textContent = result.location;
  provider.textContent = result.provider;
  copyButton.disabled = false;
  copyButton.dataset.ip = result.ip;
}

function updateSummary() {
  const summary = document.querySelector("#summary-text");
  const successful = [...results.values()];
  const failedCount = probes.length - successful.length;

  if (successful.length === 0) {
    summary.textContent = "所有检测点均未响应，请检查网络后重新检测。";
    return;
  }

  const uniqueIps = new Set(successful.map((result) => result.ip));
  if (uniqueIps.size === 1 && failedCount === 0) {
    summary.textContent = `三个检测点均显示 ${successful[0].ip}，当前未发现线路分流。`;
    return;
  }

  if (uniqueIps.size > 1) {
    const suffix = failedCount > 0 ? `，另有 ${failedCount} 个检测点未响应` : "";
    summary.textContent = `检测到 ${uniqueIps.size} 个不同出口 IP，当前网络存在分流${suffix}。`;
    return;
  }

  summary.textContent = `${successful.length} 个检测点显示 ${successful[0].ip}，${failedCount} 个检测点未响应。`;
}

async function runAll() {
  retryButton.disabled = true;
  retryButton.textContent = "检测中…";
  results.clear();
  document.querySelector("#summary-text").textContent = "正在连接检测点…";
  await Promise.allSettled(probes.map(runProbe));
  updateSummary();
  retryButton.disabled = false;
  retryButton.textContent = "重新检测";
}

async function copyIp(button) {
  const ip = button.dataset.ip;
  if (!ip) return;

  try {
    await navigator.clipboard.writeText(ip);
    button.textContent = "已复制";
    window.setTimeout(() => {
      button.textContent = "复制";
    }, 1400);
  } catch {
    button.textContent = "复制失败";
  }
}

retryButton.addEventListener("click", runAll);
document.querySelectorAll(".copy-button").forEach((button) => {
  button.addEventListener("click", () => copyIp(button));
});

runAll();
