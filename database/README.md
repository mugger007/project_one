# Database Functions

This directory contains SQL functions and optimizations for the matching system.

## Setup Instructions

Run these SQL files in your Supabase SQL Editor in order:

### 1. Match Compatibility System (`match_compatibility.sql`)

Creates the compatibility checking system with the following components:

**Function: `check_user_compatibility(user1_id, user2_id)`**
- Checks if two users are compatible based on their match_settings
- Validates: age preference (±5 years), gender preference, distance (km)
- Returns: BOOLEAN

**Materialized View: `user_compatibility_cache`**
- Pre-computed compatibility matrix for all user pairs
- Refresh when match_settings change
- Significantly improves match checking performance

**Function: `refresh_user_compatibility_cache(target_user_id)`**
- Updates compatibility cache for a specific user
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
  "minAge": 21,        // Minimum age preference
  "maxAge": 35,        // Maximum age preference
  "gender": "both",    // "male", "female", "both", or "any"
  "distance": 50       // Maximum distance in kilometers
}
```

## Notes

- The age range is defined by minAge and maxAge fields
- Users are compatible if their age falls within each other's preferred range
- Distance is calculated using PostGIS ST_Distance on geography points
- Gender matching supports: "male", "female", "both", or NULL (any)
- All checks must pass for users to be compatible
