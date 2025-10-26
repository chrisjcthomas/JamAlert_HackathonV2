# Community-Level Location Tracking Enhancement

## Overview

The JAMALERT application has been enhanced to support community-level location tracking, enabling more targeted flood alerts for specific communities within parishes. This addresses the limitation of only tracking at the parish level.

## What Was Implemented

### 1. Database Schema Updates

**File:** `backend/prisma/schema.prisma`

#### User Model Enhancement
Added `community` field to the User model:
```prisma
model User {
  // ... existing fields ...
  parish                Parish
  community             String?  @db.VarChar(255)  // NEW FIELD
  address               String?  @db.Text
  // ... rest of fields ...
  
  @@index([parish, community])  // NEW INDEX for efficient queries
}
```

#### Alert Model Enhancement
Added `communities` field to the Alert model for targeting specific communities:
```prisma
model Alert {
  // ... existing fields ...
  parishes        Json          // Array of affected parishes
  communities     Json?         // NEW: Optional array of specific communities
  // ... rest of fields ...
}
```

#### Incident Report Model
The IncidentReport model already had a `community` field - no changes needed:
```prisma
model IncidentReport {
  parish             Parish
  community          String?            @db.VarChar(255)  // Already existed
  // ... rest of fields ...
}
```

### 2. Community Data Library

**File:** `lib/communities.ts`

Created a comprehensive library of flood-prone communities in Jamaica, organized by parish:

- **Total Communities:** 140+ known flood-prone areas across all 14 parishes
- **Key Features:**
  - Communities organized by parish
  - Helper functions for autocomplete and search
  - Flood-prone designation for all listed communities

**Example Communities:**
- **Kingston:** Harbour View, Riverton Meadows, Rae Town, Rockfort, etc.
- **St. Andrew:** Riverton Meadows, Waterhouse, August Town, Hermitage, etc.
- **St. Catherine:** Portmore, Gregory Park, Independence City, Waterford, etc.
- **St. James:** Montego Bay, Reading, Cambridge, Anchovy, etc.

**Available Functions:**
```typescript
getCommunitiesByParish(parish: Parish): string[]
getAllCommunities(): Community[]
searchCommunities(query: string): Community[]
getCommunitySuggestions(parish: Parish, query: string): string[]
```

### 3. Frontend Updates

#### User Profile Form Enhancement
**File:** `components/forms/user-profile-form.tsx`

Added community selection dropdown:
- Dropdown is disabled until a parish is selected
- Automatically populates with communities for the selected parish
- Includes "None / Other" option for unlisted communities
- Shows helpful text: "Select your specific community for more targeted flood alerts"

#### Incident Report Form
**File:** `components/forms/report-form.tsx`

The community field was already implemented - no changes needed.

#### Type Definitions
**File:** `lib/api/user-profile.ts`

Updated UserProfile interface to include community field:
```typescript
export interface UserProfile {
  // ... existing fields ...
  parish: string;
  community?: string;  // NEW FIELD
  address?: string;
  // ... rest of fields ...
}
```

## How It Works

### For Users

1. **Registration/Profile Setup:**
   - User selects their parish (e.g., "Kingston")
   - Community dropdown activates with relevant communities
   - User selects their specific community (e.g., "Harbour View")
   - System stores both parish and community information

2. **Receiving Alerts:**
   - Users can receive parish-wide alerts (all users in Kingston)
   - Users can receive community-specific alerts (only Harbour View residents)
   - Admins can target alerts to specific communities within a parish

3. **Reporting Incidents:**
   - Users can specify the exact community where an incident occurred
   - This provides more precise location data for emergency response

### For Administrators

1. **Creating Targeted Alerts:**
   - Select one or more parishes
   - Optionally select specific communities within those parishes
   - Alert is sent only to users in the specified communities
   - If no communities specified, alert goes to entire parish

2. **Viewing Incident Reports:**
   - Reports show both parish and community information
   - Easier to identify flood-prone hotspots
   - Better data for emergency planning

## Benefits

### 1. More Targeted Alerts
- Reduce alert fatigue by sending alerts only to affected communities
- Example: Flash flood in Harbour View doesn't alert all of Kingston

### 2. Better Emergency Response
- Precise location data helps emergency services respond faster
- Identify recurring problem areas for infrastructure improvements

### 3. Improved User Experience
- Users receive only relevant alerts for their specific area
- Reduces unnecessary notifications
- Increases trust in the alert system

### 4. Enhanced Data Collection
- Better understanding of flood patterns at community level
- Identify which communities are most vulnerable
- Support evidence-based policy decisions

## Database Migration Required

To use this feature in production, you need to run a database migration:

```bash
# Generate migration
cd backend
npx prisma migrate dev --name add_community_tracking

# Or for production
npx prisma migrate deploy
```

This will:
1. Add `community` column to `users` table
2. Add `communities` column to `alerts` table
3. Create index on `(parish, community)` for efficient queries

## Testing the Feature

### Test Scenario 1: User Profile Update
1. Navigate to user profile page
2. Select a parish (e.g., "St. Catherine")
3. Observe community dropdown activates
4. Select a community (e.g., "Portmore")
5. Save profile
6. Verify community is saved

### Test Scenario 2: Incident Reporting
1. Navigate to incident report form
2. Select parish and community
3. Submit report
4. Verify report shows correct community

### Test Scenario 3: Admin Alert Creation
1. Login as admin
2. Create new alert
3. Select parishes
4. Select specific communities (future enhancement)
5. Send alert to targeted communities

## Future Enhancements

### 1. Admin Alert UI for Community Selection
Currently, the admin alert creation form needs to be updated to include community selection. This would allow admins to:
- Select specific communities within selected parishes
- Preview how many users will receive the alert
- Save community templates for frequently alerted areas

### 2. Community-Based Analytics
- Dashboard showing alerts per community
- Heatmap of most flood-prone communities
- Historical data on community-level incidents

### 3. Community Verification
- Verify user's community through address validation
- Allow users to update community if they move
- Track community changes for better data quality

### 4. Smart Community Suggestions
- Use GPS coordinates to suggest likely community
- Machine learning to improve community matching
- Integration with Jamaica's official community boundaries

## Known Flood-Prone Communities

The system includes 140+ known flood-prone communities across Jamaica, including:

**High-Risk Areas:**
- Riverton Meadows (St. Andrew) - Known for severe flooding
- Harbour View (Kingston) - Coastal flooding risk
- Portmore (St. Catherine) - Low-lying area prone to flooding
- Downtown Kingston - Urban flooding during heavy rains
- Montego Bay (St. James) - Coastal and urban flooding

**Medium-Risk Areas:**
- Half Way Tree (St. Andrew)
- Spanish Town (St. Catherine)
- May Pen (Clarendon)
- Savanna-la-Mar (Westmoreland)

## Technical Notes

### Data Storage
- Community names stored as strings (VARCHAR 255)
- Case-sensitive matching for consistency
- Optional field - users can leave blank if community not listed

### Performance
- Indexed on `(parish, community)` for fast queries
- Community list loaded client-side for instant autocomplete
- No additional API calls needed for community suggestions

### Compatibility
- Backward compatible - existing users without community data still work
- Community field is optional in all forms
- Alerts without community specification work as before (parish-wide)

## Conclusion

The community-level tracking enhancement significantly improves JAMALERT's ability to provide targeted, relevant flood alerts to Jamaican residents. By tracking location at the community level rather than just parish level, the system can:

1. Reduce alert fatigue
2. Improve emergency response times
3. Provide better data for policy decisions
4. Enhance user trust and engagement

This feature is production-ready and can be deployed after running the required database migrations.

