/**
 * Motion animation variants for chat interface
 * Inspired by portfolio 3D effects and seamless transitions
 */

export const crossDissolve = (duration: number = 0.6) => {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration,
      ease: "easeInOut",
    },
  };
};

export const fadeSlideIn = (
  direction: "left" | "right" | "up" | "down" = "up",
  delay: number = 0,
  duration: number = 0.5
) => {
  const distance = direction === "up" || direction === "down" ? 50 : 100;
  return {
    initial: {
      x: direction === "left" ? -distance : direction === "right" ? distance : 0,
      y: direction === "up" ? distance : direction === "down" ? -distance : 0,
      opacity: 0,
    },
    animate: {
      x: 0,
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
        delay,
        duration,
      },
    },
  };
};

export const textVariant = (delay: number = 0) => {
  return {
    hidden: {
      y: -50,
      opacity: 0,
    },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        duration: 1.25,
        delay,
      },
    },
  };
};

export const zoomIn = (delay: number = 0, duration: number = 0.5) => {
  return {
    hidden: {
      scale: 0,
      opacity: 0,
    },
    show: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "tween",
        delay,
        duration,
        ease: "easeOut",
      },
    },
  };
};

export const scaleIn = (delay: number = 0, duration: number = 0.4) => {
  return {
    initial: {
      scale: 0.9,
      opacity: 0,
    },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20,
        delay,
        duration,
      },
    },
  };
};

export const slidePanel = (
  direction: "left" | "right" = "left",
  duration: number = 0.3
) => {
  return {
    initial: {
      x: direction === "left" ? "-100%" : "100%",
    },
    animate: {
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration,
      },
    },
    exit: {
      x: direction === "left" ? "-100%" : "100%",
      transition: {
        duration: duration * 0.8,
        ease: "easeInOut",
      },
    },
  };
};

export const staggerChildren = (
  staggerDelay: number = 0.1,
  delayChildren: number = 0
) => {
  return {
    animate: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };
};

export const blurFade = (duration: number = 0.5, delay: number = 0) => {
  return {
    initial: {
      opacity: 0,
      filter: "blur(10px)",
    },
    animate: {
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        duration,
        delay,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      filter: "blur(10px)",
      transition: {
        duration: duration * 0.6,
        ease: "easeIn",
      },
    },
  };
};

export const expandCollapse = (duration: number = 0.3) => {
  return {
    collapsed: {
      width: 0,
      opacity: 0,
      transition: {
        duration,
        ease: "easeInOut",
      },
    },
    expanded: {
      width: "auto",
      opacity: 1,
      transition: {
        duration,
        ease: "easeInOut",
      },
    },
  };
};
