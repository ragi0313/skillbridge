# One Review Per Session System

## Overview

Implemented a comprehensive review system that ensures learners can only review a mentor once per session, with sessions completing regardless of review status, and review options available in sessions management for later submission.

## Key Requirements Implemented

### 1. ✅ **Sessions Complete Without Review**
- Sessions mark as "completed" even if learner skips review in video call
- No blocking on review submission for session completion
- Review becomes optional during video call

### 2. ✅ **One Review Per Session Limitation** 
- Learners can only submit one review per session
- Duplicate prevention at API level and UI level
- Clear status indicators for already-reviewed sessions

### 3. ✅ **Sessions Management Review Option**
- Review button appears only for completed sessions without existing reviews
- "Leave Review" button replaces with "Review submitted" status after submission
- Real-time review status checking

## Implementation Details

### **Video Call Changes** (`components/video/VideoCall.tsx`)

**Updated Rating Modal Flow:**
- **"Skip for Now"** button instead of just "Skip"
- **Session completes immediately** when user skips review
- **Clean connection cleanup** after session completion
- **Review can be submitted later** in sessions management

```typescript
// Session completes without review - user can review later in sessions management
completeSession('completed').then(() => {
  // Clean up connection after session completion
  // ... cleanup logic
})
```

### **Sessions Management Integration** (`components/learner/SessionCard.tsx`)

#### **New State Management:**
```typescript
const [hasReviewed, setHasReviewed] = useState(false)
const [checkingReviewStatus, setCheckingReviewStatus] = useState(false)
```

#### **Review Status Checking:**
```typescript
useEffect(() => {
  if (session.status === "completed" && !hasReviewed) {
    fetch(`/api/sessions/${session.id}/review-status`)
      .then(data => {
        if (data.hasReviewed) {
          setHasReviewed(true)
        }
      })
  }
}, [session.id, session.status])
```

#### **Conditional Review Display:**
- **Show review button**: Only for completed sessions without existing reviews
- **Show "Review submitted"**: For sessions that already have reviews
- **Show loading**: While checking review status

```tsx
{session.status === "completed" && !hasReviewed && !checkingReviewStatus && (
  <ReviewDialog {...props} />
)}

{session.status === "completed" && hasReviewed && (
  <div className="flex items-center gap-2">
    <CheckCircle className="h-4 w-4 text-green-500" />
    <span className="text-sm text-green-700">Review submitted</span>
  </div>
)}
```

### **Enhanced Review Dialog**

**Updated UI/UX:**
- **Title**: "Rate Your Mentor" (was "Rate Your Session")
- **Rating**: Required 1-5 stars with descriptive labels
- **Comments**: Optional with 1000 character limit
- **Button**: "Rate Mentor" (was "Submit Review")

**Features:**
- Star ratings with hover effects
- Real-time character count
- Rating descriptions (Poor/Fair/Good/Great/Excellent)
- Disabled state during submission

### **API Endpoints**

#### **New: Review Status Check** (`/api/sessions/[id]/review-status`)
```typescript
GET /api/sessions/123/review-status

Response:
{
  sessionId: 123,
  sessionStatus: "completed",
  canReview: false,
  hasReviewed: true,
  reviewData: {
    id: 456,
    rating: 5,
    reviewText: "Great mentor!",
    createdAt: "2024-01-15T10:30:00Z"
  },
  message: "Review already submitted for this session"
}
```

#### **Enhanced: Review Submission** (`/api/reviews`)
- ✅ **Duplicate prevention**: Checks existing reviews before insert
- ✅ **Optional review text**: Rating required, comments optional  
- ✅ **Proper error handling**: 409 status for duplicates

```typescript
// Duplicate prevention
if (existingReview) {
  return NextResponse.json(
    { error: "You have already reviewed this session" },
    { status: 409 }
  )
}
```

### **Database Schema** (No changes needed)
```sql
mentor_reviews (
  id SERIAL PRIMARY KEY,
  mentorId INTEGER REFERENCES mentors(id),
  learnerId INTEGER REFERENCES learners(id), 
  sessionId INTEGER REFERENCES booking_sessions(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  reviewText TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  -- Unique constraint ensures one review per learner per session
  UNIQUE(sessionId, learnerId)
)
```

## User Flow Examples

### **Scenario 1: Review During Video Call**
1. Learner ends video session → Rating modal appears
2. Learner submits 5-star rating + review → Session completes
3. In sessions management → Shows "Review submitted" ✅

### **Scenario 2: Skip Review During Video Call**
1. Learner ends video session → Rating modal appears
2. Learner clicks "Skip for Now" → Session completes immediately
3. In sessions management → Shows "Leave Review" button
4. Learner clicks button → Review dialog opens → Submits review
5. Button changes to "Review submitted" ✅

### **Scenario 3: Attempt Duplicate Review**
1. Learner already reviewed session
2. In sessions management → Shows "Review submitted" (no button)
3. If somehow API called → Returns 409 error: "Already reviewed"

## Error Handling

### **API Level Protection:**
- ✅ **Duplicate check**: Query existing reviews before insert
- ✅ **Access control**: Only learners can review their sessions
- ✅ **Status validation**: Only completed sessions can be reviewed
- ✅ **Input validation**: Rating 1-5, optional text

### **UI Level Protection:**
- ✅ **Real-time status**: Check review existence before showing button
- ✅ **Loading states**: Show spinner while checking status
- ✅ **Success feedback**: Update UI after successful submission
- ✅ **Error handling**: Show error messages for failures

## Benefits

1. **✅ No Session Blocking**: Sessions complete regardless of review status
2. **✅ Flexible Review Timing**: Review during call or later in management
3. **✅ One Review Guarantee**: Technical and UI enforcement of single review
4. **✅ Clear Status Indicators**: Users know if they've already reviewed
5. **✅ Enhanced UX**: Better modal design and descriptive UI
6. **✅ Data Integrity**: Proper duplicate prevention at database level

## Testing Scenarios

### **Test 1: Normal Review Flow**
- ✅ Complete session without review → Review button appears
- ✅ Submit review → Button becomes "Review submitted"
- ✅ Refresh page → Still shows "Review submitted"

### **Test 2: Duplicate Prevention**
- ✅ Try reviewing same session twice → API returns error
- ✅ UI shows "Review submitted" instead of button

### **Test 3: Session Completion**
- ✅ Skip review during video call → Session still completes
- ✅ Session marked as "completed" in database
- ✅ Credits transferred properly

This system ensures a robust, user-friendly review process that doesn't block session completion while maintaining data integrity and preventing duplicate reviews.