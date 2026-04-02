/**
 * Shared profile form parsing (edit profile modal + sign-up).
 */
(function (global) {
  "use strict";

  var defaults = {
    photoDataUrl: null,
    fullName: "Sam Brackney",
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
  };

  function parseSkills(raw) {
    if (!raw || !String(raw).trim()) return [];
    return String(raw)
      .split(/[\n,]+/)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  function parseExperience(raw) {
    if (!raw || !String(raw).trim()) return [];
    return String(raw)
      .split("\n")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
  }

  /** Read the same named fields as the profile editor from any container element. */
  function readTextFields(root) {
    if (!root) return null;
    function q(name) {
      return root.querySelector('[name="' + name + '"]');
    }
    function val(name) {
      var el = q(name);
      return el ? el.value : "";
    }

    var fullName = val("fullName").trim();
    var graduationYear = val("graduationYear").trim();
    var titleCompany = val("titleCompany").trim();
    var location = val("location").trim();
    var headline = val("headline").trim();
    var about = val("about").trim();
    var hsActivities = val("hsActivities").replace(/\r/g, "").trim();
    var collegeName = val("collegeName").trim();
    var collegeWebsite = val("collegeWebsite").trim();
    var collegeDegrees = val("collegeDegrees").trim();
    var collegeMajors = val("collegeMajors").trim();
    var collegeHonors = val("collegeHonors").trim();
    var experienceLines = parseExperience(val("experience"));
    var skills = parseSkills(val("skills"));

    return {
      fullName: fullName || defaults.fullName,
      graduationYear: graduationYear || defaults.graduationYear,
      titleCompany: titleCompany || defaults.titleCompany,
      location: location || defaults.location,
      headline: headline || defaults.headline,
      about: about || defaults.about,
      hsActivities: hsActivities,
      collegeName: collegeName,
      collegeWebsite: collegeWebsite,
      collegeDegrees: collegeDegrees,
      collegeMajors: collegeMajors,
      collegeHonors: collegeHonors,
      experienceLines: experienceLines.length ? experienceLines : defaults.experienceLines.slice(),
      skills: skills.length ? skills : defaults.skills.slice(),
    };
  }

  global.CentralProfileForm = {
    defaults: defaults,
    parseSkills: parseSkills,
    parseExperience: parseExperience,
    readTextFields: readTextFields,
  };
})(window);
