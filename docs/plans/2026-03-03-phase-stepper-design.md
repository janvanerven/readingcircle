# Phase Stepper Design

## Context

Meet phases (Draft → Voting → Reading → Complete) are currently shown as flat colored pill badges with separate transition buttons. There's no visual sense of progression through the process.

## Design

### Component: `PhaseStepper`

A horizontal step-circle stepper component showing 4 phases connected by lines. Replaces the phase badge + PhaseControls on MeetDetailPage only. Meets list and dashboard keep their compact pill badges.

### Visual States

| State | Circle | Connector line | Label |
|-------|--------|----------------|-------|
| Completed | Sage filled, white checkmark | Sage solid | Sage text |
| Current | Burgundy filled, white icon, subtle ring animation | Sage solid (before) | Burgundy bold text |
| Upcoming | Gray outlined, gray icon | Gray dashed | Muted gray text |
| Next (clickable) | Gray outlined, burgundy on hover + pointer cursor | Gray dashed | Hover hint for host/admin |

### Icons (lucide-react)

- Draft: `Pencil`
- Voting: `BarChart3`
- Reading: `BookOpen`
- Complete: `CheckCircle`

### Interaction

- Host/admin can click the **next** step only (no skipping)
- Clicking opens an inline confirmation panel below the stepper with the existing i18n confirmation messages
- Non-host/non-admin users see read-only stepper
- Cancel/delete actions move to a small icon button in the header

### Cancelled Meets

Cancelled meets show a "Cancelled" badge instead of the stepper — no progression to visualize.

### Mobile

Steps stay horizontal. Below `sm` breakpoint, labels hide — only icons shown + current phase label.

### Placement

- **MeetDetailPage:** Replaces phase badge in header + PhaseControls component
- **MeetsPage / Dashboard / BookDetail:** Keep existing pill badges unchanged

### Files to Modify

| File | Change |
|------|--------|
| `client/src/components/PhaseStepper.tsx` | New component |
| `client/src/pages/MeetDetailPage.tsx` | Replace phase badge + PhaseControls with PhaseStepper |
| `client/src/i18n/en.json` | Add stepper-specific keys if needed |
| `client/src/i18n/nl.json` | Matching Dutch translations |
