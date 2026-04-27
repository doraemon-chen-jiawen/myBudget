---
name: fresh-light-dense-cards
description: Define and enforce a light, airy, high-information-density card UI style with minimal user actions. Use when designing frontend pages/components that require fresh pastel visuals, clear hierarchy, compact content organization, and lazy-user-first interaction patterns.
---

# Fresh Light Dense Cards

## Purpose
Apply a consistent frontend style for pages that need:
- Fresh and light tone (shallow colors + whitespace)
- High information density without visual pressure
- Minimal operation burden (lazy-user-first)
- Card-based layout

## Trigger Terms
Use this skill when the user mentions any of:
- xiao qing xin, fresh style, light theme, soft colors
- high density, dashboard, lots of info, overview page
- minimal actions, one-click, low friction, lazy workflow
- card layout, blocks, modules, panel cards

## Non-Negotiable Design Tokens
Always start from these tokens unless user explicitly overrides:

```css
:root {
  --color-primary: #6FCF97;
  --color-accent: #56CCF2;
  --color-bg: #F7F9FB;
  --color-card: #FFFFFF;

  --color-text-main: #333333;
  --color-text-secondary: #888888;
  --color-text-hint: #BDBDBD;

  --radius-card: 14px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
}
```

## Visual Direction

### 1) Light + Breathing
- Use `--color-bg` as page background and `--color-card` for content blocks.
- Keep generous outer margins and section spacing.
- Prefer subtle shadows and thin borders over heavy contrast.
- Avoid visual noise: no dense gradients, no over-strong saturation.

### 2) Dense but Not Oppressive
- Keep many data points, but chunk them into small cards.
- Use clear levels: title > key number > detail line > hint/meta.
- Each card should be scannable in 3 seconds.
- Use compact vertical rhythm (8/12/16 spacing), not cramped typography.

### 3) Lazy-User-First Interaction
- Default to read-first interfaces.
- Reduce decision points: one primary action per card max.
- Prefer quick actions: toggle, one-click confirm, inline edit.
- Pre-fill known values and smart defaults.
- Avoid multi-step flows unless unavoidable.

### 4) Card-Based Composition
- Build with responsive card grid.
- Card responsibilities should be single-purpose:
  - summary card
  - trend/status card
  - todo/action card
  - quick-entry card
- Keep card headers consistent: title left, optional action right.

## Layout Rules

### Page Skeleton
1. Top area: lightweight overview (KPIs + filters if needed)
2. Main area: card grid (2-4 columns depending on width)
3. Secondary area: lower-priority details in collapsible or tabbed cards

### Recommended Grid
- >= 1440px: 4 columns
- >= 1200px: 3 columns
- >= 768px: 2 columns
- < 768px: 1 column

### Card Spec
- Padding: 16-20px
- Radius: 14px
- Border: `1px solid #EEF2F5`
- Shadow: `0 6px 20px rgba(36, 56, 80, 0.06)`
- Hover: slight lift (`translateY(-2px)`) + border tint

## Typography Rules
- Keep typography neutral and readable.
- Suggested sizes:
  - Page title: 24/32 semibold
  - Card title: 16/24 medium
  - Key metric: 28/34 semibold
  - Body: 14/22 regular
  - Hint/meta: 12/18 regular
- Ensure high contrast for key values with `--color-text-main`.

## Color Usage Rules
- Primary (`--color-primary`) for:
  - positive states
  - main CTA
  - important highlights
- Accent (`--color-accent`) for:
  - secondary emphasis
  - links and auxiliary trend lines
- Keep warning/error colors low-volume and localized.

## Motion Rules
- Use subtle transitions (160-240ms).
- Animate entry by section/card stagger, not every element.
- Avoid bouncing or dramatic transforms.
- Motion should support hierarchy, not decoration.

## Accessibility and Readability
- Minimum contrast meets WCAG AA for body text.
- Click targets >= 36px height.
- Maintain keyboard focus visibility.
- Do not encode important meaning by color alone.

## Output Contract
When generating UI code/design specs:

1. Start with a brief style intent sentence (1-2 lines).
2. Include a token block (CSS variables or theme object).
3. Provide page structure (sections + card types).
4. Provide key component snippets only (not full boilerplate unless asked).
5. Explain how interaction count is minimized.

## Quality Checklist
- [ ] Uses exact theme colors or justified variants
- [ ] Card layout is dominant and consistent
- [ ] High information density achieved via chunking, not crowding
- [ ] Primary user journey requires minimal steps
- [ ] Visual tone remains light, clean, and calm
- [ ] No generic heavy-dashboard look

## Additional Resources
- For ready-to-use page skeletons, see [examples.md](examples.md).
