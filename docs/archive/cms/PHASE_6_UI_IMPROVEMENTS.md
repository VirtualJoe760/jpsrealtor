# Phase 6: CMS UI Improvements - Implementation Plan

## Overview
Replace browser alerts with modals, add deployment timers, and improve UX with redirects.

---

## Audit Results

### Browser Alerts Found (28 total)

**`src/app/agent/cms/new/page.tsx` (13 alerts)**
- Line 91: "Please enter a topic for article generation"
- Line 151: "Failed to generate article with Groq"
- Line 191: "Failed to upload image"
- Line 217: "Article saved to database!" / "Article saved as draft!"
- Line 225: "Failed to save article"
- Line 234: "Please generate an article first to get a slug ID"
- Line 239: "Please ensure you have a title, content, and featured image before publishing"
- Line 266: Success message with URL + warnings
- Line 269: "Failed to publish" with errors
- Line 273: "Network error while publishing article"

**`src/app/agent/cms/edit/[slugId]/page.tsx` (8 alerts)**
- Line 172: "Failed to upload image"
- Line 181: "No slug ID available for republishing"
- Line 186: "Please ensure you have a title, content, and featured image before publishing"
- Line 214: Success message with URL + warnings
- Line 217: "Failed to update" with errors
- Line 221: "Network error while updating article"
- Line 251: "Article saved to database successfully!"
- Line 254: "Failed to save to database"

**`src/app/agent/cms/cms-page/hooks/useArticleActions.ts` (4 alerts)**
- Line 36: "Article deleted successfully"
- Line 40: "Failed to delete article"
- Line 61: "Article unpublished successfully"
- Line 65: "Failed to unpublish article"

### Confirm Dialogs Found (4 total)

**`src/app/agent/cms/cms-page/hooks/useArticleActions.ts` (2 confirms)**
- Line 23: Delete confirmation
- Line 48: Unpublish confirmation

**`src/app/agent/cms/page.old.tsx` (2 confirms)**
- Line 141: Permanent delete warning
- Line 163: Draft mode confirmation

---

## Implementation Plan

### **6.1: Create Modal Component** (30 min)

**File:** `src/app/agent/cms/cms-page/components/CMSModal.tsx`

**Features:**
- Success variant (green)
- Error variant (red)
- Confirm variant (yellow/blue)
- Loading variant (spinner)
- Auto-close timer option
- Escape key to close
- Click outside to close
- TypeScript types

**Props:**
```typescript
interface CMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'success' | 'error' | 'confirm' | 'loading';
  title: string;
  message: string;
  details?: string;  // For warnings, errors
  confirmText?: string;  // "Delete", "Publish", etc.
  cancelText?: string;  // "Cancel"
  onConfirm?: () => void;
  autoCloseMs?: number;  // Auto-close after X ms
  showTimer?: boolean;  // Show countdown
}
```

---

### **6.2: Create Deployment Status Components** (30 min)

**File:** `src/app/agent/cms/cms-page/components/DeploymentTimer.tsx`

**Features:**
- Countdown from 3 minutes (180 seconds)
- Format: "2:30 remaining"
- Visual progress bar
- Auto-hide when complete

**Props:**
```typescript
interface DeploymentTimerProps {
  startTime: Date;
  durationMs: number;  // 180000 for 3 min
  onComplete?: () => void;
  articleSlug: string;
}
```

**File:** `src/app/agent/cms/cms-page/components/DeploymentStatusBadge.tsx`

**Features:**
- "Deploying..." (orange, pulsing)
- "Published" (green)
- "Draft" (gray)
- Shows timer when deploying

---

### **6.3: Create Deployment Hook** (20 min)

**File:** `src/app/agent/cms/cms-page/hooks/useDeploymentStatus.ts`

**Features:**
- Track deployments in localStorage
- Auto-expire after 3 minutes
- Multiple deployments support
- TypeScript types

```typescript
interface Deployment {
  slug: string;
  startedAt: string;
  expiresAt: string;
  status: 'deploying' | 'completed';
}

function useDeploymentStatus() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);

  const startDeployment = (slug: string) => {
    // Add to localStorage with 3 min expiry
  };

  const isDeploying = (slug: string): boolean => {
    // Check if slug is currently deploying
  };

  const getTimeRemaining = (slug: string): number => {
    // Get seconds remaining
  };

  return { deployments, startDeployment, isDeploying, getTimeRemaining };
}
```

---

### **6.4: Update Publish Flow** (30 min)

**File:** `src/app/agent/cms/new/page.tsx`

**Changes:**
1. Import `CMSModal`, `useDeploymentStatus`, `useRouter`
2. Replace all `alert()` calls with modal state
3. On successful publish:
   - Start deployment timer
   - Show success modal with countdown
   - Redirect to `/agent/cms` after 3 seconds
4. Show modal instead of alerts for errors

**Pseudocode:**
```typescript
const [modal, setModal] = useState({ isOpen: false, ... });
const { startDeployment } = useDeploymentStatus();
const router = useRouter();

const handlePublish = async () => {
  try {
    const response = await fetch('/api/articles/publish', { ... });
    const data = await response.json();

    if (data.success) {
      // Start deployment tracking
      startDeployment(data.slugId);

      // Show success modal
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Article Published!',
        message: data.message,
        details: data.warnings?.join('\n'),
      });

      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/agent/cms');
      }, 3000);
    } else {
      // Show error modal
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Publish Failed',
        message: data.errors.join('\n'),
      });
    }
  } catch (error) {
    setModal({
      isOpen: true,
      type: 'error',
      title: 'Network Error',
      message: 'Failed to publish article',
    });
  }
};
```

---

### **6.5: Update Edit Page** (20 min)

**File:** `src/app/agent/cms/edit/[slugId]/page.tsx`

**Changes:**
- Same as publish flow
- Replace alerts with modals
- Redirect to `/agent/cms` after successful update
- Start deployment timer for production updates

---

### **6.6: Update Article Actions Hook** (20 min)

**File:** `src/app/agent/cms/cms-page/hooks/useArticleActions.ts`

**Changes:**
- Replace `confirm()` with modal callbacks
- Replace `alert()` success/error with callbacks
- Return modal state from hook

```typescript
function useArticleActions() {
  const [modal, setModal] = useState({ ... });

  const deleteArticle = async (slug: string) => {
    // Show confirm modal instead of confirm()
    return new Promise((resolve) => {
      setModal({
        isOpen: true,
        type: 'confirm',
        title: 'Delete Article?',
        message: 'This will permanently delete the article from GitHub',
        onConfirm: async () => {
          // Execute delete
          const response = await fetch(...);
          setModal({ isOpen: true, type: 'success', ... });
          resolve(response);
        },
      });
    });
  };

  return { deleteArticle, unpublishArticle, modal, setModal };
}
```

---

### **6.7: Update Article List Page** (20 min)

**File:** `src/app/agent/cms/page.tsx`

**Changes:**
- Add `<DeploymentStatusBadge>` to each article card
- Import `useDeploymentStatus` hook
- Show deployment timer for articles being deployed

```typescript
const { isDeploying, getTimeRemaining } = useDeploymentStatus();

{articles.map((article) => (
  <div key={article.slug}>
    <h3>{article.title}</h3>
    <DeploymentStatusBadge
      slug={article.slug}
      isDeploying={isDeploying(article.slug)}
      timeRemaining={getTimeRemaining(article.slug)}
      isDraft={article.draft}
    />
  </div>
))}
```

---

### **6.8: Modal Integration** (30 min)

**Update all pages to use modal:**
1. `new/page.tsx` - Add modal state and component
2. `edit/[slugId]/page.tsx` - Add modal state and component
3. `page.tsx` - Import modal from useArticleActions

---

## Files to Create (New)

1. ✅ `src/app/agent/cms/cms-page/components/CMSModal.tsx`
2. ✅ `src/app/agent/cms/cms-page/components/DeploymentTimer.tsx`
3. ✅ `src/app/agent/cms/cms-page/components/DeploymentStatusBadge.tsx`
4. ✅ `src/app/agent/cms/cms-page/hooks/useDeploymentStatus.ts`

## Files to Modify (Existing)

1. ✅ `src/app/agent/cms/new/page.tsx` - Replace 13 alerts
2. ✅ `src/app/agent/cms/edit/[slugId]/page.tsx` - Replace 8 alerts
3. ✅ `src/app/agent/cms/cms-page/hooks/useArticleActions.ts` - Replace 4 alerts + 2 confirms
4. ✅ `src/app/agent/cms/page.tsx` - Add deployment status badges

---

## Testing Checklist

- [ ] Publish new article → shows modal → redirects to /cms → shows "Deploying..." badge
- [ ] Update existing article → shows modal → redirects to /cms
- [ ] Delete article → shows confirm modal → executes on confirm → shows success modal
- [ ] Unpublish article → shows confirm modal → shows deployment timer
- [ ] All browser alerts replaced with modals
- [ ] All confirm dialogs replaced with modal confirms
- [ ] Deployment timer counts down correctly (3 min)
- [ ] Deployment status persists across page refreshes (localStorage)
- [ ] Timer auto-expires after 3 minutes
- [ ] Escape key closes modals
- [ ] Click outside closes modals

---

## Estimated Time

- Component creation: 1 hour
- Page updates: 1 hour
- Testing & polish: 30 minutes
- **Total: 2.5 hours**

---

## Next Steps

1. Create modal component
2. Create deployment components
3. Update publish/edit pages
4. Update article actions hook
5. Update article list page
6. Test complete flow
7. Deploy to production
