"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinned } from "lucide-react";
import type { Place } from "@/lib/types";

type AMapMap = { destroy: () => void; setFitView: () => void };
type AMapNamespace = {
  Map: new (element: HTMLDivElement, options: Record<string, unknown>) => AMapMap;
  Marker: new (options: Record<string, unknown>) => { on: (event: string, handler: () => void) => void };
};

export function AMapView({ places, onSelect }: { places: Place[]; onSelect: (place: Place) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const enabled = process.env.NEXT_PUBLIC_ENABLE_MAP === "true" && Boolean(process.env.NEXT_PUBLIC_AMAP_KEY);

  useEffect(() => {
    if (!enabled || !container.current) return;
    let map: AMapMap | undefined;
    import("@amap/amap-jsapi-loader").then(({ default: loader }) => {
      const securityCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;
      if (securityCode) (window as Window & { _AMapSecurityConfig?: { securityJsCode: string } })._AMapSecurityConfig = { securityJsCode: securityCode };
      return loader.load({ key: process.env.NEXT_PUBLIC_AMAP_KEY!, version: "2.0", plugins: ["AMap.Scale"] });
    }).then((namespace) => {
      if (!container.current) return;
      const AMap = namespace as unknown as AMapNamespace;
      map = new AMap.Map(container.current, { zoom: 15, center: [121.3914, 31.3202], viewMode: "2D" });
      places.slice(0, 200).forEach((place) => {
        const marker = new AMap.Marker({ map, position: [place.longitude, place.latitude], title: place.name });
        marker.on("click", () => onSelect(place));
      });
      map.setFitView();
    }).catch(() => setFailed(true));
    return () => map?.destroy();
  }, [enabled, onSelect, places]);

  if (!enabled || failed) return <div className="soft-card flex min-h-52 flex-col items-center justify-center p-6 text-center"><MapPinned size={30} color="#365c49" /><p className="serif mt-3 text-lg font-bold">{failed ? "地图暂时没加载出来" : "地图尚未配置"}</p><p className="mt-1 max-w-xs text-sm leading-5 text-[var(--muted)]">附近列表仍然可以正常使用。配置高德 Key 后，这里会显示真实地点。</p></div>;
  return <div ref={container} className="h-[360px] overflow-hidden rounded-[22px] border border-[var(--line)] bg-[#e7e0d3]" aria-label="附近美食地图" />;
}
