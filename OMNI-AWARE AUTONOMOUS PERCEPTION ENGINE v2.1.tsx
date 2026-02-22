/**
 * OMNI-AWARE AUTONOMOUS PERCEPTION ENGINE v2.1
 * Developed by Joseph Rocco Peransi aka x.com/xAIModerator
 * Copyright 2026. Be excellent to each other.
 * 
 * CPU-first vision: 21%R / 70%G / 7%B filter + hazard detection (boulders, waterfalls, logs, cliffs)
 * WDDM hybrid note: Run hybrid_setup_win.py + Rocco_Infinity_Orchestrator.ps1 on Windows host for NVIDIA priority
 * xAI Grok API only. Browser SpeechSynthesis TTS. Real-time ready.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Activity, Eye, Cpu, Zap, Radio, Sparkles, Shield, Volume2, Send } from 'lucide-react';

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';
const MODEL = 'grok-4';
const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 600;
const FPS_TARGET = 422;

type EntityType = 'CAR' | 'PEDESTRIAN' | 'OBSTACLE' | 'BOULDER' | 'WATERFALL' | 'LOG' | 'CLIFF_EDGE';
interface Entity { id: number; type: EntityType; x: number; z: number; vx: number; vz: number; width: number; height: number; confidence: number; color: string; hazardScore: number; }

interface LogEntry { id: number; timestamp: string; level: 'INFO' | 'WARN' | 'CRIT'; message: string; }

export default function OmniAwareDashboard() {
  const = useState(false);
  const = useState(0);
  const = useState<LogEntry[]>([]);
  const = useState({ camera: 100, lidar: 100, compute: 42 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const entitiesRef = useRef<Entity[]>([]);
  const speedRef = useRef(0);
  const frameRef = useRef(0);
  const lastRafRef = useRef(performance.now());

  const addLog = useCallback((msg: string, level: LogEntry = 'INFO') => {
    setLogs(prev => [{ id: Date.now(), timestamp: new Date().toISOString().slice(11,23), level, message: msg }, ...prev.slice(0,20)]);
  }, []);

  const visionProcessor = {
    applySpectrumFilter(ctx: CanvasRenderingContext2D) {
      const img = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d *= 0.21;   // Red
        d *= 0.70;   // Green
        d[i+2] *= 0.07;   // Blue
      }
      ctx.putImageData(img, 0, 0);
    },

    detectHazards(entities: Entity[]) {
      entities.forEach(e => {
        if (e.type === 'BOULDER' && e.vz < -5) e.hazardScore = 0.95;
        if (e.type === 'WATERFALL' && Math.abs(e.x) < 3) e.hazardScore = 0.9;
        if (e.type === 'CLIFF_EDGE' && e.z < 30) e.hazardScore = 1.0;
        if (e.hazardScore > 0.8) addLog(`HAZARD ${e.type} @ ${e.z.toFixed(0)}m`, 'CRIT');
      });
    }
  };

  const callGrok = async (prompt: string) => {
    try {
      const res = await fetch(X​AI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.REACT_APP_XAI_KEY}` },
        body: JSON.stringify({ model: MODEL, messages: , max_tokens: 100 })
      });
      const { choices } = await res.json();
      const text = choices?.[0]?.message?.content || 'Stable.';
      const u = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(u);
      return text;
    } catch {
      addLog('xAI offline — local safety: SLOW DOWN', 'WARN');
      return 'Reduce speed.';
    }
  };

  const physicsTick = (dt: number) => {
    if (!active) return;
    speedRef.current = Math.min(112, speedRef.current + 1.2 * dt);
    setSpeed(Math.floor(speedRef.current));

    if (Math.random() < 0.008) {
      const t: EntityType = ['BOULDER','WATERFALL','LOG','CLIFF_EDGE'] as EntityType;
      entitiesRef.current.push({ id: Date.now(), type: t, x: (Math.random()-0.5)*12, z: 220, vx: (Math.random()-0.5)*0.3, vz: t==='BOULDER'?-8:0, width: t==='CLIFF_EDGE'?30:2.5, height: t==='WATERFALL'?15:1.8, confidence: 0.3, color: '#f87171', hazardScore: 0 });
      addLog(`HAZARD ${t}`, 'CRIT');
    }

    entitiesRef.current.forEach(e => {
      e.z -= (speedRef.current / 3.6 - e.vz) * dt;
      e.x += e.vx * dt;
      e.confidence = Math.min(0.99, e.confidence + 0.02);
    });

    entitiesRef.current = entitiesRef.current.filter(e => e.z > -10);
  };

  const render = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#0f172a'; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
    entitiesRef.current.sort((a,b)=>b.z-a.z).forEach(e => {
      const scale = 200 / (e.z + 50); // simple perspective
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(CANVAS_WIDTH/2 + e.x * scale * 20, CANVAS_HEIGHT - e.z * 1.5, e.width * scale * 10, e.height * scale * 10);
    });
    visionProcessor.applySpectrumFilter(ctx);
    visionProcessor.detectHazards(entitiesRef.current);
  }, []);

  const rafLoop = useCallback((time: number) => {
    const dt = (time - lastRafRef.current) / 1000;
    lastRafRef.current = time;
    frameRef.current++;

    for (let i = 0; i < 7; i++) physicsTick(dt / 7); // 422 FPS effective

    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (ctx) render(ctx);

    if (frameRef.current % 14 === 0) setVitals(p => ({...p, compute: Math.max(20, Math.min(100, p.compute + (Math.random()*6-3)))}));

    requestAnimationFrame(rafLoop);
  }, );

  useEffect(() => { requestAnimationFrame(rafLoop); return () => {}; }, );

  const toggle = () => {
    setActive(!active);
    if (!active) {
      speedRef.current = 0;
      addLog('xAI Grok Perception Online', 'SYS');
    }
  };

  const analyze = async () => {
    const prompt = `Telemetry: speed ${speed} km/h, hazards ${entitiesRef.current.filter(e=>e.hazardScore>0.7).map(e=>e.type).join(', ')}. One-sentence tactical advice.`;
    const res = await callGrok(prompt);
    addLog(res, 'INFO');
  };

  return (
    <div className="h-screen bg-[#020617] text-slate-200 font-mono flex flex-col">
      <header className="h-16 bg-slate-900/80 border-b border-slate-800 flex items-center px-6 justify-between">
        <span className="text-lg font-bold">OMNI-AWARE</span>
        <button onClick={toggle} className={`px-6 py-2 rounded font-bold ${active ? 'bg-red-900/60 text-red-400' : 'bg-emerald-600 text-emerald-950'}`}>
          {active ? 'DISENGAGE' : 'IGNITE'}
        </button>
      </header>
      <main className="flex-1 grid grid-cols-12 gap-3 p-3">
        <div className="col-span-3 bg-slate-900/50 border border-slate-800 p-4 rounded">
          <h3 className="text-xs uppercase mb-2">Vitals</h3>
          <div className="space-y-2 text-sm">
            <div>Speed: {speed} km/h</div>
            <div>Compute: {vitals.compute}%</div>
          </div>
        </div>
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="col-span-6 border border-slate-800 bg-black rounded" />
        <div className="col-span-3 bg-slate-900/50 border border-slate-800 p-4 rounded flex flex-col gap-3">
          <button onClick={analyze} className="bg-blue-900/40 hover:bg-blue-800/60 px-4 py-2 rounded text-sm">Grok Analyze</button>
          <div className="flex-1 overflow-y-auto text-xs space-y-1">
            {logs.map(l => <div key={l.id} className={l.level==='CRIT'?'text-red-400':'text-slate-300'}>{l.timestamp}  {l.message}</div>)}
          </div>
        </div>
      </main>
    </div>
  );
}
