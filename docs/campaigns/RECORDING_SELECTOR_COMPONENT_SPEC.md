# Recording Selector Component - Technical Specification

## Component Overview

**Component Name:** `PipelineAudioSimpleStep` / `RecordingSelector`

**Purpose:** Allow users to select from existing Drop Cowboy recordings for voicemail campaigns

**Location:** `src/app/campaigns/[id]/components/PipelineAudioSimpleStep.tsx`

**Parent:** `CampaignPipeline.tsx` (Simple Mode)

---

## Component Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────┐
│  User triggers Audio step in Simple Mode                │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Component mounts → useEffect → fetchRecordings()       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  GET /api/campaigns/[id]/recordings/list                │
│  (Fetches Drop Cowboy recordings)                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Display recordings as selectable cards                 │
│  - Radio buttons or clickable cards                     │
│  - Show: name, duration, date_added                     │
│  - Optional: Play preview button                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  User selects one recording → State updated             │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  User clicks "Continue" → Validation                    │
│  - Check if recording selected                          │
│  - Show error if not                                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  Pass selected recording_id to next step                │
│  - Store in campaign state or context                   │
│  - Proceed to Send step                                 │
└─────────────────────────────────────────────────────────┘
```

---

## Component Interface

### Props

```typescript
interface PipelineAudioSimpleStepProps {
  campaign: ICampaign;
  onComplete: (data: { recording_id: string; recording_name: string }) => void;
  onBack: () => void;
  initialRecordingId?: string;  // For edit mode
}
```

### State

```typescript
interface ComponentState {
  recordings: DropCowboyRecording[];
  selectedRecordingId: string | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
}

interface DropCowboyRecording {
  media_id: string;       // Drop Cowboy's recording_id
  name: string;           // Recording name
  duration: number;       // Duration in seconds
  date_added: string;     // ISO date string
  file_size_kb?: number;  // File size (if available)
  preview_url?: string;   // Preview URL (if available)
}
```

---

## API Integration

### Endpoint: GET /api/campaigns/[id]/recordings/list

**Request:**
```typescript
GET /api/campaigns/[id]/recordings/list
Authorization: Bearer {session_token}
```

**Response (Success):**
```json
{
  "success": true,
  "recordings": [
    {
      "media_id": "d5203d23-a8ff-4354-8319-0900a11be6ad",
      "name": "New Listing Announcement",
      "duration": 45,
      "date_added": "2026-01-05T12:00:00Z",
      "file_size_kb": 512,
      "preview_url": null
    },
    {
      "media_id": "d59abf46-efb1-461a-8689-61c92d6ad4b9",
      "name": "Expired Listing Follow-up",
      "duration": 38,
      "date_added": "2026-01-03T15:30:00Z",
      "file_size_kb": 432,
      "preview_url": null
    }
  ]
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Failed to fetch recordings from Drop Cowboy",
  "details": "API connection timeout"
}
```

**Response (Empty):**
```json
{
  "success": true,
  "recordings": []
}
```

---

## Component Implementation

### Full Component Code

```typescript
'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ICampaign } from '@/models/Campaign';

interface DropCowboyRecording {
  media_id: string;
  name: string;
  duration: number;
  date_added: string;
  file_size_kb?: number;
  preview_url?: string;
}

interface PipelineAudioSimpleStepProps {
  campaign: ICampaign;
  onComplete: (data: { recording_id: string; recording_name: string }) => void;
  onBack: () => void;
  initialRecordingId?: string;
}

export default function PipelineAudioSimpleStep({
  campaign,
  onComplete,
  onBack,
  initialRecordingId,
}: PipelineAudioSimpleStepProps) {
  const [recordings, setRecordings] = useState<DropCowboyRecording[]>([]);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string>(
    initialRecordingId || ''
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch recordings on mount
  useEffect(() => {
    fetchRecordings();
  }, [campaign._id]);

  const fetchRecordings = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(
        `/api/campaigns/${campaign._id}/recordings/list`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch recordings');
      }

      setRecordings(data.recordings);

      // Auto-select if only one recording
      if (data.recordings.length === 1 && !selectedRecordingId) {
        setSelectedRecordingId(data.recordings[0].media_id);
      }
    } catch (err: any) {
      console.error('Error fetching recordings:', err);
      setError(err.message || 'Failed to load recordings');
      toast.error('Failed to load recordings. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchRecordings(true);
  };

  const handleContinue = () => {
    if (!selectedRecordingId) {
      toast.error('Please select a recording to continue');
      return;
    }

    const selectedRecording = recordings.find(
      (r) => r.media_id === selectedRecordingId
    );

    onComplete({
      recording_id: selectedRecordingId,
      recording_name: selectedRecording?.name || 'Unknown',
    });
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading recordings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h3 className="text-red-800 font-semibold mb-2">
            Failed to Load Recordings
          </h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchRecordings()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Select Audio Recording
          </h2>
          <p className="text-gray-600 mt-1">
            Choose a recording from your Drop Cowboy account
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800
                     disabled:text-gray-400 flex items-center gap-2"
        >
          <svg
            className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Empty State */}
      {recordings.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <svg
            className="w-16 h-16 mx-auto text-blue-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Recordings Found
          </h3>
          <p className="text-gray-600 mb-4">
            You need to upload recordings to your Drop Cowboy account first.
          </p>
          <a
            href="https://app.dropcowboy.com/media"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white
                       rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload to Drop Cowboy
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      )}

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div className="space-y-3">
          {recordings.map((recording) => (
            <RecordingCard
              key={recording.media_id}
              recording={recording}
              selected={selectedRecordingId === recording.media_id}
              onSelect={() => setSelectedRecordingId(recording.media_id)}
              formatDuration={formatDuration}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Help Text */}
      {recordings.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-700 mb-1">Need to add a new recording?</p>
              <p>
                Upload it to{' '}
                <a
                  href="https://app.dropcowboy.com/media"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Drop Cowboy
                </a>
                , then click the Refresh button above.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-6 border-t">
        <button
          onClick={onBack}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300
                     rounded-lg hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedRecordingId}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                     disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// Separate Recording Card Component
interface RecordingCardProps {
  recording: DropCowboyRecording;
  selected: boolean;
  onSelect: () => void;
  formatDuration: (seconds: number) => string;
  formatDate: (dateString: string) => string;
}

function RecordingCard({
  recording,
  selected,
  onSelect,
  formatDuration,
  formatDate,
}: RecordingCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        border-2 rounded-lg p-4 cursor-pointer transition-all
        ${
          selected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Radio Button */}
        <div className="flex-shrink-0 mt-1">
          <div
            className={`
              w-5 h-5 rounded-full border-2 flex items-center justify-center
              ${selected ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}
            `}
          >
            {selected && (
              <div className="w-2 h-2 bg-white rounded-full"></div>
            )}
          </div>
        </div>

        {/* Recording Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {recording.name}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {formatDuration(recording.duration)}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Added {formatDate(recording.date_added)}
            </span>
            {recording.file_size_kb && (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                {recording.file_size_kb} KB
              </span>
            )}
          </div>
        </div>

        {/* Selected Badge */}
        {selected && (
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
              ✓ Selected
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Error Handling

### Error Scenarios

1. **API Fetch Failure**
   - Network timeout
   - Drop Cowboy API down
   - Authentication failure
   - **Handling:** Show error message with "Try Again" button

2. **Empty Recordings List**
   - User hasn't uploaded any recordings to Drop Cowboy
   - **Handling:** Show empty state with link to Drop Cowboy upload page

3. **No Selection on Continue**
   - User clicks Continue without selecting a recording
   - **Handling:** Toast error: "Please select a recording to continue"

4. **Session Timeout**
   - User's session expires during fetch
   - **Handling:** Redirect to login with return URL

---

## Accessibility

### ARIA Labels

```typescript
<div
  role="radiogroup"
  aria-labelledby="recording-selector-heading"
>
  <h2 id="recording-selector-heading">Select Audio Recording</h2>
  {recordings.map(recording => (
    <div
      key={recording.media_id}
      role="radio"
      aria-checked={selected}
      aria-labelledby={`recording-${recording.media_id}-name`}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <span id={`recording-${recording.media_id}-name`}>
        {recording.name}
      </span>
    </div>
  ))}
</div>
```

### Keyboard Navigation

- **Tab:** Focus next/previous recording
- **Enter/Space:** Select focused recording
- **Arrow Up/Down:** Navigate recordings (optional enhancement)

---

## Testing Checklist

### Unit Tests

- [ ] Renders loading state correctly
- [ ] Fetches recordings on mount
- [ ] Handles API error gracefully
- [ ] Displays empty state when no recordings
- [ ] Allows selecting a recording
- [ ] Validates selection before continue
- [ ] Auto-selects if only one recording
- [ ] Refresh button refetches recordings

### Integration Tests

- [ ] API endpoint returns recordings
- [ ] Selected recording_id passed to next step
- [ ] Back button returns to previous step
- [ ] External link to Drop Cowboy opens correctly

### E2E Tests

- [ ] Complete flow: load → select → continue
- [ ] Error recovery: fail → retry → success
- [ ] Empty state → upload → refresh → select

---

## Performance Considerations

1. **Caching:**
   - Cache recordings list for 5 minutes
   - Use SWR or React Query for automatic refetch

2. **Lazy Loading:**
   - If >20 recordings, implement pagination or virtual scrolling

3. **Debounced Refresh:**
   - Prevent rapid refresh button clicks

---

## Future Enhancements

1. **Audio Preview:**
   - If Drop Cowboy provides preview_url, add play button
   - Inline audio player component

2. **Search/Filter:**
   - Search recordings by name
   - Filter by date range
   - Sort by name, duration, or date

3. **Recording Management:**
   - Rename recordings (if API supports)
   - Delete recordings (if API supports)
   - Upload new recordings directly from app

4. **Recording Details:**
   - Show waveform visualization
   - Display transcript (if available)
   - Show usage count (how many campaigns used it)

---

## Related Files

**Component:**
- `src/app/campaigns/[id]/components/PipelineAudioSimpleStep.tsx` (NEW)

**API Route:**
- `src/app/api/campaigns/[id]/recordings/list/route.ts` (NEW)

**Parent Component:**
- `src/app/campaigns/[id]/components/CampaignPipeline.tsx` (MODIFY)

**Models:**
- `src/models/Campaign.ts` (MODIFY - add selectedRecordingId field)

---

## Success Criteria

1. ✅ User can view all Drop Cowboy recordings
2. ✅ User can select one recording
3. ✅ Selected recording_id passed to send route
4. ✅ Empty state with helpful instructions
5. ✅ Error handling with retry capability
6. ✅ Refresh button to reload recordings
7. ✅ Responsive design (mobile + desktop)
8. ✅ Accessible (keyboard navigation, screen readers)

---

**Document Version:** 1.0
**Created:** 2026-01-07
**Author:** AI Development Team
**Status:** Ready for Implementation
