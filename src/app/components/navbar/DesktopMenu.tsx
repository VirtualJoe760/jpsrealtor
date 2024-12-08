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
  
  export default function DesktopMenu() {
    return (
      <div className="hidden sm:ml-6 sm:block">
        <div className="flex space-x-4">
          {navigation.map((item) => (
            <a
              key={item.name}
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={classNames(
                item.current
                  ? "bg-neutral-light text-neutral-dark"
                  : "text-neutral-light hover:bg-neutral-light/10 hover:text-neutral-dark",
                "rounded-md px-3 py-2 text-sm font-medium"
              )}
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>
    );
  }
  