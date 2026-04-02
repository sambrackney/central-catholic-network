(function () {
  "use strict";

  if (!window.CentralAuth || !CentralAuth.requireSession()) {
    return;
  }

  function profileDefaults() {
    if (window.CentralProfileForm && CentralProfileForm.defaults) {
      return CentralProfileForm.defaults;
    }
    return {
      fullName: "Alumni member",
      graduationYear: "2025",
      titleCompany: "Viking Ambassador · Central Catholic High School",
      location: "Pittsburgh, Pennsylvania",
      headline:
        "Student leader and Viking Ambassador building community at Central Catholic.",
      about: "",
      hsActivities: "",
      collegeName: "",
    };
  }

  /**
   * Same field sources as profile.js mergeState / render — keeps the feed sidebar in sync with My profile.
   */
  function readStoredProfile() {
    var d = profileDefaults();
    var f = CentralAuth.getProfileFields();
    if (!f) {
      return {
        photoDataUrl: null,
        fullName: d.fullName,
        graduationYear: d.graduationYear,
        titleCompany: d.titleCompany,
        location: d.location,
        headline: d.headline,
        about: d.about,
        hsActivities: d.hsActivities || "",
        collegeName: d.collegeName || "",
      };
    }
    return {
      photoDataUrl: f.photoDataUrl || null,
      fullName:
        f.fullName != null && String(f.fullName).trim()
          ? String(f.fullName).trim()
          : d.fullName,
      graduationYear:
        f.graduationYear != null && String(f.graduationYear).trim()
          ? String(f.graduationYear).trim()
          : d.graduationYear,
      titleCompany: f.titleCompany != null ? String(f.titleCompany) : d.titleCompany,
      location: f.location != null ? String(f.location) : d.location,
      headline: f.headline != null ? String(f.headline) : d.headline,
      about: f.about != null ? String(f.about) : d.about,
      hsActivities: f.hsActivities != null ? String(f.hsActivities) : d.hsActivities || "",
      collegeName: f.collegeName != null ? String(f.collegeName).trim() : "",
    };
  }

  function firstAboutSnippet(about, maxLen) {
    if (!about || !String(about).trim()) return "";
    var first = String(about)
      .split(/\n\s*\n/)[0]
      .trim()
      .replace(/\s+/g, " ");
    if (first.length > maxLen) return first.slice(0, maxLen - 1).trim() + "…";
    return first;
  }

  function truncateText(s, maxLen) {
    s = String(s || "").trim();
    if (s.length <= maxLen) return s;
    return s.slice(0, maxLen - 1).trim() + "…";
  }

  function initialsFromName(name) {
    var parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "??";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;");
  }

  function applyAvatarSlot(imgId, initialsId, photoUrl, initials) {
    var img = document.getElementById(imgId);
    var span = document.getElementById(initialsId);
    if (!span) return;
    span.textContent = initials;
    if (!img) return;
    if (photoUrl) {
      img.onerror = function () {
        img.hidden = true;
        img.removeAttribute("src");
        img.onerror = null;
      };
      img.src = photoUrl;
      img.hidden = false;
    } else {
      img.hidden = true;
      img.removeAttribute("src");
    }
  }

  function updateSessionUi() {
    var el = document.getElementById("session-email");
    if (el) el.textContent = CentralAuth.getCurrentEmail() || "";
  }

  function applyFeedSlots(me) {
    var init = initialsFromName(me.fullName);
    applyAvatarSlot("feed-nav-avatar-img", "feed-nav-avatar-initials", me.photoDataUrl, init);
    applyAvatarSlot(
      "feed-card-photo-img",
      "feed-card-photo-initials",
      me.photoDataUrl,
      init
    );
    applyAvatarSlot(
      "feed-composer-avatar-img",
      "feed-composer-avatar-initials",
      me.photoDataUrl,
      init
    );
    applyAvatarSlot(
      "feed-modal-avatar-img",
      "feed-modal-avatar-initials",
      me.photoDataUrl,
      init
    );

    var nav = document.getElementById("feed-nav-avatar");
    if (nav) {
      nav.setAttribute("aria-label", "View your profile — " + me.fullName);
    }

    var cardPhoto = document.getElementById("feed-card-photo");
    if (cardPhoto) {
      cardPhoto.setAttribute(
        "aria-label",
        "View full profile — " + me.fullName
      );
    }

    var d = profileDefaults();
    var gradY =
      String(me.graduationYear || "").trim() || d.graduationYear;

    var cardName = document.getElementById("feed-card-name");
    var modalName = document.getElementById("feed-modal-name");
    if (cardName) cardName.textContent = me.fullName;
    if (modalName) modalName.textContent = me.fullName;

    var brandEl = document.getElementById("feed-card-brand-headline");
    if (brandEl) {
      var hl = String(me.headline || "").trim();
      if (hl) {
        brandEl.textContent = hl;
        brandEl.hidden = false;
      } else {
        brandEl.textContent = "";
        brandEl.hidden = true;
      }
    }

    var titleCoEl = document.getElementById("feed-card-title-company");
    if (titleCoEl) {
      var tc = String(me.titleCompany || "").trim();
      if (tc) {
        titleCoEl.textContent = tc;
        titleCoEl.hidden = false;
      } else {
        titleCoEl.textContent = "";
        titleCoEl.hidden = true;
      }
    }

    var gradEl = document.getElementById("feed-card-grad");
    if (gradEl) gradEl.textContent = "Class of " + gradY;

    var locDisp = document.getElementById("feed-card-location-display");
    var metaSep = document.getElementById("feed-card-meta-sep");
    var locTrim = String(me.location || "").trim();
    if (locDisp && metaSep) {
      if (locTrim) {
        locDisp.textContent = locTrim;
        metaSep.hidden = false;
      } else {
        locDisp.textContent = "";
        metaSep.hidden = true;
      }
    }

    var aboutBlock = document.getElementById("feed-card-about-block");
    var aboutPrev = document.getElementById("feed-card-about-preview");
    var snip = firstAboutSnippet(me.about, 240);
    if (aboutBlock && aboutPrev) {
      if (snip) {
        aboutPrev.textContent = snip;
        aboutBlock.hidden = false;
      } else {
        aboutPrev.textContent = "";
        aboutBlock.hidden = true;
      }
    }

    var eduClass = document.getElementById("feed-card-edu-class");
    if (eduClass) eduClass.textContent = "Class of " + gradY;

    var hsWrap = document.getElementById("feed-card-hs-act-wrap");
    var hsText = document.getElementById("feed-card-hs-activities");
    var hsa = String(me.hsActivities || "").trim();
    if (hsWrap && hsText) {
      if (hsa) {
        hsText.textContent = truncateText(hsa, 220);
        hsWrap.hidden = false;
      } else {
        hsText.textContent = "";
        hsWrap.hidden = true;
      }
    }

    var colWrap = document.getElementById("feed-card-college-wrap");
    var colName = document.getElementById("feed-card-college-name");
    var cn = String(me.collegeName || "").trim();
    if (colWrap && colName) {
      if (cn) {
        colName.textContent = cn;
        colWrap.hidden = false;
      } else {
        colName.textContent = "";
        colWrap.hidden = true;
      }
    }

    document.title = "Home — " + me.fullName + " — Central Connect";
  }

  var posts = [];

  function rebuildPostsFromStorage() {
    posts = CentralAuth.getFeedPosts().slice();
  }

  function saveUserPostsFromFeed() {
    CentralAuth.setFeedPosts(posts);
  }

  function syncFeedProfile() {
    rebuildPostsFromStorage();
    var me = readStoredProfile();
    applyFeedSlots(me);
    updateSessionUi();
    if (postsEl) renderPosts(postsEl);
  }

  var palette = [
    ["#1e4d7a", "#c9a227"],
    ["#132337", "#e8d48a"],
    ["#2a5f8f", "#fff"],
    ["#0a1628", "#c9a227"],
  ];

  function avatarStyle(index) {
    var p = palette[index % palette.length];
    return "background:linear-gradient(145deg," + p[0] + " 0%," + p[1] + " 160%);color:#fff;";
  }

  var news = [
    {
      title: "Spring sports schedules posted",
      meta: "Athletics · 4,201 readers",
    },
    {
      title: "College acceptances rolling in for the Class of 2026",
      meta: "Guidance · 2,884 readers",
    },
    {
      title: "Booster Club membership drive",
      meta: "Community · 1,102 readers",
    },
  ];

  var suggestions = [
    { initials: "TC", name: "Tom C.", sub: "Class of 2019 · Finance", idx: 0 },
    { initials: "LP", name: "Laura P.", sub: "Class of 2022 · Nursing", idx: 1 },
    { initials: "JW", name: "James W.", sub: "Faculty · Science", idx: 2 },
  ];

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /** Personal feed: every post is the signed-in user — always use their photo or name initials. */
  function postAvatarHtml(p, i, me) {
    var style = avatarStyle(i);
    var init = initialsFromName(me.fullName);
    if (me.photoDataUrl) {
      return (
        '<div class="post__avatar" style="' +
        style +
        '">' +
        '<img class="post__avatar-img" src="' +
        escapeAttr(me.photoDataUrl) +
        '" alt="" />' +
        '<span class="post__avatar-initials">' +
        escapeHtml(init) +
        "</span></div>"
      );
    }
    return (
      '<div class="post__avatar" style="' +
      style +
      '" aria-hidden="true">' +
      escapeHtml(init) +
      "</div>"
    );
  }

  function renderPosts(container) {
    var me = readStoredProfile();
    if (!posts.length) {
      container.innerHTML =
        '<div class="card feed-empty" role="status">' +
        '<p class="feed-empty__title">Your feed is empty</p>' +
        "<p class=\"feed-empty__text\">" +
        "Use this space as your personal blog: internships, jobs, grad school, " +
        "volunteering, or any career milestone. Click <strong>Share a career update</strong> above to add your first post." +
        "</p>" +
        "</div>";
      return;
    }
    container.innerHTML = posts
      .map(function (p, i) {
        return (
          '<article class="card post" data-post-id="' +
          escapeHtml(p.id) +
          '">' +
          '<header class="post__header">' +
          postAvatarHtml(p, i, me) +
          '<div class="post__meta">' +
          '<p class="post__name"><a href="profile.html">' +
          escapeHtml(p.name) +
          "</a></p>" +
          '<p class="post__sub">' +
          escapeHtml(p.sub) +
          " · " +
          escapeHtml(p.time) +
          "</p>" +
          "</div>" +
          "</header>" +
          '<div class="post__body">' +
          escapeHtml(p.body) +
          "</div>" +
          '<div class="post__stats">' +
          "<span>" +
          p.likes +
          " reactions</span><span>" +
          p.comments +
          " comments</span>" +
          "</div>" +
          '<div class="post__actions">' +
          '<button type="button" class="post__action">Like</button>' +
          '<button type="button" class="post__action">Comment</button>' +
          '<button type="button" class="post__action">Share</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderNews(listEl) {
    listEl.innerHTML = news
      .map(function (n) {
        return (
          '<li class="news-card__item">' +
          '<a href="#">' +
          escapeHtml(n.title) +
          "</a>" +
          '<p class="news-card__meta">' +
          escapeHtml(n.meta) +
          "</p>" +
          "</li>"
        );
      })
      .join("");
  }

  function renderSuggestions(listEl) {
    listEl.innerHTML = suggestions
      .map(function (s) {
        var style = avatarStyle(s.idx);
        return (
          '<li class="suggest-item">' +
          '<div class="suggest-item__avatar" style="' +
          style +
          '" aria-hidden="true">' +
          escapeHtml(s.initials) +
          "</div>" +
          '<div class="suggest-item__text">' +
          '<p class="suggest-item__name">' +
          escapeHtml(s.name) +
          "</p>" +
          '<p class="suggest-item__sub">' +
          escapeHtml(s.sub) +
          "</p>" +
          '<button type="button" class="suggest-item__btn">Connect</button>' +
          "</div>" +
          "</li>"
        );
      })
      .join("");
  }

  var postsEl = document.getElementById("posts");
  var newsEl = document.getElementById("news-list");
  var suggestEl = document.getElementById("suggestions-list");
  var modal = document.getElementById("composer-modal");
  var openBtn = document.getElementById("open-composer");
  var postBody = document.getElementById("post-body");
  var submitPost = document.getElementById("submit-post");

  document.querySelectorAll(".js-logout").forEach(function (btn) {
    btn.addEventListener("click", function () {
      CentralAuth.logout();
    });
  });

  if (newsEl) renderNews(newsEl);
  if (suggestEl) renderSuggestions(suggestEl);

  syncFeedProfile();

  window.addEventListener("storage", function (e) {
    if (e.key === CentralAuth.AUTH_KEY) syncFeedProfile();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") syncFeedProfile();
  });

  function openModal() {
    if (!modal) return;
    modal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
    syncFeedProfile();
    if (postBody) postBody.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.setAttribute("hidden", "");
    document.body.style.overflow = "";
  }

  if (openBtn) {
    openBtn.addEventListener("click", openModal);
  }

  if (modal) {
    modal.querySelectorAll("[data-close-modal]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });
    modal.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
  }

  if (submitPost && postBody && postsEl) {
    submitPost.addEventListener("click", function () {
      var text = postBody.value.trim();
      if (!text) {
        postBody.focus();
        return;
      }
      var me = readStoredProfile();
      var newPost = {
        id: String(Date.now()),
        initials: initialsFromName(me.fullName),
        name: me.fullName,
        sub: "Class of " + me.graduationYear + " · Career update",
        time: "now",
        body: text,
        likes: 0,
        comments: 0,
      };
      posts.unshift(newPost);
      saveUserPostsFromFeed();
      syncFeedProfile();
      postBody.value = "";
      closeModal();
    });
  }
})();
