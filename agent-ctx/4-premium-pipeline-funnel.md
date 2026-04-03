---
## Task ID: 4 - premium-pipeline-funnel
### Work Task
Rewrite `/home/z/my-project/src/components/analytics/pipeline-funnel.tsx` with a PREMIUM custom funnel design featuring CSS clip-path trapezoid shapes, Framer Motion animations, conversion/drop-off badges, and toggle between Funnel and Bar views.

### Work Summary
Completely rewrote the PipelineFunnel component with the following premium design features:

**1. Custom CSS Funnel View (primary "Funil" tab):**
- Each stage rendered as a CSS bar that narrows progressively using `clip-path: polygon()` trapezoid shapes
- First stage (Applied) uses wider polygon: `polygon(0 0, 100% 0, 96% 100%, 4% 100%)` — widest at top
- Middle stages: `polygon(2% 0, 98% 0, 96% 100%, 4% 100%)` — slightly narrower
- Last stage (Hired): `polygon(4% 0, 96% 0, 100% 100%, 0 100%)` — narrowest at bottom
- Width calculated proportionally: `(stage.value / topValue) * 100%` with minimum 18%
- Each bar has gradient fill from CHART_COLORS palette with inner shimmer overlay and bottom shadow
- Framer Motion stagger animation: bars animate from `scaleX: 0` to `scaleX: 1` with 120ms delay per stage, using cubic-bezier easing `[0.22, 1, 0.36, 1]`
- Inner content area also animates width from 0% to 100% independently
- Candidate count centered in white bold text with "candidatos" subtitle (hidden on mobile)
- Stage name label on left (hidden on mobile, shown inline on mobile)
- Conversion rate badge on right side with TrendingUp icon, colored to match stage

**2. Drop-off Indicators (between stages):**
- Small red indicator between each pair of stages showing:
  - TrendingDown icon (w-3 h-3)
  - Dropped count and percentage: "-X (Y%)"
  - Horizontal gradient lines fading from transparent → red-300 → transparent on both sides
- Animated entrance: opacity 0→1 with slight upward slide

**3. Chevron Connectors:**
- ChevronDown icons between stages as visual connectors
- Subtle muted-foreground/50 color
- Animated entrance: opacity 0→1, scale 0.5→1

**4. Funnel Legend:**
- Color dots + stage names below the funnel
- Animated entrance with delay after all stages finish
- Border-top separator line

**5. Premium Bar View (alternative "Barras" tab):**
- Recharts `BarChart` in horizontal layout
- Two bar groups: "Conversão %" (blue→green gradient) and "Evasão %" (red gradient fading)
- SVG `linearGradient` defs for each bar: `convGradient-N` and `dropGradient-N`
- Gradient fills: blue→green for conversion, solid red → 30% opacity for dropoff
- Rounded right corners: `radius={[0, 6, 6, 0]}`
- Max bar size: 24px, 20% category gap
- Reference line at average conversion rate with purple dashed stroke and label "Média: X%"
- Custom cursor: muted fill at 30% opacity
- Custom tooltip (`BarChartTooltip`): card-style with rounded-xl border, shows label + colored dot + value for each bar

**6. View Toggle:**
- shadcn Tabs component with "Funil" and "Barras" triggers
- AnimatePresence with mode="wait" for smooth crossfade between views
- Funil slides from left, Barras slides from right

**7. Header:**
- "Conversão do Funil" title + "Taxas de conversão por etapa" description
- Summary stats on right (hidden on mobile): "X inscritos | Y contratados | Conversão global: Z%"
- Overall conversion calculated from first stage to last stage

**8. Loading/Empty States:**
- Loading: 5 skeleton bars with decreasing widths matching funnel shape
- Empty: Minus icon + "Nenhum dado de pipeline disponível" message

**9. Sub-components:**
- `FunnelStage` — Internal type for individual stage props
- `DropOffIndicator` — Red drop-off display between stages
- `ChevronConnector` — ChevronDown between stages
- `CustomFunnelView` — Complete custom CSS funnel
- `BarChartTooltip` — Custom card-style tooltip for bar chart
- `PremiumBarView` — Recharts bar chart with gradients
- `FunnelLegend` — Color legend below funnel

**10. Technical details:**
- Same `PipelineFunnelProps` interface preserved exactly
- `"use client"` directive
- All text in pt-BR
- Imports `CHART_COLORS` from `@/lib/analytics/charts`
- Uses framer-motion for all animations
- ESLint passes with zero errors
