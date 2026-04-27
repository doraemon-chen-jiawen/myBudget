# Fresh Light Dense Cards Examples

## Example A: High-Density Dashboard

### Use Case
Personal finance overview page with many metrics, but low cognitive load.

### Page Structure
1. Header strip
   - page title
   - date range quick switch (Today / 7D / 30D)
   - one primary CTA: "Quick Add"
2. KPI row (4 summary cards)
   - total balance
   - monthly income
   - monthly expense
   - savings rate
3. Main grid
   - expense trend card (line chart)
   - category distribution card (ring chart + top categories)
   - budget health card (progress bars)
   - upcoming bills card (list + one-click mark paid)
4. Lower priority block
   - "recent records" compact table card
   - "smart suggestions" tips card

### Card Composition Template
```html
<section class="card card--summary">
  <header class="card__header">
    <h3 class="card__title">Monthly Expense</h3>
    <button class="card__action">Details</button>
  </header>
  <p class="card__metric">¥4,860</p>
  <p class="card__meta">vs last month -8.4%</p>
</section>
```

### Interaction Minimization
- Keep all key metrics visible on first screen.
- Use inline quick actions ("mark paid", "edit budget") inside card.
- Default date range to "30D" based on common behavior.
- Avoid modal unless user explicitly enters edit flow.

---

## Example B: List + Detail Workspace

### Use Case
Transaction management page where users scan many entries and make occasional edits.

### Page Structure
1. Left: filter cards column (sticky)
   - quick filters (today, this week, abnormal amount)
   - account selector
   - amount range slider
2. Center: dense list card
   - compact list/table hybrid
   - row-level status chips
   - inline "edit tag" and "move category"
3. Right: detail card (context panel)
   - selected record details
   - AI suggestion reason card
   - one-click apply suggestion

### Responsive Strategy
- Desktop: 3-column layout (`280px 1fr 360px`)
- Tablet: 2-column layout (filters collapse to top drawer)
- Mobile: stacked cards with sticky quick actions

### Interaction Minimization
- Keep edit operations inline in list rows.
- Persist filter state automatically.
- Support batch select + one-click batch category assignment.
- Auto-focus next unresolved item after current item is processed.

---

## Shared Token Snippet

```css
:root {
  --color-primary: #6FCF97;
  --color-accent: #56CCF2;
  --color-bg: #F7F9FB;
  --color-card: #FFFFFF;
  --color-text-main: #333333;
  --color-text-secondary: #888888;
  --color-text-hint: #BDBDBD;

  --card-border: 1px solid #EEF2F5;
  --card-shadow: 0 6px 20px rgba(36, 56, 80, 0.06);
  --card-radius: 14px;
}
```
