export const DYNAMIC_FIXTURE_BASE_URL = "https://example.com/dynamic-fixture";

export const DYNAMIC_FIXTURE_HTML = `<!DOCTYPE html>
<html lang="en" dir="ltr">
  <head>
    <title>Dynamic fixture</title>
    <style>
      body { font-family: sans-serif; }
    </style>
  </head>
  <body>
    <h1>Dynamic fixture heading</h1>
    <p>Default intro copy.</p>

    <section aria-roledescription="carousel" aria-label="Highlights" id="highlights">
      <div data-slide="1" class="slide" role="group" aria-roledescription="slide">
        <p>Carousel slide 1 copy</p>
      </div>
      <div data-slide="2" class="slide" role="group" aria-roledescription="slide" hidden>
        <p>Carousel slide 2 copy</p>
      </div>
      <div data-slide="3" class="slide" role="group" aria-roledescription="slide" hidden>
        <p>Carousel slide 3 copy</p>
      </div>
      <button type="button" id="carousel-prev" data-carousel-prev aria-label="Previous slide">Previous</button>
      <button type="button" id="carousel-next" data-carousel-next aria-label="Next slide">Next</button>
    </section>

    <div role="tablist" aria-label="Plans">
      <button type="button" role="tab" id="tab-overview" aria-selected="true" aria-controls="panel-overview">Overview</button>
      <button type="button" role="tab" id="tab-pricing" aria-selected="false" aria-controls="panel-pricing">Pricing</button>
    </div>
    <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
      <p>Overview tab content</p>
    </div>
    <div role="tabpanel" id="panel-pricing" aria-labelledby="tab-pricing" hidden>
      <p>Pricing tab content</p>
    </div>

    <button type="button" id="acc-shipping-btn" aria-expanded="false" aria-controls="acc-shipping">Shipping</button>
    <div id="acc-shipping" hidden>
      <p>Accordion shipping details</p>
    </div>
    <button type="button" id="acc-returns-btn" aria-expanded="false" aria-controls="acc-returns">Returns</button>
    <div id="acc-returns" hidden>
      <p>Accordion returns details</p>
    </div>

    <button type="button" id="open-hours" aria-haspopup="dialog" data-open-modal>Open hours</button>
    <dialog id="hours-dialog">
      <p>Modal hours content</p>
      <button type="button" id="close-hours" data-close-modal>Close</button>
    </dialog>

    <button type="button" id="account-menu-btn" aria-haspopup="menu" aria-expanded="false" data-dropdown>Account menu</button>
    <ul id="account-menu" role="menu" hidden>
      <li role="menuitem">Dropdown profile item</li>
    </ul>

    <button type="button" id="extra-toggle" aria-expanded="false" aria-controls="extra-copy" data-show-hide>Show extra</button>
    <p id="extra-copy" hidden>Show hide extra copy</p>

    <script>
      (function () {
        const slides = Array.from(document.querySelectorAll("[data-slide]"));
        let index = 0;
        function showSlide(next) {
          index = (next + slides.length) % slides.length;
          slides.forEach((slide, slideIndex) => {
            slide.hidden = slideIndex !== index;
          });
        }
        document.getElementById("carousel-next").addEventListener("click", function () {
          showSlide(index + 1);
        });
        document.getElementById("carousel-prev").addEventListener("click", function () {
          showSlide(index - 1);
        });

        const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
        tabs.forEach((tab) => {
          tab.addEventListener("click", function () {
            tabs.forEach((entry) => {
              const selected = entry === tab;
              entry.setAttribute("aria-selected", selected ? "true" : "false");
              const panel = document.getElementById(entry.getAttribute("aria-controls"));
              if (panel) panel.hidden = !selected;
            });
          });
        });

        function toggleExpanded(button, panel) {
          const expanded = button.getAttribute("aria-expanded") === "true";
          button.setAttribute("aria-expanded", expanded ? "false" : "true");
          if (panel) panel.hidden = expanded;
        }

        document.getElementById("acc-shipping-btn").addEventListener("click", function () {
          toggleExpanded(this, document.getElementById("acc-shipping"));
        });
        document.getElementById("acc-returns-btn").addEventListener("click", function () {
          toggleExpanded(this, document.getElementById("acc-returns"));
        });

        const dialog = document.getElementById("hours-dialog");
        document.getElementById("open-hours").addEventListener("click", function () {
          dialog.showModal();
        });
        document.getElementById("close-hours").addEventListener("click", function () {
          dialog.close();
        });

        const menu = document.getElementById("account-menu");
        const menuBtn = document.getElementById("account-menu-btn");
        menuBtn.addEventListener("click", function () {
          const open = menu.hidden;
          menu.hidden = !open;
          menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
        });

        document.getElementById("extra-toggle").addEventListener("click", function () {
          toggleExpanded(this, document.getElementById("extra-copy"));
        });

        document.addEventListener("keydown", function (event) {
          if (event.key !== "Escape") {
            return;
          }
          if (dialog.open) {
            dialog.close();
          }
          menu.hidden = true;
          menuBtn.setAttribute("aria-expanded", "false");
        });
      })();
    </script>
  </body>
</html>`;
