(function () {
  function qs(id) { return document.getElementById(id); }
  function youtubeId(url) {
    var s = String(url || "");
    var m = s.match(/(?:youtu\.be\/|v=|\/live\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  function renderPlayer(items) {
    var host = document.getElementById("livePlayer");
    if (!host) {
      var sec = document.getElementById("scheduleSection");
      var box = sec && sec.querySelector(".container");
      if (!box) return;
      host = document.createElement("div");
      host.id = "livePlayer";
      host.className = "live-player hidden";
      var grid = document.getElementById("weekGrid");
      box.insertBefore(host, grid);
    }
    var found = null;
    items.forEach(function (c) {
      var id = youtubeId(c.place) || youtubeId(c.notes) || youtubeId(c.topic);
      if (id && !found) found = { id: id, topic: c.topic || "البث المباشر" };
    });
    if (!found) { host.innerHTML = ""; host.classList.add("hidden"); return; }
    host.classList.remove("hidden");
    host.innerHTML = '<h3 style="margin-bottom:10px">البث داخل الصفحة</h3><div class="yt-wrap"><iframe src="https://www.youtube.com/embed/' + found.id + '?rel=0" title="live" allowfullscreen></iframe></div>';
  }
  var DAYS = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  var CODES = {5:"حصة5",6:"حصة6",7:"حصة7",8:"حصة8",9:"حصة9",10:"حصة10",11:"حصة11",12:"حصة12"};
  var state = {teacher:sessionStorage.getItem("math_teacher")==="1",grade:sessionStorage.getItem("math_student_grade")||"",classes:JSON.parse(localStorage.getItem("math_classes")||"[]")};
  function setHidden(el, hide) { if (el) el.classList.toggle("hidden", !!hide); }
  function paint() {
    var open = state.teacher || !!state.grade;
    setHidden(qs("studentGate"), open);
    setHidden(qs("afterLoginCta"), !open || state.teacher);
    setHidden(qs("gradesSection"), !open);
    setHidden(qs("scheduleSection"), !open);
    setHidden(qs("teacherBar"), !state.teacher);
    setHidden(qs("btnTeacher"), state.teacher);
    setHidden(qs("btnAddClass"), !state.teacher);
    setHidden(qs("teacherScheduleHint"), !state.teacher);
    setHidden(qs("btnAllGrades"), !state.teacher);
    var pill = qs("fbStatus");
    if (pill) pill.innerHTML = "<i></i> وضع تجريبي";
    renderGrades(); renderWeek(); renderCodes();
  }
  function renderGrades() {
    var grid = qs("gradesGrid"); if (!grid || !window.PORTAL_CONTENT) return; grid.innerHTML = "";
    var list = state.teacher ? Object.keys(window.PORTAL_CONTENT) : (state.grade ? [state.grade] : []);
    list.forEach(function (g) {
      var d = window.PORTAL_CONTENT[g];
      var card = document.createElement("article");
      card.className = "grade-card"; card.style.setProperty("--accent", d.color);
      card.innerHTML = '<div class="num">' + g + "</div><h4>" + d.title + '</h4><div class="go">حصص هذا الصف</div>';
      grid.appendChild(card);
    });
  }
  function renderWeek() {
    var grid = qs("weekGrid"); if (!grid) return;
    var today = new Date().getDay();
    var items = state.classes.filter(function (c) { return state.teacher || String(c.grade) === String(state.grade); });
    renderPlayer(items);
    var html = "";
    DAYS.forEach(function (name, day) {
      var list = items.filter(function (c) { return Number(c.day) === day; });
      html += '<div class="day-col' + (day === today ? " today" : "") + '"><h4>' + name + (day === today ? " · اليوم" : "") + '</h4><div class="day-list">';
      if (!list.length) html += '<div class="meta" style="color:var(--muted);padding:8px">لا حصة</div>';
      list.forEach(function (c) {
        html += '<article class="class-card"><div class="time">' + (c.start || "") + (c.end ? " - " + c.end : "") + '</div><div class="topic">' + (c.topic || "") + "</div><div class='meta'>الصف " + c.grade + (c.place ? " · " + c.place : "") + "</div>";
        if (state.teacher) html += '<button class="btn-tiny" data-del="' + c.id + '">حذف</button>';
        html += "</article>";
      });
      html += "</div></div>";
    });
    grid.innerHTML = html;
    var empty = qs("weekEmpty"); if (empty) empty.classList.toggle("hidden", items.length > 0);
    grid.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.onclick = function () {
        if (!confirm("حذف هذه الحصة؟")) return;
        state.classes = state.classes.filter(function (c) { return c.id !== btn.getAttribute("data-del"); });
        localStorage.setItem("math_classes", JSON.stringify(state.classes));
        renderWeek();
      };
    });
  }
  function renderCodes() {
    var host = qs("codesEditor"); if (!host || !window.PORTAL_CONTENT) return; var html = "";
    Object.keys(window.PORTAL_CONTENT).forEach(function (g) {
      html += '<div class="code-row"><label>' + window.PORTAL_CONTENT[g].title + '</label><input data-grade="' + g + '" class="code-input" value="' + (CODES[g] || "") + '" /></div>';
    });
    host.innerHTML = html;
  }
  function fillSelect() {
    var sel = qs("classGrade"); if (!sel || !window.PORTAL_CONTENT) return;
    sel.innerHTML = Object.keys(window.PORTAL_CONTENT).map(function (g) { return '<option value="' + g + '">' + window.PORTAL_CONTENT[g].title + "</option>"; }).join("");
  }
  function click(id, fn) { var el = qs(id); if (el) el.addEventListener("click", fn); }
  function start() {
    fillSelect();
    click("btnTeacher", function () { qs("teacherModal").classList.remove("hidden"); });
    click("closeModal", function () { qs("teacherModal").classList.add("hidden"); });
    click("btnLogout", function () { sessionStorage.removeItem("math_teacher"); state.teacher = false; paint(); });
    click("doLogin", function () {
      var code = qs("teacherCode").value.trim(); var msg = qs("loginMsg");
      if (code !== (window.FALLBACK_TEACHER_CODE || "123456")) { msg.className = "msg err"; msg.textContent = "رقم خاطئ. جرب 123456"; return; }
      sessionStorage.setItem("math_teacher", "1"); state.teacher = true; qs("teacherModal").classList.add("hidden"); paint();
    });
    click("btnStudentEnter", function () {
      var raw = (qs("studentCode").value || "").trim(); var msg = qs("studentMsg"); var found = null;
      Object.keys(CODES).forEach(function (g) { if (CODES[g] === raw) found = g; });
      if (!found) { msg.className = "msg err"; msg.textContent = "الرمز غير صحيح"; return; }
      state.grade = found; sessionStorage.setItem("math_student_grade", found); msg.className = "msg ok"; msg.textContent = "تم الدخول"; paint();
      qs("scheduleSection").scrollIntoView({ behavior: "smooth" });
    });
    click("btnStudentOut", function () { sessionStorage.removeItem("math_student_grade"); state.grade = ""; paint(); });
    click("btnAddClass", function () { qs("classModal").classList.remove("hidden"); });
    click("closeClassModal", function () { qs("classModal").classList.add("hidden"); });
    click("saveClass", function () {
      var item = {id:"local-"+Date.now(),grade:qs("classGrade").value,day:Number(qs("classDay").value),start:qs("classStart").value,end:qs("classEnd").value,topic:qs("classTopic").value.trim(),place:qs("classPlace").value.trim(),notes:qs("classNotes").value.trim()};
      var msg = qs("classMsg");
      if (!item.topic || !item.start) { msg.className = "msg err"; msg.textContent = "أدخل الموضوع والوقت"; return; }
      state.classes.push(item); localStorage.setItem("math_classes", JSON.stringify(state.classes)); qs("classModal").classList.add("hidden"); paint();
    });
    click("saveCodes", function () {
      document.querySelectorAll(".code-input").forEach(function (inp) { CODES[inp.getAttribute("data-grade")] = inp.value.trim(); });
      var msg = qs("codesMsg"); msg.className = "msg ok"; msg.textContent = "تم حفظ الرموز";
    });
    paint();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
