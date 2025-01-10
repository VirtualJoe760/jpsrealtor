import { BuildingOffice2Icon, EnvelopeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function ContactInfo() {
  return (
    <div className="relative px-6 pb-12 pt-12 lg:static">
      <div className="mx-auto max-w-xl lg:mx-0 lg:max-w-lg">
        <h2 className="text-pretty text-4xl font-semibold tracking-tight sm:text-5xl">
          Let&apos;s Connect
        </h2>
        <p className="mt-6 text-lg/8 text-gray-200">
          Reach out to today to discuss your property needs. Whether you&apos;re looking to buy, sell, or simply get advice, I&apos;m here to help. You can also share photos of your property with me! I also offer a live chat that goes directly to my cell on the website you can access by clicking the message button on the right hand side of your screen.
        </p>
        <dl className="mt-10 space-y-4 text-base/7 text-gray-200">
          <div className="flex gap-x-4">
            <dt>
              <BuildingOffice2Icon className="h-7 w-6 text-gray-500" aria-hidden="true" />
            </dt>
            <dd>
              36923 Cook St B101
              <br />
              Palm Desert, CA 92211
            </dd>
          </div>
          <div className="flex gap-x-4">
            <dt>
              <PhoneIcon className="h-7 w-6 text-gray-500" aria-hidden="true" />
            </dt>
            <dd>
              <Link href="tel:+1-760-833-6334" className="hover:text-gray-300">
                +1 (760) 833-6334
              </Link>
            </dd>
          </div>
          <div className="flex gap-x-4">
            <dt>
              <EnvelopeIcon className="h-7 w-6 text-gray-500" aria-hidden="true" />
            </dt>
            <dd>
              <Link href="mailto:josephsardella@gmail.com" className="hover:text-gray-300">
                josephsardella@gmail.com
              </Link>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
