

## Plan: Seller Profile Pages, Report Listing, and Location-Based Listings

### Overview
Three new features: public seller profiles with edit capability, a report listing system for flagging suspicious products, and location-based filtering on the marketplace.

---

### 1. Database Changes (Migration)

**Add `location` column to `products` table:**
```sql
ALTER TABLE products ADD COLUMN location text DEFAULT NULL;
```

**Create `reported_listings` table:**
```sql
CREATE TABLE reported_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  product_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reported_listings ENABLE ROW LEVEL SECURITY;
-- Users can insert their own reports
-- Users can view their own reports
-- Admins can view and update all reports
```

**Add `bio` column to `profiles` table** (for seller profile editing):
```sql
ALTER TABLE profiles ADD COLUMN bio text DEFAULT '';
```

---

### 2. Seller Profile Page (`src/pages/SellerProfile.tsx`)

- **Route**: `/seller/:id` (public page, viewable by authenticated users)
- **Display**: Avatar initials, full name, verification badge, bio, member since date, location
- **Listings tab**: All active products by this seller in a grid
- **Reviews tab**: All reviews for this seller using existing `SellerReviews` component
- **Edit mode**: If the logged-in user is viewing their own profile, show an "Edit Profile" button that toggles inline editing for bio, mobile number, and address fields (updates `profiles` table)

### 3. Report Listing Feature

- **Report button** on `ProductDetail.tsx`: A flag icon button that opens a dialog
- **Report dialog**: Reason dropdown (Suspicious listing, Counterfeit item, Misleading description, Scam, Other) + optional description textarea
- **Inserts into `reported_listings`** table with the reporter's ID
- **Admin Dashboard**: New "Reports" tab showing pending reports with product title, reporter, reason, and actions (Dismiss / Remove Listing)
- Users cannot report their own listings (enforced via RLS)

### 4. Location-Based Listings

- **CreateListing.tsx**: Add a "Location" text input (city/province) to the listing form
- **Marketplace.tsx**: Add location filter chips or a dropdown above the product grid; extend search to also match `location`
- **Product cards**: Show location below seller name (small text with MapPin icon)
- **ProductDetail.tsx**: Show location in product details

---

### 5. Route & Nav Updates

- Add `/seller/:id` route to `App.tsx`
- Link seller names in `ProductDetail.tsx` and `Marketplace.tsx` to `/seller/:id`

### Files to Create
- `src/pages/SellerProfile.tsx`

### Files to Edit
- `src/App.tsx` (add route)
- `src/pages/ProductDetail.tsx` (add report button + dialog, location display, link seller name)
- `src/pages/Marketplace.tsx` (location filter, show location on cards, link seller name)
- `src/pages/CreateListing.tsx` (add location input)
- `src/pages/AdminDashboard.tsx` (add Reports tab)
- `src/components/Navbar.tsx` (optionally add "My Profile" link)

### Database Migration
- Add `location` to `products`, `bio` to `profiles`, create `reported_listings` table with RLS

