# Nish — Training Log (Static Web App)

A lightweight, single-page web app to log your workouts, store them in your browser (localStorage), and track progressive overload with simple charts.

## Features
- Log workouts with any number of exercises and sets (weight, reps, failure).
- History view of all sessions.
- Progress charts (per-exercise): Estimated 1RM (Epley), Best Weight×Reps, and Weekly Volume.
- Exercise templates auto-grow as you add new exercises.
- Import/Export JSON data.
- No backend required — runs locally in your browser.

## How to use
1. Open `index.html` in a modern browser.
2. Go to **Log Workout** to add sessions.
3. See past sessions in **History**.
4. Track progression in **Progress** (choose exercise and metric).
5. Use **Settings** to export your data regularly.

## Data Model
```json
{
  "workouts": [
    {
      "date": "YYYY-MM-DD",
      "split": "Push / Pull / Legs / etc",
      "notes": "optional",
      "exercises": [
        {"name":"Lat Pulldown","notes":"","sets":[{"weight":80,"reps":4,"failure":true}]}
      ],
      "createdAt": "ISO string"
    }
  ]
}
```

## Progressive Overload Tips
- Increase **one variable at a time**: load (+2.5 kg), reps (+1-2), or sets.
- Keep weekly volume increases modest (2–5%) to avoid burnout.
- If form breaks or you hit failure too early, dial the load back and make smaller jumps.
