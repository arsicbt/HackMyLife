---
name: Questia
colors:
  surface: '#fcf8ff'
  surface-dim: '#dbd8e5'
  surface-bright: '#fcf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f2fe'
  surface-container: '#efecf9'
  surface-container-high: '#e9e6f3'
  surface-container-highest: '#e4e1ed'
  on-surface: '#1b1b23'
  on-surface-variant: '#464555'
  inverse-surface: '#302f39'
  inverse-on-surface: '#f2effb'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#4849da'
  primary: '#4343d5'
  on-primary: '#ffffff'
  primary-container: '#5d5fef'
  on-primary-container: '#faf7ff'
  inverse-primary: '#c1c1ff'
  secondary: '#705d00'
  on-secondary: '#ffffff'
  secondary-container: '#fdd404'
  on-secondary-container: '#6f5c00'
  tertiary: '#904400'
  on-tertiary: '#ffffff'
  tertiary-container: '#b65700'
  on-tertiary-container: '#fff6f3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c1c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2e2bc2'
  secondary-fixed: '#ffe171'
  secondary-fixed-dim: '#e9c400'
  on-secondary-fixed: '#221b00'
  on-secondary-fixed-variant: '#554600'
  tertiary-fixed: '#ffdbc8'
  tertiary-fixed-dim: '#ffb689'
  on-tertiary-fixed: '#321300'
  on-tertiary-fixed-variant: '#743500'
  background: '#fcf8ff'
  on-background: '#1b1b23'
  surface-variant: '#e4e1ed'
  french-blue: '#4361EE'
  math-purple: '#9B51E0'
  history-gold: '#F2994A'
  science-green: '#27AE60'
  physics-teal: '#00B4D8'
  tech-slate: '#4A4E69'
  languages-red: '#EF476F'
  xp-bar: '#00FFC2'
  vark-visual: '#FF9F1C'
  vark-auditory: '#2EC4B6'
  vark-read: '#E71D36'
  vark-kinaesthetic: '#011627'
typography:
  display-hero:
    fontFamily: Bricolage Grotesque
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-md:
    fontFamily: Bricolage Grotesque
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  display-hero-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
  headline-lg-mobile:
    fontFamily: Bricolage Grotesque
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  container-max: 1200px
---

## Brand & Style
The design system for this educational platform is built on the philosophy of **Immersive Adventure**. It aims to transform the perceived drudgery of school revision into an RPG-inspired journey of discovery. The target audience—students aged 11-12—requires a balance between "cool" gaming aesthetics and the clarity of educational tools.

The visual style is **Tactile Modernism**. It blends clean, accessible interface elements with isometric 2D environmental storytelling. The interface should feel "juicy"—buttons should have physical depth, transitions should feel bouncy and energetic, and the "Floating Island" motif should be reinforced through layered depth and soft, ambient shadows. The atmosphere is encouraging and adventurous, avoiding high-stress "exam" aesthetics in favor of a "quest" narrative.

## Colors
The color strategy uses a **Core Neutral** UI to ensure stability, while **Contrée-specific** palettes provide immersion.
- **Primary & Secondary:** A vibrant "Questia Purple" serves as the main brand anchor, paired with an "Achievement Gold" for rewards and call-to-actions.
- **Subject-Based Palette:** Each of the 7 Lands has a signature color used for progress bars, quest icons, and modal headers within that subject's flow.
- **VARK Indicators:** Four distinct, high-contrast colors are reserved exclusively for the learning mode icons to ensure immediate cognitive recognition.
- **Semantic Colors:** Success states use the "Science Green," while errors use "Language Red," integrated naturally into the RPG world (e.g., a "failing" potion or a "broken" gear).

## Typography
Accessibility is the cornerstone of the typography. 
- **Headings:** We use *Bricolage Grotesque* for its playful, quirky personality and excellent legibility. It feels like a modern adventure game title.
- **Body & Interface:** *Atkinson Hyperlegible Next* is selected as the primary body font. Designed specifically for low-vision and neurodivergent readers, it ensures that learning content is accessible to all students, including those with dyslexia or ADHD.
- **Hierarchies:** Large, expressive display types are used for quest titles and "Level Up" celebrations. Labels and UI controls are kept strictly in Atkinson Hyperlegible to maximize clarity during task-heavy exercises.

## Layout & Spacing
The design system employs a **Layered Depth** layout. 
- **The World Layer:** A full-screen isometric map (the 7 Lands).
- **The UI Layer:** Floating "Quest Cards" and status bars that sit atop the map using generous margins (24px on desktop, 16px on mobile).
- **Grid:** A 12-column grid is used for the "Scribe" and "Professor" dashboards, while the main student interface relies on **Floating Modals** and centered quest containers to maintain focus.
- **Rhythm:** An 8px base unit ensures consistent scaling. Larger gaps (48px+) are used to separate game-world elements from UI controls to prevent accidental clicks during gameplay.

## Elevation & Depth
Depth is used to simulate a physical "board game" feel:
- **Level 0 (The Island):** The base isometric map.
- **Level 1 (The Cards):** White or light-tinted cards with a soft, 15% opacity shadow. These hold exercises and navigation.
- **Level 2 (The Interactive):** Buttons and XP bars feature a "bottom-heavy" border (3px darker shade) to simulate physical thickness, making them feel clickable.
- **Backdrop Blurs:** When a modal is active (e.g., choosing a VARK mode), the game world is blurred and dimmed to reduce cognitive load and focus the student on the decision.

## Shapes
The shape language is **Soft & Organic**. 
- **Rounded Corners:** 0.5rem (8px) is the standard for standard components, but "Quest Cards" and major containers use `rounded-xl` (24px) to feel friendly and safe.
- **Isometric Framing:** Buttons often use a slight skew or a secondary bottom-layer to match the isometric perspective of the game world.
- **VARK Icons:** Encased in circular "Medallions" to distinguish them from rectangular content containers.

## Components
- **Quest Cards:** Large, high-radius cards with an illustrative header representing the Contrée. Includes a "Difficulty Level" (Stars) and "Estimated XP" badge.
- **RPG Progress Bars (XP):** Thick bars with a high-contrast "XP-Bar" fill. Features a subtle "glow" effect when nearly full and a "particle burst" animation upon level-up.
- **VARK Mode Selectors:** A horizontal row of four stylized "Ability Icons." When hovered or tapped, they expand to show a brief description (e.g., "Visual: Learning with Mind Maps").
- **Avatar HUD:** A fixed top-left component showing the student’s custom-generated avatar head, current level, and a "Mini-Map" shortcut.
- **The "Oracle" Input:** Text fields and inputs for the "Reading/Writing" mode are framed with a parchment-like texture or a clean, "High-Contrast" border for readability, avoiding distracting decorations inside the active text area.
- **Action Buttons:** Large, chunky buttons with a primary brand color. They should "depress" (move 2px down) when clicked to provide tactile feedback.