/*
 * Minimal PDF viewer for /viewer/?file=<url>&title=<text>
 * Renders every page with PDF.js (continuous scroll, lazy rendering, HiDPI).
 * Only PDFs from this site or from PDF_VIEWER.allowedOrigins are opened.
 */
(function () {
  "use strict";

  var cfg = window.PDF_VIEWER || {};
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("pv-stage"), statusEl = $("pv-status");
  var pageInput = $("pv-page"), countEl = $("pv-count");

  function fail(msg) {
    statusEl.textContent = msg;
    statusEl.classList.add("pv__status--error");
    statusEl.hidden = false;
  }

  var params = new URLSearchParams(location.search);
  var raw = params.get("file");
  var title = params.get("title");
  if (title) {
    $("pv-title").textContent = title;
    document.title = title + " · " + document.title;
  }
  if (!raw) return fail("No document specified.");

  var url;
  try { url = new URL(raw, location.href); } catch (e) { return fail("Invalid document address."); }
  var allowed = [location.origin].concat(cfg.allowedOrigins || []);
  if (allowed.indexOf(url.origin) === -1 || !/\.pdf$/i.test(url.pathname)) {
    return fail("This document can't be opened here.");
  }
  $("pv-download").href = url.href;

  if (!window.pdfjsLib) return fail("The PDF viewer failed to load.");
  pdfjsLib.GlobalWorkerOptions.workerSrc = cfg.worker;

  var pdf = null, pages = [], scale = 1, fitMode = true, current = 1;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var observer = null;

  function stageWidth() {
    return Math.max(stage.clientWidth - 32, 200);
  }

  function computeFitScale() {
    return stageWidth() / pages[0].baseWidth;
  }

  function layout() {
    pages.forEach(function (p) {
      var w = Math.floor(p.baseWidth * scale), h = Math.floor(p.baseHeight * scale);
      p.wrap.style.width = w + "px";
      p.wrap.style.height = h + "px";
      p.renderedScale = p.renderedScale === scale ? scale : null;
    });
  }

  function render(p) {
    if (p.renderedScale === scale || p.rendering) return;
    p.rendering = true;
    var target = scale;
    pdf.getPage(p.num).then(function (page) {
      var vp = page.getViewport({ scale: target * dpr });
      var canvas = document.createElement("canvas");
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      canvas.setAttribute("aria-label", "Page " + p.num);
      return page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise.then(function () {
        p.wrap.replaceChildren(canvas);
        p.renderedScale = target;
      });
    }).catch(function () {
      p.wrap.textContent = "Couldn't render page " + p.num + ".";
    }).finally(function () {
      p.rendering = false;
      if (p.visible && p.renderedScale !== scale) render(p);
    });
  }

  function observe() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var p = pages[+e.target.dataset.page - 1];
        p.visible = e.isIntersecting;
        if (e.isIntersecting) render(p);
      });
    }, { root: stage, rootMargin: "600px 0px" });
    pages.forEach(function (p) { observer.observe(p.wrap); });
  }

  function trackCurrent() {
    var mid = stage.scrollTop + stage.clientHeight / 3;
    for (var i = 0; i < pages.length; i++) {
      var w = pages[i].wrap;
      if (w.offsetTop + w.offsetHeight > mid) { current = i + 1; break; }
    }
    if (document.activeElement !== pageInput) pageInput.value = current;
  }

  function goTo(n) {
    n = Math.max(1, Math.min(pages.length, n | 0));
    stage.scrollTo({ top: pages[n - 1].wrap.offsetTop - 12, behavior: "smooth" });
  }

  function setScale(next, fit) {
    var anchor = current;
    fitMode = !!fit;
    scale = Math.max(0.25, Math.min(4, next));
    layout();
    pages.forEach(function (p) { if (p.visible) render(p); });
    pages[anchor - 1].wrap.scrollIntoView({ block: "start" });
  }

  pdfjsLib.getDocument({ url: url.href }).promise.then(function (doc) {
    pdf = doc;
    countEl.textContent = doc.numPages;
    pageInput.max = doc.numPages;
    var jobs = [];
    for (var i = 1; i <= doc.numPages; i++) jobs.push(doc.getPage(i));
    return Promise.all(jobs);
  }).then(function (all) {
    statusEl.hidden = true;
    all.forEach(function (page, i) {
      var vp = page.getViewport({ scale: 1 });
      var wrap = document.createElement("div");
      wrap.className = "pv__pagebox";
      wrap.dataset.page = i + 1;
      stage.appendChild(wrap);
      pages.push({ num: i + 1, wrap: wrap, baseWidth: vp.width, baseHeight: vp.height });
    });
    scale = Math.min(computeFitScale(), 1.3);
    layout();
    observe();
    trackCurrent();
  }).catch(function (err) {
    console.error(err);
    fail("Couldn't load this document. It may have moved, or the file server is unavailable.");
  });

  stage.addEventListener("scroll", function () { if (pages.length) trackCurrent(); }, { passive: true });
  $("pv-prev").addEventListener("click", function () { goTo(current - 1); });
  $("pv-next").addEventListener("click", function () { goTo(current + 1); });
  $("pv-zoom-in").addEventListener("click", function () { if (pages.length) setScale(scale * 1.2); });
  $("pv-zoom-out").addEventListener("click", function () { if (pages.length) setScale(scale / 1.2); });
  $("pv-fit").addEventListener("click", function () { if (pages.length) setScale(computeFitScale(), true); });
  pageInput.addEventListener("change", function () { goTo(+pageInput.value); });

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (pages.length && fitMode) setScale(Math.min(computeFitScale(), 1.3), true);
    }, 200);
  });
})();
