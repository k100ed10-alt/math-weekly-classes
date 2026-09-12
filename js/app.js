(function () {
  function qs(id) { return document.getElementById(id); }
  var ytPlayer = null;
  var fbReady = false;
  var fbDb = null;
  var fbAuth = null;
  function initFb() {
    try {
      var cfg = window.FIREBASE_CONFIG;
      if (!cfg || !cfg.apiKey || String(cfg.apiKey).indexOf("PASTE") !== -1) return;
      if (!window.firebase) return;
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      if (firebase.firestore) fbDb = firebase.firestore();
      if (firebase.auth) fbAuth = firebase.auth();
      fbReady = true;
    } catch (e) { fbReady = false; }
  }
  function authError(code) {
    if (code === "auth/invalid-email") return "البريد الإلكتروني غير صحيح";
    if (code === "auth/user-not-found") return "هذا الحساب غير موجود";
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "البريد أو كلمة المرور غير صحيحة";
    if (code === "auth/too-many-requests") return "محاولات كثيرة. انتظر قليلاً";
    if (code === "auth/operation-not-allowed") return "فعّل تسجيل البريد من Firebase Authentication";
    return "تعذر تسجيل الدخول";
  }
  function youtubeId(url) {
    var s = String(url || "");
    var m = s.match(/(?:youtu\.be\/|v=|\/live\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  function classVideo(c) {
    return youtubeId(c.place) || youtubeId(c.notes) || youtubeId(c.yt) || null;
  }
  function loadYtApi(cb) {
    if (window.YT && window.YT.Player) { cb(); return; }
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () { if (prev) prev(); cb(); };
    if (!document.getElementById("ytApiScript")) {
      var s = document.createElement("script");
      s.id = "ytApiScript";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  }
  function renderPlayer(items) {
    var host = document.getElementById("livePlayer");
    if (!host) {
      var box = document.querySelector("#scheduleSection .container");
      if (!box) return;
      host = document.createElement("div");
      host.id = "livePlayer";
      host.className = "live-player hidden";
      var grid = document.getElementById("weekGrid");
      box.insertBefore(host, grid);
    }
    var found = null;
    items.forEach(function (c) {
      var id = classVideo(c);
      if (id && !found) found = { id: id, topic: c.topic || "البث المباشر" };
    });
    if (!found) { host.innerHTML = ""; host.classList.add("hidden"); return; }
    host.classList.remove("hidden");
    host.innerHTML =
      '<div class="yt-head"><strong>البث داخل الموقع</strong>' +
      '<button type="button" class="btn btn-gold" id="ytPlay">تشغيل</button>' +
      '<button type="button" class="btn btn-gold" id="ytFull">تكبير الشاشة</button></div>' +
      '<div class="yt-wrap" id="ytBox">' +
      '<div id="ytApi"></div>' +
      '<button type="button" class="yt-cover" id="ytCover">تشغيل البث هنا</button>' +
      '<button type="button" class="yt-exit hidden" id="ytExit">إغلاق التكبير</button>' +
      '</div>' +
      '<p class="meta">اضغط تشغيل أو تكبير الشاشة.</p>';
    host.oncontextmenu = function (e) { e.preventDefault(); return false; };
    function setFull(on) {
      var boxEl = document.getElementById("ytBox");
      var full = document.getElementById("ytFull");
      var exitBtn = document.getElementById("ytExit");
      if (!boxEl) return;
      boxEl.classList.toggle("is-full", on);
      document.body.classList.toggle("yt-lock", on);
      if (full) full.textContent = on ? "تصغير" : "تكبير الشاشة";
      if (exitBtn) exitBtn.classList.toggle("hidden", !on);
    }
    function bindControls() {
      var playBtn = document.getElementById("ytPlay");
      var cover = document.getElementById("ytCover");
      function toggle() {
        if (!ytPlayer || !ytPlayer.getPlayerState) return;
        var st = ytPlayer.getPlayerState();
        if (st === 1) ytPlayer.pauseVideo();
        else ytPlayer.playVideo();
      }
      if (playBtn) playBtn.onclick = toggle;
      if (cover) cover.onclick = function () { toggle(); cover.classList.add("hidden"); };
      var full = document.getElementById("ytFull");
      var boxEl = document.getElementById("ytBox");
      var exitBtn = document.getElementById("ytExit");
      if (full && boxEl) {
        full.onclick = function () { setFull(!boxEl.classList.contains("is-full")); };
      }
      if (exitBtn) exitBtn.onclick = function () { setFull(false); };
    }
    bindControls();
    loadYtApi(function () {
      if (!document.getElementById("ytApi")) return;
      ytPlayer = new window.YT.Player("ytApi", {
        videoId: found.id,
        playerVars: {
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          fs: 0,
          controls: 0,
          disablekb: 1,
          iv_load_policy: 3,
          origin: location.origin
        },
        events: {
          onStateChange: function (e) {
            var cover = document.getElementById("ytCover");
            var playBtn = document.getElementById("ytPlay");
            if (e.data === 1) {
              if (cover) cover.classList.add("hidden");
              if (playBtn) playBtn.textContent = "إيقاف";
            } else {
              if (playBtn) playBtn.textContent = "تشغيل";
            }
          }
        }
      });
    });
  }
  var DAYS = ["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
  var CODES = {5:"حصة5",6:"حصة6",7:"حصة7",8:"حصة8",9:"حصة9",10:"حصة10",11:"حصة11",12:"حصة12"};
  var state = {teacher:false,grade:sessionStorage.getItem("math_student_grade")||"",classes:JSON.parse(localStorage.getItem("math_classes")||"[]")};
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
    var pill = qs("fbStatus");
    if (pill) pill.innerHTML = fbReady ? "<i></i> مرتبط بـ Firebase" : "<i></i> وضع تجريبي";
    renderGrades(); renderWeek(); renderCodes();
  }
  function renderGrades() {
    var grid = qs("gradesGrid"); if (!grid || !window.PORTAL_CONTENT) return; grid.innerHTML = "";
    var list = state.teacher ? Object.keys(window.PORTAL_CONTENT) : (state.grade ? [state.grade] : []);
    list.forEach(function (g) {
      var d = window.PORTAL_CONTENT[g];
      var card = document.createElement("article");
      card.className = "grade-card"; card.style.setProperty("--accent", d.color);
      card.innerHTML = '<div class="num">' + g + "</div><h4>" + d.title + '</h4><div class="go">حصة هذا الصف</div>';
      grid.appendChild(card);
    });
  }
  function renderWeek() {
    var grid = qs("weekGrid"); if (!grid) return;
    var items = state.classes.filter(function (c) { return state.teacher || String(c.grade) === String(state.grade); });
    renderPlayer(items);
    grid.className = "week-list";
    var empty = qs("weekEmpty");
    if (!items.length) { grid.innerHTML = ""; if (empty) empty.classList.remove("hidden"); return; }
    if (empty) empty.classList.add("hidden");
    var html = "";
    items.forEach(function (c) {
      var hasYt = !!classVideo(c);
      html += '<article class="one-class"><div class="one-day">' + (DAYS[Number(c.day)] || "") + '</div>';
      html += '<div class="one-body"><div class="time">' + (c.start || "") + (c.end ? " - " + c.end : "") + '</div>';
      html += '<div class="topic">' + (c.topic || "حصة رياضيات") + '</div>';
      html += '<div class="meta">الصف ' + c.grade + ' · كل أسبوع</div>';
      if (hasYt) html += '<div class="meta">البث جاهز داخل الصفحة</div>';
      if (state.teacher) {
        html += '<button class="btn-tiny" data-yt="' + c.id + '">ربط يوتيوب</button> ';
        html += '<button class="btn-tiny" data-del="' + c.id + '">حذف</button>';
      }
      html += '</div></article>';
    });
    grid.innerHTML = html;
    grid.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.onclick = function () {
        if (!confirm("حذف هذه الحصة؟")) return;
        state.classes = state.classes.filter(function (c) { return c.id !== btn.getAttribute("data-del"); });
        localStorage.setItem("math_classes", JSON.stringify(state.classes));
        renderWeek();
      };
    });
    grid.querySelectorAll("[data-yt]").forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute("data-yt");
        var url = prompt("الصق رابط بث اليوتيوب");
        if (!url) return;
        if (!youtubeId(url)) { alert("الرابط ليس رابط يوتيوب صحيح"); return; }
        state.classes.forEach(function (c) { if (c.id === id) c.place = url.trim(); });
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
  function teacherOk() {
    state.teacher = true;
    qs("teacherModal").classList.add("hidden");
    paint();
  }
  function start() {
    initFb();
    fillSelect();
    if (fbAuth) {
      fbAuth.onAuthStateChanged(function (user) {
        state.teacher = !!user;
        paint();
      });
    }
    click("btnTeacher", function () { qs("teacherModal").classList.remove("hidden"); });
    click("closeModal", function () { qs("teacherModal").classList.add("hidden"); });
    click("btnLogout", function () {
      state.teacher = false;
      if (fbAuth) fbAuth.signOut();
      paint();
    });
    click("doLogin", function () {
      var email = (qs("teacherEmail") && qs("teacherEmail").value || "").trim();
      var pass = (qs("teacherCode") && qs("teacherCode").value || "").trim();
      var msg = qs("loginMsg");
      function fail(t) { msg.className = "msg err"; msg.textContent = t; }
      if (!email || !pass) { fail("أدخل البريد وكلمة المرور"); return; }
      if (!fbAuth) { fail("Firebase غير جاهز"); return; }
      msg.className = "msg"; msg.textContent = "جاري التحقق...";
      fbAuth.signInWithEmailAndPassword(email, pass).then(function () {
        teacherOk();
      }).catch(function (err) {
        fail(authError(err && err.code));
      });
    });
    click("btnStudentEnter", function () {
      var raw = (qs("studentCode").value || "").trim(); var msg = qs("studentMsg"); var found = null;
      Object.keys(CODES).forEach(function (g) { if (CODES[g] === raw) found = g; });
      if (!found) { msg.className = "msg err"; msg.textContent = "الرمز غير صحيح"; return; }
      state.grade = found; sessionStorage.setItem("math_student_grade", found); paint();
      qs("scheduleSection").scrollIntoView({ behavior: "smooth" });
    });
    click("btnStudentOut", function () { sessionStorage.removeItem("math_student_grade"); state.grade = ""; paint(); });
    click("btnAddClass", function () { qs("classModal").classList.remove("hidden"); });
    click("closeClassModal", function () { qs("classModal").classList.add("hidden"); });
    click("saveClass", function () {
      var item = {id:"local-"+Date.now(),grade:qs("classGrade").value,day:Number(qs("classDay").value),start:qs("classStart").value,end:qs("classEnd").value,topic:qs("classTopic").value.trim(),place:qs("classPlace").value.trim(),notes:qs("classNotes").value.trim()};
      var msg = qs("classMsg");
      if (!item.topic || !item.start) { msg.className = "msg err"; msg.textContent = "أدخل الموضوع والوقت"; return; }
      state.classes = state.classes.filter(function (c) { return String(c.grade) !== String(item.grade); });
      state.classes.push(item);
      localStorage.setItem("math_classes", JSON.stringify(state.classes));
      qs("classModal").classList.add("hidden");
      paint();
    });
    click("saveCodes", function () {
      document.querySelectorAll(".code-input").forEach(function (inp) { CODES[inp.getAttribute("data-grade")] = inp.value.trim(); });
      var msg = qs("codesMsg"); msg.className = "msg ok"; msg.textContent = "تم حفظ الرموز";
    });
    paint();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
