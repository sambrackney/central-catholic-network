/**
 * Central Connect — session and per-account storage (demo: email “accounts”, no passwords).
 */
(function () {
  "use strict";

  var AUTH_KEY = "centralConnectAuth";
  var LEGACY_PROFILE_KEY = "centralConnectProfile";

  function defaultProfileTemplate(displayName) {
    var name = String(displayName || "Alumni member").trim() || "Alumni member";
    return {
      photoDataUrl: null,
      fullName: name,
      graduationYear: "2025",
      titleCompany: "Viking Ambassador · Central Catholic High School",
      location: "Pittsburgh, Pennsylvania",
      headline: "Student leader and Viking Ambassador building community at Central Catholic.",
      about:
        "I’m a senior at Central Catholic High School in Pittsburgh—the home of the Vikings. I care about representing our school with integrity, whether I’m welcoming families as a Viking Ambassador, supporting classmates, or taking on academic and extracurricular challenges with purpose.\n\nCentral Catholic has shaped how I think about leadership and service: showing up prepared, treating people with respect, and giving back to the community that has invested in me. I’m focused on finishing strong in my senior year while staying connected to alumni, faculty, and peers through Central Connect.",
      hsActivities:
        "Viking Ambassador program, campus visits and outreach, student leadership",
      collegeName: "",
      collegeWebsite: "",
      collegeDegrees: "",
      collegeMajors: "",
      collegeHonors: "",
      experienceLines: [
        "Viking Ambassador — Represent Central Catholic to prospective students and families; lead tours, serve on panels, and answer questions about academics and student life.",
        "School community — Collaborate with classmates and staff on events and initiatives that build school spirit and support fellow Vikings.",
      ],
      skills: [
        "Public speaking",
        "Peer mentorship",
        "Organization & planning",
        "School spirit & engagement",
        "Writing",
      ],
      feedPosts: [],
    };
  }

  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "");
  }

  function loadAuth() {
    try {
      var raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return migrateLegacyProfile();
      var data = JSON.parse(raw);
      if (!data || typeof data !== "object") return emptyAuth();
      if (!data.accounts || typeof data.accounts !== "object") data.accounts = {};
      return data;
    } catch (e) {
      return emptyAuth();
    }
  }

  function emptyAuth() {
    return { currentEmail: null, accounts: {} };
  }

  function migrateLegacyProfile() {
    var auth = emptyAuth();
    try {
      var leg = localStorage.getItem(LEGACY_PROFILE_KEY);
      if (!leg) return auth;
      var profile = JSON.parse(leg);
      var email = "legacy@centralconnect.local";
      if (!profile.fullName) profile.fullName = "Sam Brackney";
      if (!Array.isArray(profile.feedPosts)) profile.feedPosts = [];
      auth.accounts[email] = profile;
      auth.currentEmail = email;
      localStorage.removeItem(LEGACY_PROFILE_KEY);
      localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    } catch (e) {}
    return auth;
  }

  function saveAuth(auth) {
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    } catch (e) {}
  }

  window.CentralAuth = {
    AUTH_KEY: AUTH_KEY,

    normalizeEmail: normalizeEmail,

    loadAuth: loadAuth,

    getCurrentEmail: function () {
      var a = loadAuth();
      return a.currentEmail || null;
    },

    /** Redirects to login if no session. */
    requireSession: function () {
      if (!this.getCurrentEmail()) {
        window.location.replace("login.html");
        return false;
      }
      return true;
    },

    getAccount: function () {
      var a = loadAuth();
      var e = a.currentEmail;
      if (!e) return null;
      return a.accounts[e] || null;
    },

    /** Profile fields only (no feedPosts) for merge/save in profile editor. */
    getProfileFields: function () {
      var acc = this.getAccount();
      if (!acc) return null;
      var o = Object.assign({}, acc);
      delete o.feedPosts;
      return o;
    },

    ensureAccount: function (email, displayName) {
      email = normalizeEmail(email);
      if (!email) return false;
      var a = loadAuth();
      if (!a.accounts[email]) {
        a.accounts[email] = defaultProfileTemplate(displayName || email.split("@")[0]);
      }
      a.currentEmail = email;
      saveAuth(a);
      return true;
    },

    /** Returns false if email invalid. */
    signIn: function (email, displayName) {
      email = normalizeEmail(email);
      if (!email || email.indexOf("@") === -1) return false;
      var dn = String(displayName || "").trim();
      var a = loadAuth();
      if (!a.accounts[email]) {
        a.accounts[email] = defaultProfileTemplate(dn || email.split("@")[0]);
      } else if (dn) {
        var acc = a.accounts[email];
        var localPart = email.split("@")[0];
        if (!acc.fullName || acc.fullName === localPart) {
          acc.fullName = dn;
        }
      }
      a.currentEmail = email;
      saveAuth(a);
      return true;
    },

    /** True if an account already exists for this email (normalized). */
    accountExists: function (email) {
      email = normalizeEmail(email);
      if (!email) return false;
      return !!loadAuth().accounts[email];
    },

    /**
     * Sign in only if the account exists. Use after separate sign-up flow.
     * @returns {{ ok: boolean, reason?: string }}
     */
    signInExisting: function (email) {
      email = normalizeEmail(email);
      if (!email || email.indexOf("@") === -1) {
        return { ok: false, reason: "invalid-email" };
      }
      var a = loadAuth();
      if (!a.accounts[email]) {
        return { ok: false, reason: "unknown-email" };
      }
      a.currentEmail = email;
      saveAuth(a);
      return { ok: true };
    },

    /**
     * Create a new account with profile fields; fails if email exists or is invalid.
     * @param {Object} profilePayload — same shape as stored profile (no feedPosts).
     * @returns {{ ok: boolean, reason?: string }}
     */
    registerAccount: function (email, profilePayload) {
      email = normalizeEmail(email);
      if (!email || email.indexOf("@") === -1) {
        return { ok: false, reason: "invalid-email" };
      }
      var a = loadAuth();
      if (a.accounts[email]) {
        return { ok: false, reason: "exists" };
      }
      var payload = profilePayload && typeof profilePayload === "object" ? profilePayload : {};
      var base = defaultProfileTemplate(payload.fullName || email.split("@")[0]);
      var next = Object.assign({}, base);
      var allowed = [
        "photoDataUrl",
        "fullName",
        "graduationYear",
        "titleCompany",
        "location",
        "headline",
        "about",
        "hsActivities",
        "collegeName",
        "collegeWebsite",
        "collegeDegrees",
        "collegeMajors",
        "collegeHonors",
      ];
      var i;
      for (i = 0; i < allowed.length; i++) {
        var k = allowed[i];
        if (payload[k] !== undefined && payload[k] !== null) {
          next[k] = payload[k];
        }
      }
      if (Array.isArray(payload.experienceLines)) {
        next.experienceLines = payload.experienceLines.slice();
      }
      if (Array.isArray(payload.skills)) {
        next.skills = payload.skills.slice();
      }
      next.feedPosts = [];
      a.accounts[email] = next;
      a.currentEmail = email;
      saveAuth(a);
      return { ok: true };
    },

    logout: function () {
      var a = loadAuth();
      a.currentEmail = null;
      saveAuth(a);
      window.location.replace("login.html");
    },

    /** Merge profile fields; keeps feedPosts. */
    saveProfileFields: function (fields) {
      var e = this.getCurrentEmail();
      if (!e) return;
      var a = loadAuth();
      var acc = Object.assign({}, a.accounts[e] || defaultProfileTemplate(e.split("@")[0]));
      var feedPosts = acc.feedPosts || [];
      var next = Object.assign({}, acc, fields);
      next.feedPosts = feedPosts;
      a.accounts[e] = next;
      saveAuth(a);
    },

    getFeedPosts: function () {
      var acc = this.getAccount();
      if (!acc || !Array.isArray(acc.feedPosts)) return [];
      return acc.feedPosts.slice();
    },

    setFeedPosts: function (list) {
      var e = this.getCurrentEmail();
      if (!e) return;
      var a = loadAuth();
      var acc = Object.assign({}, a.accounts[e] || defaultProfileTemplate(e.split("@")[0]));
      acc.feedPosts = Array.isArray(list) ? list.slice() : [];
      a.accounts[e] = acc;
      saveAuth(a);
    },
  };
})();
