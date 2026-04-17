# Onboarding Page

## Route
`/onboarding`

## Purpose
3-screen welcome carousel introducing new users to the Warga Digital app.

---

## Layout Structure

### Container
- Full viewport height: `h-full min-h-0`
- Background: `linear-gradient(180deg, #7bc67f 0%, #a2d8a5 40%, #d5ead7 100%)`
- Uses `OnboardingCarousel` component internally

### Content Area
- Centered content
- Horizontal scroll snapping for carousel effect
- Page indicators at bottom

---

## Components Used

### OnboardingCarousel
- Handles slide navigation
- Shows step indicators (dots)
- Navigation buttons (Next/Previous)
- Skip option
- Uses Framer Motion for animations

---

## Screen Content

### Slide 1: Welcome
- Title: "Selamat Datang di Warga Digital"
- Subtitle: "Platform digital untuk komunitas RT 03 Sawangan Regensi"
- Illustration: Community/home icon

### Slide 2: Features
- Title: "Fitur Lengkap"
- Bullet points:
  - Kas RT digital
  - Informasi warga
  - Jasa & layanan
  - Organisasi RT

### Slide 3: Get Started
- Title: "Mulai Sekarang"
- Subtitle: "Daftar dan bergabung dengan komunitas Anda"
- CTA Button: "Daftar Sekarang" → `/auth/register`
- Link: "Sudah punya akun? Masuk" → `/auth/login`

---

## Styling Details

### Background Gradient
```css
background: linear-gradient(180deg, 
  var(--color-surface-gradient-start) 0%,  /* #7bc67f */
  var(--color-surface-gradient-mid) 40%,   /* #a2d8a5 */
  var(--color-surface-gradient-end) 100%    /* #d5ead7 */
)
```

### Card Styling
- Background: white
- Border radius: `rounded-3xl`
- Padding: `p-6` or `p-8`
- Shadow: subtle drop shadow

### Step Indicators
- Active: `var(--color-indicator-active)` (#43a047)
- Inactive: `var(--color-indicator-inactive)` (#d5ead7)
- Size: circles, 8-10px diameter
- Spacing: gap-2

---

## Navigation

- "Daftar Sekarang" button → `/auth/register`
- "Masuk" link → `/auth/login`
- Skip button → `/auth/login`

---

## Animation

Uses Framer Motion for:
- Slide transitions (horizontal)
- Fade effects
- Button hover/press effects

Duration: typically 300-400ms
Easing: ease-out

---

## Responsive

- Mobile-first (320px minimum)
- Max content width constrained
- Touch-friendly navigation (swipe + buttons)
