# SkillBridge Session Flow - Visual Guide

## 🎯 Complete Session Journey

```mermaid
flowchart TD
    A[Learner Books Session] --> B{Credits Available?}
    B -->|No| C[Show Error: Insufficient Credits]
    B -->|Yes| D[Deduct Credits to Escrow]
    D --> E[Create Session Record: status='pending']
    E --> F[Send Notification to Mentor]
    
    F --> G{Mentor Response?}
    G -->|Accept| H[Status: 'confirmed']
    G -->|Reject| I[Status: 'rejected']
    G -->|No Response in 48h| J[Status: 'mentor_no_response']
    
    I --> K[Refund Credits to Learner]
    J --> K
    K --> END1[Session Ended - Refunded]
    
    H --> L[30 Min Before Start Time]
    L --> M[Status: 'upcoming' + Join Window Opens]
    
    M --> N[Session Start Time + 15 Min Grace Period]
    N --> O{Who Joined?}
    
    O -->|Both| P[Status: 'ongoing']
    O -->|Only Learner| Q[Status: 'mentor_no_show']
    O -->|Only Mentor| R[Status: 'learner_no_show'] 
    O -->|Neither| S[Status: 'both_no_show']
    
    Q --> T[100% Refund to Learner]
    R --> U[100% Payment to Mentor]
    S --> V[100% Refund to Learner]
    T --> END2[Session Ended - No Show]
    U --> END2
    V --> END2
    
    P --> W[Video Session Active]
    W --> X{Session End Trigger?}
    
    X -->|Normal Completion| Y[Status: 'completed']
    X -->|Technical Issues| Z[Status: 'technical_issues']
    X -->|Participant Reports Problem| AA[Handle Technical Issues]
    
    AA --> BB{Resolution?}
    BB -->|Resolve & Continue| W
    BB -->|End with Refund| Z
    
    Y --> CC[80% to Mentor + 20% Platform Fee]
    Z --> DD[100% Refund to Learner]
    
    CC --> END3[Session Completed Successfully]
    DD --> END4[Session Ended - Technical Issues]
```

## 🔄 Session States in Detail

```mermaid
stateDiagram-v2
    [*] --> pending: Learner books session
    
    pending --> confirmed: Mentor accepts
    pending --> rejected: Mentor rejects
    pending --> mentor_no_response: 24 timeout
    
    confirmed --> upcoming: 30 min before start
    confirmed --> cancelled: Early cancellation (>24h)
    
    upcoming --> ongoing: First participant joins
    upcoming --> cancelled: Last minute cancellation
    upcoming --> learner_no_show: Only mentor joins (15min grace)
    upcoming --> mentor_no_show: Only learner joins (15min grace) 
    upcoming --> both_no_show: No one joins (15min grace)
    
    ongoing --> completed: Normal session end
    ongoing --> technical_issues: Technical problems
    ongoing --> cancelled: Emergency cancellation
    
    rejected --> [*]: Refund processed
    mentor_no_response --> [*]: Refund processed
    cancelled --> [*]: Refund/penalty processed
    learner_no_show --> [*]: Mentor paid
    mentor_no_show --> [*]: Learner refunded
    both_no_show --> [*]: Learner refunded
    completed --> [*]: Mentor paid (80%)
    technical_issues --> [*]: Learner refunded
```

## 💰 Financial Flow

```mermaid
flowchart LR
    A[Learner Credits] --> B[Escrow Account]
    B --> C{Session Outcome}
    
    C -->|Completed| D[80% to Mentor]
    C -->|Completed| E[20% Platform Fee]
    C -->|Learner No-Show| F[100% to Mentor]
    C -->|Mentor No-Show| G[100% Refund to Learner]
    C -->|Technical Issues| G
    C -->|Both No-Show| G
    C -->|Cancelled Early| G
    
    D --> H[Mentor Balance]
    E --> I[Platform Revenue]
    F --> H
    G --> J[Learner Balance]
```

## 🎥 Video Call Access Control

```mermaid
flowchart TD
    A[User Tries to Join Session] --> B{Valid Session ID?}
    B -->|No| C[Error: Session Not Found]
    
    B -->|Yes| D{User is Learner or Mentor?}
    D -->|No| E[Error: Access Denied]
    
    D -->|Yes| F{Session Status Valid?}
    F -->|No| G[Error: Session Not Available]
    
    F -->|Yes| H{Within Join Window?}
    H -->|No| I[Error: Outside Join Window]
    
    H -->|Yes| J{Already Connected?}
    J -->|Yes| K[Show Existing Connection]
    
    J -->|No| L[Generate Agora Token]
    L --> M[Record Join Time]
    M --> N[Join Video Channel]
    N --> O[Update Session Status if First Join]
```

## 🔧 Edge Cases Handling

```mermaid
mindmap
    root((Edge Cases))
        Technical Issues
            Network Problems
                Auto-reconnect
                Graceful degradation
            Browser Crashes
                Session recovery
                Data persistence
            Device Failures
                Audio-only fallback
                Device switching
        
        Timing Issues
            Late Joins
                Grace period rules
                Pro-rated billing
            Session Overruns
                Automatic extension
                Forced termination
            Early Departures
                Minimum session rules
                Partial refunds
        
        User Behavior
            No Shows
                15min detection
                Automatic status change
            Multiple Connections
                Duplicate prevention
                Session takeover
            Spam Bookings
                Rate limiting
                User restrictions
        
        System Failures
            Server Downtime
                Offline queuing
                State recovery
            Database Issues
                Transaction rollback
                Data consistency
            Payment Problems
                Retry mechanisms
                Manual intervention
```

## 🚨 Monitoring Dashboard Metrics

```mermaid
graph TB
    A[Session Health Dashboard] --> B[Session Completion Rate]
    A --> C[No-Show Frequency]
    A --> D[Technical Issues Rate]
    A --> E[Financial Processing Status]
    
    B --> B1[Target: >85%]
    B --> B2[Alert if <75%]
    
    C --> C1[Target: <10%]
    C --> C2[Alert if >15%]
    
    D --> D1[Target: <5%]
    D --> D2[Alert if >10%]
    
    E --> E1[Escrow Balance Healthy]
    E --> E2[Payout Processing On Time]
    E --> E3[Refund Success Rate >99%]
```

---

## 📱 User Experience Flow

### For Learners:

```
1. Browse mentors → 2. Select time slot → 3. Add session notes → 
4. Pay with credits → 5. Wait for mentor confirmation → 
6. Receive notification → 7. Join session 30min early → 
8. Complete session → 9. Rate mentor → 10. Download files attached in the video session
```

### For Mentors:

```
1. Receive booking notification → 2. Review learner profile & notes → 
3. Accept or decline → 4. Prepare for session → 
5. Join when learner arrives → 6. Conduct mentoring → 
7. End session → 8. Receive credits 
```

---

This visual guide complements the comprehensive documentation and makes it easy to understand the complete session management flow, from booking to completion, including all the important edge cases and business rules.