'use client';

import { Info, Database, Brain, Map as MapIcon, Shield } from 'lucide-react';

export function AboutPanel() {
  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">About AI AirGuard</h3>
      </div>

      <div className="space-y-4 text-sm">
        <section>
          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1.5">Data Sources (Phase 1)</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Phase 1 uses deterministic Asia DEMO DATA. The coordinator&apos;s historical CSV is not currently
            connected to the application because the project file-size limit prevents direct upload.
            The architecture is ready for future ingestion. Bengaluru demo values are fictional and
            must not be presented as real sensor measurements.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" /> Forecast Model
          </h4>
          <div className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed">
            <p className="font-semibold mb-1">Current Phase 1 model: Hybrid Baseline Forecast</p>
            <p className="text-muted-foreground">A deterministic hybrid using:</p>
            <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-0.5">
              <li>Recent pollution trend extrapolation</li>
              <li>Time-of-day patterns (diurnal cycle)</li>
              <li>Weather adjustment (wind, rain, humidity)</li>
              <li>Local sensor correction</li>
              <li>Spatial interpolation (IDW)</li>
              <li>Heuristic uncertainty estimation</li>
            </ul>
            <p className="mt-2 text-blue-600 font-medium">Future upgrade: trained ML forecasting model</p>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            This is NOT a trained ML model. No accuracy claims are made beyond computed demo replay metrics.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1.5">CPCB AQI Standard</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Uses India&apos;s CPCB National Air Quality Index with 6 categories (Good through Severe).
            Raw pollutant concentrations are kept separate from calculated AQI.
            US EPA and GB DEFRA indices from the CSV are not used as the application AQI.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
            <MapIcon className="w-3.5 h-3.5" /> Spatial Hotspot Engine
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Uses inverse distance weighting (IDW) interpolation from demo sensor locations across a 7×7 grid.
            Distinguishes between MEASURED (at sensor), MODEL FORECAST (near sensor), and AI ESTIMATE (interpolated).
            Never labels interpolated demo data as measured sensor data.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Trust & Safety
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Forecasts are presented as predictions, not guaranteed facts. Language uses "model indicates",
            "contributing factor", "likely contributor" rather than verified causation. Health messaging
            is general public-health guidance. Follow official local advisories for real decisions.
          </p>
        </section>

        <section>
          <h4 className="text-xs font-bold text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> Future Integration
          </h4>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>• Open-Meteo Air Quality + Weather API (no key needed)</li>
            <li>• OpenAQ API v3 (requires OPENAQ_API_KEY)</li>
            <li>• OpenAI for natural-language explanation (optional)</li>
            <li>• Historical CSV ingestion pipeline (architected, ready)</li>
            <li>• Real sensor/IoT integration</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
