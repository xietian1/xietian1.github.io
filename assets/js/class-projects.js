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
