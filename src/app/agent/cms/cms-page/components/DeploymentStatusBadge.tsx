'use client';

export interface DeploymentStatusBadgeProps {
  slug: string;
  isDraft?: boolean;
  className?: string;
}

export default function DeploymentStatusBadge({
  slug,
  isDraft = false,
  className = '',
}: DeploymentStatusBadgeProps) {
  // Publishing is a single database write, so there is no "deploying" state
  // (until 2026-10-29 a publish waited on a Vercel rebuild).
  // Show draft badge
  if (isDraft) {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}>
        Draft
      </span>
    );
  }

  // Show published badge
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ${className}`}>
      Published
    </span>
  );
}
