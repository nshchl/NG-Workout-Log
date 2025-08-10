# Nish — Training Log (v4, multi‑page)

What’s new
- **More colorful UI** with gradients and better visual hierarchy
- **Auto progressive targets** per exercise (6–10 reps; when you hit 10, +2.5% weight and reset to 6)
- **Weekly volume guardrail**: warns if the current week’s volume for an exercise would jump >7% vs last week
- **Separate pages**: `index.html` (Log), `history.html` (History), `progress.html` (Progress), `weight.html` (Bodyweight), `settings.html` (Settings)
- **Bodyweight tracker** with line chart
- **Rest timer** stays on Log page
- **Inline edit/delete** (from History) still works

How to deploy
1) Upload all files to your host (GitHub Pages/Netlify).  
2) Open `index.html` to log workouts, `history.html` to browse, `progress.html` for charts, `weight.html` for scale trends, `settings.html` to manage categories & data.

Notes
- Data is stored in **localStorage**. Use Export/Import for backup or moving devices.
- Edit from History sends the session back to Log for updating.
- Auto targets are **suggestions**. If recovery is poor or form slips, ignore the robot and live to lift another day.
