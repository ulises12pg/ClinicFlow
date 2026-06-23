# ClinicFlow (MedConsulta) — Design System & Visual Guidelines

This document defines the craft rules, tokens, hierarchy, and spatial structure of the ClinicFlow application. All future visual modifications, components, and layout edits must strictly adhere to these definitions.

---

## 🎨 Visual Direction & Feel

- **Feel:** *Clinical Trust with Analog Warmth.* The app must feel calm, highly legible, clean, and professional like a modern digital clinic, while retaining the tactile trust of traditional physical prescription pads and medical records.
- **Audience:** Doctors, nurses, and administrative staff. They need clear visual hierarchy, zero clutter, accessible text under varying room lighting, and large ergonomic targets.
- **Color Temperature:** Natural clinic elements. Warm off-whites for backgrounds, clean surgical blues for actions, and therapeutic greens/teals for positive health states.

---

## 🏗️ Design System & Token Architecture

### Color Palette (Mapped to Semantic Values)
Rather than raw Tailwind grays, the app binds elements to semantic layers:

- **Canvas Background (`bg-background`):** `hsl(210, 40%, 98%)` — A soft, cool clinical off-white that reduces eye strain.
- **Surface Card (`bg-card`):** `hsl(0, 0%, 100%)` — Pure white card surfaces to create crisp boundaries.
- **Borders (`border-border`):** `rgba(15, 23, 42, 0.08)` (Light) · `rgba(255, 255, 255, 0.08)` (Dark) — Soft, translucent separators that dissolve into the layout rather than calling attention to themselves.
- **Primary / Brand (`bg-primary`):** `hsl(221.2, 83.2%, 53.3%)` — A reliable, high-contrast clinical blue for primary actions.
- **Muted Foreground (`text-muted-foreground`):** `hsl(215.4, 16.3%, 46.9%)` — Used for secondary meta-information and labels.

### Depth & Elevation Scale
We use **Borders + Layered Shadows** to communicate height:
- **Base (Canvas):** `0px` elevation, flat canvas background.
- **Level 1 (Cards, Main Sections):** Subtle shadow and soft border:
  `box-shadow: 0 1px 2px -1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.05)`
- **Level 2 (Modals, Popovers, Dropdowns):** Defined overlay lift:
  `box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06)`

---

## 📐 Spacing & Layout Rhythm

- **Base Unit:** `8px` (`0.5rem`) grid system.
- **Density:** *Workbench Compact.* Padding within buttons and inputs is slightly generous (`h-10` to `h-12`) for easy touch/mouse targets, but card spacing and list density are kept tight to display patient data and prescription details efficiently without scrolling.
- **Padding Symmetry:** Always use equal horizontal and vertical padding scales (e.g., `p-5` or `p-6`) for card layouts to maintain visual stability.
- **Concentric Radius:** Interactive elements must scale their corners:
  - Outer Container: `rounded-xl` (`12px`)
  - Inner Elements / Buttons / Inputs: `rounded-lg` (`8px`)
  - Mini Checkboxes / Badges: `rounded-md` (`6px`)

---

## ✍️ Typography Scale & Hierarchy

We use a dual-typeface system to separate editorial tone from data readability:
1. **Manrope (Headings):** Modern, geometric sans-serif that feels clean and reliable.
2. **IBM Plex Sans (Body / Tables / Data):** Highly readable technical sans-serif that retains clean tracking even at small font sizes.

### Font-Weight over Size
To prevent flat layouts, we use weight and color opacity to differentiate text elements instead of just increasing font size:
- **Metric Figure:** `28px / font-bold / text-slate-900 / tabular-nums`
- **Primary Label:** `14px / font-semibold / text-slate-900`
- **Supporting Meta:** `12px / font-medium / text-slate-500`
- **Section Heading:** `16px / font-bold / text-slate-900`

---

## 💫 Polish & Micro-interactions

- **Tabular Numbers:** All inventories, price totals, dates, hours, and counters must use `font-variant-numeric: tabular-nums` to eliminate layout jitter.
- **Press Feedback:** All clickable buttons must scale on click to provide tangible physical confirmation: `active:scale-[0.98] transition-transform duration-100`.
- **Transitions:** Occasional surfaces (drawers, modals) animate with a custom ease-out curve: `cubic-bezier(0.23, 1, 0.32, 1)` over `200ms`. Do NOT animate items that are used repeatedly (such as autocomplete search suggestions) to keep the app snappy.
- **Image Outlines:** Embedded logos must have a `1px` translucent inset border (`rgba(0, 0, 0, 0.06)`) to prevent high-contrast white images from bleeding into the card backgrounds.
