export const FREEZE_LAYOUT_ATTRIBUTE = "data-snapshot-freeze-layout";

export const FREEZE_DYNAMIC_LAYOUT_CSS = `
.e-con:has(.swiper),
.e-con-inner:has(.swiper),
.elementor-widget-container:has(.swiper),
.elementor-element:has(.swiper),
.swiper,
.swiper-container,
.elementor-main-swiper,
.e-n-carousel,
.slick-slider,
.slick-list,
.owl-carousel,
.owl-stage-outer,
.splide,
.splide__track,
.flickity-viewport,
.elementor-widget-n-carousel,
.elementor-widget-image-carousel,
.elementor-widget-slides {
  overflow: visible !important;
  height: auto !important;
  max-height: none !important;
}
.swiper-wrapper,
.slick-track,
.owl-stage,
.splide__list,
.flickity-slider {
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 1rem !important;
  transform: none !important;
  width: auto !important;
  height: auto !important;
  min-height: 0 !important;
  margin: 0 !important;
  inset: auto !important;
  left: 0 !important;
  transition: none !important;
}
.swiper-slide,
.slick-slide,
.owl-item,
.splide__slide,
.flickity-cell,
.carousel-item {
  display: block !important;
  position: relative !important;
  left: auto !important;
  right: auto !important;
  top: auto !important;
  transform: none !important;
  opacity: 1 !important;
  visibility: visible !important;
  width: auto !important;
  min-width: min(100%, 16rem) !important;
  max-width: 100% !important;
  height: auto !important;
  flex: 1 1 16rem !important;
  float: none !important;
}
.swiper-slide-duplicate,
.slick-cloned {
  display: none !important;
}
.swiper-button-next,
.swiper-button-prev,
.swiper-pagination,
.slick-arrow,
.slick-dots,
.owl-nav,
.owl-dots,
.splide__arrows,
.splide__pagination,
.carousel-control-prev,
.carousel-control-next,
.carousel-indicators {
  display: none !important;
}
.elementor-invisible {
  visibility: visible !important;
  opacity: 1 !important;
  transform: none !important;
}
`.trim();

export function injectFreezeLayoutIntoHtml(html: string): string {
  if (html.includes(FREEZE_LAYOUT_ATTRIBUTE)) {
    return html;
  }

  const tag = `<style ${FREEZE_LAYOUT_ATTRIBUTE}="true">${FREEZE_DYNAMIC_LAYOUT_CSS}</style>`;
  const head = html.match(/<head[^>]*>/i);
  if (head?.index === undefined) {
    return `${tag}${html}`;
  }

  const insertAt = head.index + head[0].length;
  return `${html.slice(0, insertAt)}${tag}${html.slice(insertAt)}`;
}
