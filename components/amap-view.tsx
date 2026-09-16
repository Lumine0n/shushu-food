"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, MapPinned } from "lucide-react";
import type { Place } from "@/lib/types";

export type MapStatus = "loading" | "ready" | "disabled" | "error";

type AMapMarker = {
  on: (event: "click", handler: () => void) => void;
};

type AMapBounds = {
  contains: (position: [number, number]) => boolean;
};

type AMapMap = {
  addControl: (control: unknown) => void;
  destroy: () => void;
  getBounds: () => AMapBounds;
  on: (event: "moveend", handler: () => void) => void;
  setFitView: (overlays?: AMapMarker[], immediately?: boolean, avoid?: number[], maxZoom?: number) => void;
  setZoomAndCenter: (zoom: number, center: [number, number], immediately?: boolean) => void;
};

type AMapNamespace = {
  Map: new (element: HTMLDivElement, options: Record<string, unknown>) => AMapMap;
  Marker: new (options: Record<string, unknown>) => AMapMarker;
  Scale: new (options?: Record<string, unknown>) => unknown;
  ToolBar: new (options?: Record<string, unknown>) => unknown;
};

type AMapViewProps = {
  places: Place[];
  onSelect: (place: Place) => void;
  onStatusChange?: (status: MapStatus) => void;
  onVisiblePlaceCountChange?: (count: number) => void;
};

const LOAD_TIMEOUT_MS = 12_000;

function waitForMapLoad<T>(promise: Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error("地图加载超时")), LOAD_TIMEOUT_MS);
    promise.then(
      (value) => { window.clearTimeout(timeout); resolve(value); },
      (error) => { window.clearTimeout(timeout); reject(error); },
    );
  });
}

export function AMapView({ places, onSelect, onStatusChange, onVisiblePlaceCountChange }: AMapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<MapStatus>("loading");
  const enabled = process.env.NEXT_PUBLIC_ENABLE_MAP === "true" && Boolean(process.env.NEXT_PUBLIC_AMAP_KEY);

  useEffect(() => {
    if (!enabled) {
      setStatus("disabled");
      onStatusChange?.("disabled");
      return;
    }
    if (!container.current || places.length === 0) return;

    let cancelled = false;
    let map: AMapMap | undefined;
    setStatus("loading");
    onStatusChange?.("loading");

    const loadMap = async () => {
      try {
        const securityCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;
        if (securityCode) {
          (window as Window & { _AMapSecurityConfig?: { securityJsCode: string } })._AMapSecurityConfig = { securityJsCode: securityCode };
        }

        const { default: loader } = await import("@amap/amap-jsapi-loader");
        const namespace = await waitForMapLoad(loader.load({
          key: process.env.NEXT_PUBLIC_AMAP_KEY!,
          version: "2.0",
          plugins: ["AMap.Scale", "AMap.ToolBar"],
        }));
        if (cancelled || !container.current) return;

        const AMap = namespace as unknown as AMapNamespace;
        map = new AMap.Map(container.current, {
          zoom: 15,
          center: [121.3914, 31.3202],
          viewMode: "2D",
          resizeEnable: true,
        });
        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: "RB", liteStyle: true }));

        const markers = places.slice(0, 200).map((place) => {
          const position: [number, number] = [place.longitude, place.latitude];
          const marker = new AMap.Marker({ map, position, title: place.name, clickable: true });
          marker.on("click", () => {
            map?.setZoomAndCenter(17, position, true);
            onSelect(place);
          });
          return marker;
        });

        const reportVisiblePlaces = () => {
          if (!map) return;
          const bounds = map.getBounds();
          const count = places.filter((place) => bounds.contains([place.longitude, place.latitude])).length;
          onVisiblePlaceCountChange?.(count);
        };

        map.on("moveend", reportVisiblePlaces);
        map.setFitView(markers, false, [54, 54, 54, 54], 16);
        reportVisiblePlaces();
        setStatus("ready");
        onStatusChange?.("ready");
      } catch {
        if (cancelled) return;
        setStatus("error");
        onStatusChange?.("error");
      }
    };

    void loadMap();
    return () => {
      cancelled = true;
      map?.destroy();
    };
  }, [enabled, onSelect, onStatusChange, onVisiblePlaceCountChange, places]);

  if (places.length === 0) {
    return <div className="soft-card flex min-h-52 flex-col items-center justify-center p-6 text-center"><MapPinned size={30} color="#365c49" /><p className="serif mt-3 text-lg font-bold">地图里暂时没有匹配地点</p><p className="mt-1 max-w-xs text-sm leading-5 text-[var(--muted)]">换个关键词，就能继续浏览附近地点。</p></div>;
  }

  if (status === "disabled" || status === "error") {
    return <div className="soft-card flex min-h-52 flex-col items-center justify-center p-6 text-center"><MapPinned size={30} color="#365c49" /><p className="serif mt-3 text-lg font-bold">{status === "error" ? "地图暂时没加载出来" : "地图尚未配置"}</p><p className="mt-1 max-w-xs text-sm leading-5 text-[var(--muted)]">正在返回附近列表，食物搜索和详情仍然可以正常使用。</p></div>;
  }

  return <div className="relative overflow-hidden rounded-[22px] border border-[var(--line)] bg-[#e7e0d3]">
    <div ref={container} className="h-[360px] w-full" aria-label="附近美食地图" />
    {status === "loading" ? <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f7f4ec]/90 text-center" role="status"><LoaderCircle className="animate-spin text-[var(--green)]" size={30} /><p className="mt-3 text-sm font-extrabold">正在加载附近地图…</p></div> : null}
  </div>;
}
