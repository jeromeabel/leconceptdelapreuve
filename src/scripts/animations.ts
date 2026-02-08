export function initFadeInImages() {
  const images = document.querySelectorAll<HTMLImageElement>("[data-fade-in]");
  requestAnimationFrame(() => {
    images.forEach((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        img.style.opacity = "1";
      } else {
        const handleLoad = () => {
          img.classList.add("animate-fade-in");
          img.style.opacity = "1";
          img.removeEventListener("load", handleLoad);
        };
        img.addEventListener("load", handleLoad, { once: true, passive: true });
      }
    });
  });
}