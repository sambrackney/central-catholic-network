(function () {
  "use strict";

  if (!window.CentralProfileForm) {
    console.error("CentralProfileForm missing; load profile-fields.js before profile.js");
    return;
  }

  var defaults = CentralProfileForm.defaults;

  function initialsFromName(name) {
    var parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "??";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /** Map pre–header-section saves (single combined `headline` line) into new fields. */
  function migrateLegacy(stored) {
    if (!stored || stored.fullName) return stored;
    var oldHeadline = String(stored.headline || "");
    var isLegacyLine =
      oldHeadline.indexOf("·") !== -1 && /class\s+of\s+\d{4}/i.test(oldHeadline);
    if (!isLegacyLine) return stored;

    var copy = Object.assign({}, stored);
    copy.fullName = defaults.fullName;
    copy.graduationYear = defaults.graduationYear;
    copy.titleCompany = defaults.titleCompany;
    copy.location = defaults.location;
    copy.headline = defaults.headline;

    var segs = oldHeadline.split("·").map(function (s) {
      return s.trim();
    });
    var m = segs[0] && segs[0].match(/class\s+of\s+(\d{4})/i);
    if (m) copy.graduationYear = m[1];
    if (segs.length >= 2) {
      copy.titleCompany = segs.slice(1).join(" · ") || copy.titleCompany;
    }
    return copy;
  }

  function normalizeCollegeDomain(raw) {
    if (!raw || !String(raw).trim()) return null;
    var s = String(raw).trim().replace(/\s+/g, "");
    if (!s) return null;
    try {
      var urlStr = s.indexOf("://") === -1 ? "https://" + s : s;
      var u = new URL(urlStr);
      var host = u.hostname.replace(/^www\./i, "");
      if (!host || host.indexOf(".") === -1) return null;
      return host.toLowerCase();
    } catch (e) {
      var host = s
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .split("/")[0]
        .split("?")[0];
      if (host && host.indexOf(".") !== -1) return host.toLowerCase();
      return null;
    }
  }

  function collegeFaviconUrl(domain) {
    return (
      "https://www.google.com/s2/favicons?sz=128&domain=" +
      encodeURIComponent(domain)
    );
  }

  function parseAboutToParagraphs(text) {
    if (!text) return [];
    return String(text)
      .split(/\n\s*\n/)
      .map(function (p) {
        return p.trim();
      })
      .filter(Boolean);
  }

  function loadStored() {
    if (!window.CentralAuth) return {};
    var f = CentralAuth.getProfileFields();
    return f || {};
  }

  function patchEducationKeys(stored) {
    if (!stored) return stored;
    if (
      stored.hsActivities === undefined &&
      stored.eduActivities != null
    ) {
      stored.hsActivities = stored.eduActivities;
    }
    if (
      stored.graduationYear === undefined &&
      stored.eduDiploma
    ) {
      var m = String(stored.eduDiploma).match(/(\d{4})/);
      if (m) stored.graduationYear = m[1];
    }
    return stored;
  }

  function mergeState() {
    var raw = loadStored();
    var stored = patchEducationKeys(migrateLegacy(raw || {}));
    var out = {};
    var k;
    for (k in defaults) {
      if (Object.prototype.hasOwnProperty.call(defaults, k)) {
        out[k] =
          stored[k] !== undefined && stored[k] !== null
            ? stored[k]
            : defaults[k];
      }
    }
    if (!Array.isArray(out.experienceLines)) out.experienceLines = defaults.experienceLines.slice();
    if (!Array.isArray(out.skills)) out.skills = defaults.skills.slice();
    return out;
  }

  function saveState(state) {
    if (!window.CentralAuth) return;
    var copy = Object.assign({}, state);
    delete copy.feedPosts;
    CentralAuth.saveProfileFields(copy);
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function renderAbout(container, text) {
    var paras = parseAboutToParagraphs(text);
    container.innerHTML = paras
      .map(function (p) {
        return '<p class="profile-section__body">' + escapeHtml(p) + "</p>";
      })
      .join("");
  }

  function renderExperience(listEl, lines) {
    listEl.innerHTML = lines
      .map(function (line) {
        var parts = line.split(/ — /);
        if (parts.length >= 2) {
          return (
            "<li><strong>" +
            escapeHtml(parts[0].trim()) +
            "</strong> — " +
            escapeHtml(parts.slice(1).join(" — ").trim()) +
            "</li>"
          );
        }
        return "<li>" + escapeHtml(line) + "</li>";
      })
      .join("");
  }

  function renderSkills(container, skills) {
    container.innerHTML = skills
      .map(function (s) {
        return (
          '<span class="profile-chip" role="listitem">' + escapeHtml(s) + "</span>"
        );
      })
      .join("");
  }

  function renderHsActivities(el, text) {
    var t = String(text || "").trim();
    if (!t) {
      el.textContent = "—";
      el.classList.add("profile-edu__rich--empty");
      return;
    }
    el.classList.remove("profile-edu__rich--empty");
    el.textContent = text;
  }

  function setCollegeSub(wrapId, elId, text) {
    var wrap = document.getElementById(wrapId);
    var el = document.getElementById(elId);
    if (!wrap || !el) return;
    var t = String(text || "").trim();
    if (!t) {
      wrap.hidden = true;
      el.textContent = "";
      return;
    }
    wrap.hidden = false;
    el.textContent = text;
  }

  function renderCollege(state) {
    var placeholder = document.getElementById("profile-college-placeholder");
    var filled = document.getElementById("profile-college-filled");
    var nameEl = document.getElementById("profile-college-name");
    var logoEl = document.getElementById("profile-college-logo");
    if (!placeholder || !filled || !nameEl) return;

    var name = String(state.collegeName || "").trim();
    var d = String(state.collegeDegrees || "").trim();
    var maj = String(state.collegeMajors || "").trim();
    var h = String(state.collegeHonors || "").trim();
    var hasAny = name || d || maj || h;

    if (!hasAny) {
      placeholder.hidden = false;
      filled.hidden = true;
      if (logoEl) {
        logoEl.hidden = true;
        logoEl.removeAttribute("src");
      }
      return;
    }
    placeholder.hidden = true;
    filled.hidden = false;
    nameEl.textContent = name;
    nameEl.hidden = !name;

    var domain = normalizeCollegeDomain(state.collegeWebsite);
    if (logoEl) {
      logoEl.onerror = function () {
        logoEl.hidden = true;
        logoEl.removeAttribute("src");
        logoEl.onerror = null;
      };
      if (domain) {
        logoEl.alt = name ? name + " logo" : "College logo";
        logoEl.src = collegeFaviconUrl(domain);
        logoEl.hidden = false;
      } else {
        logoEl.hidden = true;
        logoEl.removeAttribute("src");
        logoEl.alt = "";
      }
    }

    setCollegeSub("profile-college-degrees-wrap", "profile-college-degrees", d);
    setCollegeSub("profile-college-majors-wrap", "profile-college-majors", maj);
    setCollegeSub("profile-college-honors-wrap", "profile-college-honors", h);
  }

  function applyPhoto(photoDataUrl, initialsText) {
    var img = document.getElementById("profile-photo-img");
    var initials = document.getElementById("profile-photo-initials");
    if (!img || !initials) return;

    if (initialsText) initials.textContent = initialsText;

    if (photoDataUrl) {
      img.src = photoDataUrl;
      img.hidden = false;
      initials.hidden = true;
    } else {
      img.removeAttribute("src");
      img.hidden = true;
      initials.hidden = false;
    }
  }

  function applyMiniNavAvatar(state) {
    var img = document.getElementById("feed-nav-avatar-img");
    var initialsEl = document.getElementById("feed-nav-avatar-initials");
    var nav = document.getElementById("feed-nav-avatar");
    if (initialsEl) initialsEl.textContent = initialsFromName(state.fullName);
    if (img) {
      if (state.photoDataUrl) {
        img.onerror = function () {
          img.hidden = true;
          img.removeAttribute("src");
          img.onerror = null;
        };
        img.src = state.photoDataUrl;
        img.hidden = false;
      } else {
        img.hidden = true;
        img.removeAttribute("src");
      }
    }
    if (nav) nav.setAttribute("aria-label", "My profile");
  }

  function applyDocumentTitle(fullName) {
    document.title = "My profile — " + fullName + " — Central Connect";
  }

  function updateSessionUi() {
    var el = document.getElementById("session-email");
    if (el && window.CentralAuth) {
      el.textContent = CentralAuth.getCurrentEmail() || "";
    }
  }

  function render(state) {
    var nameEl = document.getElementById("profile-full-name");
    var brandEl = document.getElementById("profile-brand-headline");
    var titleCoEl = document.getElementById("profile-title-company");
    var gradEl = document.getElementById("profile-grad-display");
    var locEl = document.getElementById("profile-location-display");
    var aboutEl = document.getElementById("profile-about");
    var hsGrad = document.getElementById("profile-hs-grad");
    var hsAct = document.getElementById("profile-hs-activities");
    var expEl = document.getElementById("profile-experience-list");
    var skillsEl = document.getElementById("profile-skills-chips");

    if (nameEl) nameEl.textContent = state.fullName;
    if (brandEl) brandEl.textContent = state.headline;
    if (titleCoEl) titleCoEl.textContent = state.titleCompany;
    var gradYear =
      String(state.graduationYear || "").trim() || defaults.graduationYear;
    if (gradEl) gradEl.textContent = "Class of " + gradYear;
    if (locEl) locEl.textContent = state.location;

    if (aboutEl) renderAbout(aboutEl, state.about);
    if (hsGrad) hsGrad.textContent = "Class of " + gradYear;
    if (hsAct) renderHsActivities(hsAct, state.hsActivities);

    renderCollege(state);

    if (expEl) renderExperience(expEl, state.experienceLines);
    if (skillsEl) renderSkills(skillsEl, state.skills);

    applyPhoto(state.photoDataUrl, initialsFromName(state.fullName));

    applyDocumentTitle(state.fullName);
    applyMiniNavAvatar(state);
  }

  function fillForm(state, modal) {
    modal.querySelector('[name="fullName"]').value = state.fullName;
    modal.querySelector('[name="graduationYear"]').value = state.graduationYear;
    modal.querySelector('[name="titleCompany"]').value = state.titleCompany;
    modal.querySelector('[name="location"]').value = state.location;
    modal.querySelector('[name="headline"]').value = state.headline;
    modal.querySelector('[name="about"]').value = state.about;
    modal.querySelector('[name="hsActivities"]').value = state.hsActivities;
    modal.querySelector('[name="collegeName"]').value = state.collegeName || "";
    modal.querySelector('[name="collegeWebsite"]').value = state.collegeWebsite || "";
    modal.querySelector('[name="collegeDegrees"]').value = state.collegeDegrees || "";
    modal.querySelector('[name="collegeMajors"]').value = state.collegeMajors || "";
    modal.querySelector('[name="collegeHonors"]').value = state.collegeHonors || "";
    modal.querySelector('[name="experience"]').value = state.experienceLines.join("\n");
    modal.querySelector('[name="skills"]').value = state.skills.join("\n");

    var preview = document.getElementById("edit-photo-preview");
    var clearCheck = modal.querySelector('[name="clearPhoto"]');
    var fileInput = modal.querySelector('[name="photo"]');
    fileInput.value = "";
    clearCheck.checked = false;

    if (state.photoDataUrl && preview) {
      preview.src = state.photoDataUrl;
      preview.hidden = false;
    } else if (preview) {
      preview.removeAttribute("src");
      preview.hidden = true;
    }
  }

  function readBaseFields(modal) {
    return CentralProfileForm.readTextFields(modal);
  }

  function openModal(modal) {
    modal.removeAttribute("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    modal.setAttribute("hidden", "");
    document.body.style.overflow = "";
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.CentralAuth || !CentralAuth.requireSession()) return;

    var modal = document.getElementById("edit-profile-modal");
    var openBtn = document.getElementById("edit-profile-btn");
    if (!modal || !openBtn) return;

    document.querySelectorAll(".js-logout").forEach(function (btn) {
      btn.addEventListener("click", function () {
        CentralAuth.logout();
      });
    });

    function refreshFromStorage() {
      render(mergeState());
      updateSessionUi();
    }

    refreshFromStorage();

    window.addEventListener("storage", function (e) {
      if (e.key === CentralAuth.AUTH_KEY) refreshFromStorage();
    });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") refreshFromStorage();
    });

    window.addEventListener("pageshow", function (e) {
      if (e.persisted) refreshFromStorage();
    });

    openBtn.addEventListener("click", function () {
      fillForm(mergeState(), modal);
      openModal(modal);
      modal.querySelector('[name="fullName"]').focus();
    });

    modal.querySelectorAll("[data-close-edit]").forEach(function (el) {
      el.addEventListener("click", function () {
        closeModal(modal);
      });
    });

    modal.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal(modal);
    });

    var fileInput = modal.querySelector('[name="photo"]');
    var preview = document.getElementById("edit-photo-preview");
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file || !file.type.match(/^image\//)) return;
      var reader = new FileReader();
      reader.onload = function () {
        preview.src = reader.result;
        preview.hidden = false;
        modal.querySelector('[name="clearPhoto"]').checked = false;
      };
      reader.readAsDataURL(file);
    });

    modal.querySelector('[name="clearPhoto"]').addEventListener("change", function () {
      if (this.checked) {
        fileInput.value = "";
        preview.removeAttribute("src");
        preview.hidden = true;
      }
    });

    document.getElementById("edit-profile-save").addEventListener("click", function () {
      var base = readBaseFields(modal);
      var prev = mergeState();
      var clearPhoto = modal.querySelector('[name="clearPhoto"]').checked;
      var file = fileInput.files && fileInput.files[0];

      function done(photoDataUrl) {
        var state = {
          photoDataUrl: photoDataUrl,
          fullName: base.fullName,
          graduationYear: base.graduationYear,
          titleCompany: base.titleCompany,
          location: base.location,
          headline: base.headline,
          about: base.about,
          hsActivities: base.hsActivities,
          collegeName: base.collegeName,
          collegeWebsite: base.collegeWebsite,
          collegeDegrees: base.collegeDegrees,
          collegeMajors: base.collegeMajors,
          collegeHonors: base.collegeHonors,
          experienceLines: base.experienceLines,
          skills: base.skills,
        };
        saveState(state);
        render(state);
        updateSessionUi();
        closeModal(modal);
      }

      if (clearPhoto) {
        done(null);
        return;
      }

      if (file && file.type.match(/^image\//)) {
        var reader = new FileReader();
        reader.onload = function () {
          done(reader.result);
        };
        reader.readAsDataURL(file);
        return;
      }

      done(prev.photoDataUrl);
    });
  });
})();
