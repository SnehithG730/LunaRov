# 🌕 LunaRov — Autonomous Lunar Surface Mobility & Path Simulator

**LunaRov** is an aerospace-grade simulation platform and mission control interface designed for autonomous lunar exploration, procedural regolith terrain generation, energy-efficient pathfinding, and real-time 50 Hz flight telemetry analysis.

---

## 🚀 Key Capabilities

- **Interactive 3D Mission Control**: Full orbital Three.js environment with high-fidelity cratered lunar topography, Earth in orbit, interactive celestial body controls, asteroids, and dynamic comets.
- **Multi-Algorithm Pathfinding Solver**:
  - **A\* Heuristic Engine**: Slope-aware traversal with Octile, Euclidean, and Manhattan heuristics + direct line-of-sight path pruning.
  - **Dijkstra Engine**: Uniform cost contour search.
  - **Greedy Best-First Search**: Ultra-fast heuristic pursuit.
  - **Manual Pilot**: Direct operator steering with acceleration dynamics, angular velocity clamping, and emergency braking.
- **Deterministic 50 Hz Kinematics & Energy Model**:
  - Realistic acceleration, terrain-dependent velocity regulation, slope gravity resistance, surface roughness friction, and battery depletion modeling.
- **Autonomous LiDAR Hazard Detection & Dynamic Replanning**:
  - Continuous forward $90^\circ$ FOV LiDAR sweep with automatic 4-step detour replanning (STOP $\to$ IDENTIFY $\to$ REPLAN $\to$ RESUME).
- **Mission Archive & LocalStorage Persistence**:
  - Save, duplicate, delete, and inspect missions. Full export/import in JSON and CSV telemetry logs.
- **Responsive Aerospace UI**:
  - Desktop 3-column layout, tablet collapsible panels, and touch-optimized mobile experience with gestures (orbit, pinch zoom, pan, tap).

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation & Launch
```bash
# Install dependencies
npm install

# Start local mission control server
npm run dev
```

Open [http://luna-rov.vercel.app/](https://luna-rov.vercel.app/) to access **LunaRov**.

### Verification & Testing
```bash
# Run ESLint validation
npm run lint

# Run automated unit test suite
npm test

# Build production bundles
npm run build
```

---

## 📜 License
Educational & Aerospace Research Platform © LunaRov.
