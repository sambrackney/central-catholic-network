(function () {
  "use strict";

  if (!window.CentralAuth || !window.CentralProfileForm) {
    return;
  }

  if (CentralAuth.getCurrentEmail()) {
    window.location.replace("index.html");
    return;
  }

  var signupRoot = document.getElementById("signup-profile-fields");
  var tabSignin = document.getElementById("login-tab-signin");
  var tabSignup = document.getElementById("login-tab-signup");
  var panelSignin = document.getElementById("login-panel-signin");
  var panelSignup = document.getElementById("login-panel-signup");
  var signupForm = document.getElementById("signup-form");
  var loginForm = document.getElementById("login-form");

  if (!tabSignin || !tabSignup || !panelSignin || !panelSignup || !signupForm || !loginForm || !signupRoot) {
    return;
  }

  function activateTab(which) {
    var isIn = which === "signin";
    tabSignin.setAttribute("aria-selected", isIn ? "true" : "false");
    tabSignup.setAttribute("aria-selected", isIn ? "false" : "true");
    tabSignin.tabIndex = isIn ? 0 : -1;
    tabSignup.tabIndex = isIn ? -1 : 0;
    panelSignin.hidden = !isIn;
    panelSignup.hidden = isIn;
  }

  tabSignin.addEventListener("click", function () {
    activateTab("signin");
    tabSignin.focus();
  });

  tabSignup.addEventListener("click", function () {
    activateTab("signup");
    tabSignup.focus();
  });

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = document.getElementById("login-email").value;
    var r = CentralAuth.signInExisting(email);
    if (!r.ok) {
      if (r.reason === "invalid-email") {
        alert("Please enter a valid email address.");
      } else {
        alert("No account found for this email. Use “Create account” to register first.");
      }
      return;
    }
    window.location.replace("index.html");
  });

  var fileInput = signupForm.querySelector('[name="photo"]');
  var preview = document.getElementById("su-photo-preview");
  var clearCheck = signupForm.querySelector('[name="clearPhoto"]');

  if (fileInput && preview && clearCheck) {
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file || !file.type.match(/^image\//)) return;
      var reader = new FileReader();
      reader.onload = function () {
        preview.src = reader.result;
        preview.hidden = false;
        clearCheck.checked = false;
      };
      reader.readAsDataURL(file);
    });

    clearCheck.addEventListener("change", function () {
      if (this.checked) {
        fileInput.value = "";
        preview.removeAttribute("src");
        preview.hidden = true;
      }
    });
  }

  signupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var emailEl = document.getElementById("signup-email");
    var email = emailEl.value;
    var norm = CentralAuth.normalizeEmail(email);
    if (!norm || norm.indexOf("@") === -1) {
      alert("Please enter a valid email address.");
      emailEl.focus();
      return;
    }
    if (CentralAuth.accountExists(email)) {
      alert("An account already exists for this email. Use the Sign in tab.");
      activateTab("signin");
      document.getElementById("login-email").value = email;
      document.getElementById("login-email").focus();
      return;
    }

    function commit(photoDataUrl) {
      var text = CentralProfileForm.readTextFields(signupRoot);
      if (!text) {
        alert("Something went wrong reading the form. Please try again.");
        return;
      }
      var payload = Object.assign({}, text, { photoDataUrl: photoDataUrl });
      var r = CentralAuth.registerAccount(email, payload);
      if (!r.ok) {
        if (r.reason === "exists") {
          alert("An account already exists for this email. Sign in instead.");
        } else {
          alert("Could not create account. Check your email address.");
        }
        return;
      }
      window.location.replace("index.html");
    }

    if (clearCheck && clearCheck.checked) {
      commit(null);
      return;
    }
    var file = fileInput && fileInput.files && fileInput.files[0];
    if (file && file.type.match(/^image\//)) {
      var reader = new FileReader();
      reader.onload = function () {
        commit(reader.result);
      };
      reader.readAsDataURL(file);
      return;
    }
    commit(null);
  });
})();
