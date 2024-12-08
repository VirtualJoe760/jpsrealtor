import { Disclosure } from "@headlessui/react";

const navigation = [
  { name: "About", href: "#about", current: true },
  { name: "Buying", href: "#buying", current: false },
  { name: "Selling", href: "#selling", current: false },
  { name: "Coachella Valley", href: "#coachella-valley", current: false },
  { name: "Login", href: "#login", current: false },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function MobileMenu() {
  return (
    <Disclosure.Panel className="sm:hidden">
      <div className="space-y-1 px-2 pb-3 pt-2">
        {navigation.map((item) => (
          <Disclosure.Button
            key={item.name}
            as="a"
            href={item.href}
            aria-current={item.current ? "page" : undefined}
            className={classNames(
              item.current
                ? "bg-neutral-light text-neutral-dark"
                : "text-neutral-light hover:bg-neutral-light/10 hover:text-neutral-dark",
              "block rounded-md px-3 py-2 text-base font-medium"
            )}
          >
            {item.name}
          </Disclosure.Button>
        ))}
      </div>
    </Disclosure.Panel>
  );
}
