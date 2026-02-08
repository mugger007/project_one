# Database Functions

This directory contains SQL functions and optimizations for the matching system.

## Prerequisites

**Enable PostGIS Extension:**
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

## Setup Instructions

Run these SQL files in your Supabase SQL Editor in order:

### 1. Match Compatibility System (`match_compatibility.sql`)

Creates the compatibility checking system with the following components:

**Function: `check_user_compatibility(user1_id, user2_id)`**
- Checks if two users are compatible based on their match_settings
- Validates: age range (minAge/maxAge), gender preference, distance (km)
- Uses PostGIS ST_Distance for geographic calculations
- Security: DEFINER with search_path set to public, extensions
- Returns: BOOLEAN

**Materialized View: `user_compatibility_cache`**
- Pre-computed compatibility matrix for all user pairs
- Refresh when match_settings change
- Significantly improves match checking performance

**Function: `refresh_user_compatibility_cache(target_user_id)`**
- Refreshes the entire materialized view (ignores target_user_id parameter)
- Uses REFRESH MATERIALIZED VIEW CONCURRENTLY for non-blocking updates
- Security: DEFINER with search_path set to public, extensions
- Call this after a user updates their match preferences

**Indexes:**
- `idx_users_match_settings` - GIN index for JSONB queries
- `idx_users_location` - GIST index for geography queries
- `idx_users_dob` - B-tree index for age calculations
- `idx_users_gender` - B-tree index for gender filtering

## Usage

### Check compatibility between two users:
```sql
SELECT check_user_compatibility(
  'user1-uuid'::uuid, 
  'user2-uuid'::uuid
);
```

### Refresh cache after updating match settings:
```sql
-- From your app after user updates preferences
SELECT refresh_user_compatibility_cache('user-uuid'::uuid);
```

### Refresh entire cache (run periodically):
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY user_compatibility_cache;
```

## Performance Optimization

### Option 1: Use the function directly (current implementation)
- Good for: Small to medium user bases (<10k users)
- Real-time accuracy
- No cache maintenance needed

### Option 2: Use materialized view (for scale)
- Good for: Large user bases (>10k users)
- Faster match checking
- Requires periodic refresh

To switch to materialized view approach, modify the match checking query to:
```sql
SELECT is_compatible 
FROM user_compatibility_cache
WHERE (user1_id = $1 AND user2_id = $2)
   OR (user1_id = $2 AND user2_id = $1);
```

## Match Settings Schema

The `match_settings` JSONB field should have this structure:

```json
{
  "minAge": 21,        // Minimum age preference (18-99)
  "maxAge": 35,        // Maximum age preference (18-99)
  "gender": "both",    // "male", "female", or "both"
  "distance": 50       // Maximum distance in kilometers (1-100)
}
```

## Location Data

The `location` column uses PostGIS `geography` type:
- Format: `SRID=4326;POINT(longitude latitude)`
- Example: `SRID=4326;POINT(-122.4194 37.7749)` for San Francisco
- ST_Distance returns meters, divided by 1000 for kilometers

## Notes

- The age range is defined by minAge and maxAge fields
- Users are compatible if their age falls within each other's preferred range
- Distance is calculated using PostGIS ST_Distance on geography points
- Gender matching supports: "male", "female", "both", or NULL (any)
- All checks must pass for users to be compatible
