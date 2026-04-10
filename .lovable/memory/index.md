# AgilityManager Memory

## Design System
- Fonts: Space Grotesk (display), Plus Jakarta Sans (body)
- Primary: Koboltblå hsl(221, 79%, 48%)
- Accent: Energiorange hsl(16, 100%, 60%)
- Background: hsl(210, 22%, 96%)

## Architecture
- Backend: Lovable Cloud (Supabase)
- Auth: Email/password via Supabase Auth
- All data in Supabase DB, no localStorage
- Sports: Agility, Hoopers (sport enum per dog)
- Swedish SAgiK classes: Nollklass, K1, K2, K3
- SHoK hoopers classes: Startklass, Klass 1, Klass 2, Klass 3
- Hoopers sizes: Small, Large
- Size classes (agility): XS, S, M, L (SAgiK standard)
- Disciplines: Agility, Jumping, Nollklass
- Hoopers training fields: dirigering_score, banflyt_score (1-5)

## Stripe Pricing
- Monthly: 19 kr/mån – price_1T9AioHzffTezY82OrEqKflT / prod_U7PXVAq6hRWosI
- Yearly: 99 kr/år – price_1T9AomHzffTezY82vtiObR7E / prod_U7Pe1Hsfd0nyji
- Edge functions: check-subscription, create-checkout, customer-portal

## Pending features
- Agilitydata.se competition integration
- Course planner FCI measurements
- Handler log
- Club features (premium)
- Notification system
- Search & filter
- Sharing features
- Merit tracking (Brons/Silver/Guld)
- AI coach "Axel"
