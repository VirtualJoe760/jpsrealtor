'use client';

import { useDeploymentStatus } from '../hooks/useDeploymentStatus';
import DeploymentTimer from './DeploymentTimer';

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
  const { isDeploying, getDeployment } = useDeploymentStatus();
  const deployment = getDeployment(slug);

  // Show deployment status if actively deploying
  if (isDeploying(slug) && deployment) {
    return (
      <div className={`${className}`}>
        <DeploymentTimer expiresAt={deployment.expiresAt} />
      </div>
    );
  }

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
