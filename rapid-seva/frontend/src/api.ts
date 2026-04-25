import { ScoreResult, Severity } from './types';

const BASE = 'http://localhost:5000';

async function post<T>(path: string, body: object): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface AISeverityResult {
  severity: Severity;
  isCardiac: boolean;
  survivalScore: number;
}

export const api = {
  detectSeverity: (description: string, lat: number, lng: number) =>
    post<AISeverityResult>('/create-case-ai', { description, lat, lng }),

  calculateScore: (time: number, traffic: number, severity: Severity) =>
    post<{ score: number }>('/calculate-score', { time, traffic, severity }),

  askAssistant: (query: string) =>
    post<{ response: string }>('/assistant', { query }),

  getNearbyDoctors: (lat: number, lng: number) =>
    post<{ doctors: { name: string; specialization: string; distance: number }[] }>(
      '/notify-doctors', { lat, lng }
    ),
};
