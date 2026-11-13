/* Course filter chips on /class-projects/ */
(function () {
  var chips = document.querySelectorAll(".cp-chip");
  var sections = document.querySelectorAll(".cp-course");
  if (!chips.length) return;

  function show(course) {
    chips.forEach(function (c) {
      var on = c.getAttribute("data-course") === course;
      c.classList.toggle("is-active", on);
      c.setAttribute("aria-pressed", on ? "true" : "false");
    });
    sections.forEach(function (s) {
      s.hidden = course !== "all" && s.getAttribute("data-course") !== course;
    });
  }

  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      var course = c.getAttribute("data-course");
      show(course);
      if (history.replaceState) {
        history.replaceState(null, "", course === "all" ? location.pathname : "#" + course);
      }
    });
  });

  var initial = decodeURIComponent(location.hash.slice(1));
  if (initial && document.querySelector('.cp-chip[data-course="' + initial + '"]')) show(initial);
})();

/* Demo video player (native <dialog>; falls back to opening the MP4 directly) */
(function () {
  var dlg = document.getElementById("cp-player");
  if (!dlg || typeof dlg.showModal !== "function") return;
  var video = document.getElementById("cp-player-video");
  var title = document.getElementById("cp-player-title");
  var error = document.getElementById("cp-player-error");

  document.querySelectorAll(".cp-video-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      title.textContent = btn.getAttribute("data-title") || "Demo";
      error.hidden = true;
      video.hidden = false;
      video.src = btn.getAttribute("data-video");
      dlg.showModal();
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    });
  });

  video.addEventListener("error", function () {
    if (!video.getAttribute("src")) return;
    video.hidden = true;
    error.hidden = false;
  });

  function stop() {
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
  document.getElementById("cp-player-close").addEventListener("click", function () { dlg.close(); });
  dlg.addEventListener("close", stop);
  dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
})();
