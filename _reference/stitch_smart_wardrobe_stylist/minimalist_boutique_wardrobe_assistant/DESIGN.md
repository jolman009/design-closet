---
name: Minimalist Boutique Wardrobe Assistant
colors:
  surface: '#fdf9f5'
  surface-dim: '#ddd9d6'
  surface-bright: '#fdf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f7f3ef'
  surface-container: '#f1edea'
  surface-container-high: '#ebe7e4'
  surface-container-highest: '#e6e2de'
  on-surface: '#1c1b1a'
  on-surface-variant: '#424845'
  inverse-surface: '#31302e'
  inverse-on-surface: '#f4f0ec'
  outline: '#727875'
  outline-variant: '#c2c8c4'
  surface-tint: '#4e635a'
  primary: '#4e635a'
  on-primary: '#ffffff'
  primary-container: '#8da399'
  on-primary-container: '#263932'
  inverse-primary: '#b5ccc1'
  secondary: '#615e56'
  on-secondary: '#ffffff'
  secondary-container: '#e4dfd5'
  on-secondary-container: '#65635a'
  tertiary: '#5e5e5b'
  on-tertiary: '#ffffff'
  tertiary-container: '#9f9e9a'
  on-tertiary-container: '#353632'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d1e8dd'
  primary-fixed-dim: '#b5ccc1'
  on-primary-fixed: '#0b1f18'
  on-primary-fixed-variant: '#374b43'
  secondary-fixed: '#e7e2d8'
  secondary-fixed-dim: '#cac6bc'
  on-secondary-fixed: '#1d1c15'
  on-secondary-fixed-variant: '#49473f'
  tertiary-fixed: '#e4e2dd'
  tertiary-fixed-dim: '#c8c6c2'
  on-tertiary-fixed: '#1b1c19'
  on-tertiary-fixed-variant: '#474744'
  background: '#fdf9f5'
  on-background: '#1c1b1a'
  surface-variant: '#e6e2de'
typography:
  headline-lg:
    fontFamily: Playfair Display
    fontSize: 40px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '500'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Playfair Display
    fontSize: 22px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 48px
  xl: 80px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 64px
---

## Brand & Style

The design system is built on a "minimalist boutique" philosophy, prioritizing high-end curation over visual clutter. It targets a discerning audience that values organization as a form of self-care. The UI should evoke the serene atmosphere of a luxury dressing room—calm, personal, and meticulously organized.

The aesthetic blends **Modern Minimalism** with **Tonal Layering**. It relies on generous whitespace to create "breathing room" for imagery, ensuring that the user’s clothing photography remains the centerpiece. Visual hierarchy is established through sophisticated typography and subtle shifts in neutral tones rather than aggressive borders or loud colors. The emotional response should be one of quiet confidence and effortless order.

## Colors

The palette is rooted in nature and high-end textiles. 

- **Primary (Sage Green):** Used sparingly for intentional actions, success states, and brand-defining accents. It represents growth and a fresh start to the day.
- **Secondary (Warm Grey):** Used for secondary text, borders, and inactive states. It provides a softer alternative to black, maintaining the boutique feel.
- **Tertiary (Cream):** The foundational surface color. It replaces pure white to reduce eye strain and provide a warmer, more premium "paper" feel.
- **Neutral (Charcoal):** Reserved for primary headings and body text to ensure high legibility against the cream background.

Surface elevations are created by layering lighter and darker variations of the Cream and Warm Grey, rather than using harsh shadows.

## Typography

The typographic system utilizes a classic editorial pairing. **Playfair Display** provides an authoritative, fashion-forward voice for headings, while **Inter** ensures functional clarity for all interface elements and long-form descriptions.

To maintain the "boutique" feel, labels and small navigation elements use Inter with increased letter spacing and uppercase styling. This mimics the look of high-end clothing tags. Line heights are intentionally generous (1.6x for body text) to reinforce the sense of airiness and luxury.

## Layout & Spacing

The layout follows a **Fluid Grid** model with strict adherence to a 12-column system for desktop and a 4-column system for mobile.

- **Whitespace:** Use `lg` (48px) and `xl` (80px) spacing to separate major sections. Do not fear "empty" space; it is a luxury asset in this design system.
- **Grid:** On desktop, use a 12-column grid with 24px gutters. Cards should typically span 3 columns (for 4 items per row) or 4 columns (for 3 items per row).
- **Mobile:** Margins are set to 20px to provide a modern, edge-to-edge feel without losing touch targets.
- **Reflow:** On tablet, the grid shifts to 8 columns. Complex wardrobe views reflow from a horizontal scroll on mobile to a multi-row grid on desktop.

## Elevation & Depth

This design system avoids traditional heavy shadows. Depth is achieved through **Tonal Layers** and **Soft Ambient Occlusion**.

- **Level 0 (Base):** The main background using Tertiary Cream (#F9F7F2).
- **Level 1 (Cards):** Elements are placed on white (#FFFFFF) backgrounds with an extremely soft, 10% opacity Sage or Grey tint shadow (Blur: 20px, Y: 4px).
- **Level 2 (Modals/Overlays):** These use a subtle Backdrop Blur (8px) over the background to maintain context while focusing the user's attention.
- **Interactions:** Hover states should not use shadows; instead, use a slight scale increase (1.02x) or a subtle background color shift to the Primary Sage at 5% opacity.

## Shapes

The shape language is **Soft** and architectural. While sharp corners feel too aggressive, fully rounded "pill" shapes feel too casual/techy. 

- **Standard Radius:** 0.25rem (4px) for small components like checkboxes or tags.
- **Card Radius:** 0.5rem (8px) for clothing items and modular sections.
- **Button Radius:** 0.25rem (4px) to maintain a tailored, formal look.

Images of clothing should always use the `rounded-lg` (8px) setting to soften the photography and unify disparate image qualities.

## Components

- **Buttons:** Primary buttons use a solid Sage Green background with white text. Secondary buttons are "Ghost" style with a 1px Warm Grey border and charcoal text. No heavy gradients.
- **Cards:** Cards are the primary container. They should have no border, a white background, and a very soft shadow. Content inside should have 24px internal padding.
- **Chips/Tags:** Used for "Season" or "Fabric" labels. Use a Warm Grey 10% opacity background with `label-sm` typography. Corners are slightly rounded (4px).
- **Input Fields:** Minimalist design—bottom border only (1px Warm Grey) in the resting state, transitioning to a Sage Green 1px border on focus. No background fill.
- **Lists:** Clean, expansive rows with 1px horizontal dividers in 5% Grey. Use trailing icons (chevron-right) in Warm Grey for navigation.
- **Wardrobe Slot:** A specific component for empty states; a dashed 1px Warm Grey border with a centered "plus" icon in Sage Green.