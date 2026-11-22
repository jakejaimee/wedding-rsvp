/* ==========================
   GOOGLE APPS SCRIPT API
========================== */

/* Requests go through our own HTTPS proxy first. It avoids ad-blocker /
   privacy filters that block script.google.com on some devices.

   If the proxy does not answer within PROXY_TIMEOUT_MS, or fails outright,
   the request falls back to calling the Apps Script directly (JSONP), so
   guests can still RSVP while the proxy server is down. */
const API_URL =
  "https://154-90-32-20.nip.io/jj/proxy.php";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbxuhshxNTc0bWdDXbVD-GjSpLuhD2PIWtXpJQKGxcLU004YX4GAI6OQL9ymkhM4qqcR/exec";

const PROXY_TIMEOUT_MS  = 8000;
const DIRECT_TIMEOUT_MS = 20000;

/* Once the proxy has failed on this page, skip it for the rest of the visit
   so the guest does not wait out the timeout twice (search, then submit). */
let proxyDown = false;


/* ==========================
   GLOBAL VARIABLES
========================== */

let currentGuest = null;
let reservedSeats = 1;
let lastResponse = null;

/* RSVP deadline used for the countdown on the search page */
const RSVP_DEADLINE = "2026-12-18";


/* ==========================
   PAGE NAVIGATION
========================== */

function showPage(pageId) {

  document
    .querySelectorAll(".page")
    .forEach(page => page.classList.remove("active"));

  const page = document.getElementById(pageId);

  if (page) {
    page.classList.add("active");
  }

}


function goHome() {

  const guestName = document.getElementById("guestName");
  const searchError = document.getElementById("searchError");
  const rsvpError = document.getElementById("rsvpError");

  if (guestName) guestName.value = "";
  if (searchError) searchError.innerHTML = "";
  if (rsvpError) rsvpError.innerHTML = "";

  currentGuest = null;
  reservedSeats = 1;

  showPage("searchPage");

}


/* ==========================
   LOADING
========================== */

function showLoading() {

  const loader =
    document.getElementById("loadingOverlay");

  if (loader) {
    loader.style.display = "flex";
  }

}


function hideLoading() {

  const loader =
    document.getElementById("loadingOverlay");

  if (loader) {
    loader.style.display = "none";
  }

}


/* ==========================
   API CALL (proxy first, direct fallback)
========================== */

function buildQuery(params) {

  return Object.keys(params)
    .map(function(key) {

      return (
        encodeURIComponent(key) +
        "=" +
        encodeURIComponent(params[key])
      );

    })
    .join("&");

}


function callAPI(params, successCallback) {

  const query = buildQuery(params);

  let finished = false;

  function finish(result) {

    if (finished) return;
    finished = true;
    successCallback(result);

  }

  function fail() {

    if (finished) return;
    finished = true;
    handleError({
      message: "Unable to connect to the RSVP server."
    });

  }


  /* Direct call to Apps Script.
     proxyTimedOut: the proxy may have forwarded this request before
     going quiet. For a submit, the sheet could then already hold this
     RSVP, and the retry would answer "already submitted". In that one
     case the RSVP is saved, so report success instead of an error. */

  function goDirect(proxyTimedOut) {

    callDirect(query, function(result) {

      if (
        proxyTimedOut &&
        params.api === "submitRSVP" &&
        result &&
        !result.success &&
        /already submitted/i.test(String(result.message || ""))
      ) {
        result = { success: true };
      }

      finish(result);

    }, fail);

  }


  if (proxyDown) {

    goDirect(false);
    return;

  }


  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;

  let timedOut = false;

  const timer = setTimeout(function() {

    timedOut = true;
    if (controller) controller.abort();

    proxyDown = true;
    goDirect(true);

  }, PROXY_TIMEOUT_MS);


  fetch(API_URL + "?" + query, {
    method: "GET",
    cache: "no-store",
    signal: controller ? controller.signal : undefined
  })

    .then(function(response) {

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      return response.json();

    })

    .then(function(result) {

      if (timedOut) return;
      clearTimeout(timer);
      finish(result);

    })

    .catch(function() {

      if (timedOut) return;
      clearTimeout(timer);

      proxyDown = true;
      goDirect(false);

    });

}


/* JSONP request straight to the Apps Script, with its own timeout. */

function callDirect(query, onResult, onFail) {

  const callbackName =
    "jsonpCallback_" +
    Date.now() +
    "_" +
    Math.floor(Math.random() * 100000);

  const script = document.createElement("script");

  let done = false;

  function cleanup() {

    clearTimeout(timer);

    /* Leave a no-op behind: a late reply must not throw. */
    window[callbackName] = function() {};

    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }

  }

  const timer = setTimeout(function() {

    if (done) return;
    done = true;
    cleanup();
    onFail();

  }, DIRECT_TIMEOUT_MS);


  window[callbackName] = function(result) {

    if (done) return;
    done = true;
    cleanup();
    onResult(result);

  };

  script.onerror = function() {

    if (done) return;
    done = true;
    cleanup();
    onFail();

  };

  script.src =
    GAS_URL +
    "?callback=" +
    encodeURIComponent(callbackName) +
    "&" +
    query;

  document.body.appendChild(script);

}


/* ==========================
   SEARCH GUEST
========================== */

function searchGuest() {

  const input =
    document.getElementById("guestName");

  const error =
    document.getElementById("searchError");


  const guestName =
    input.value.trim();


  error.innerHTML = "";


  if (!guestName) {

    error.innerHTML =
      "Please enter your full name.";

    return;

  }


  showLoading();


  callAPI(
    {
      api: "findGuest",
      name: guestName
    },
    handleGuestSearch
  );

}


/* ==========================
   HANDLE GUEST SEARCH
========================== */

function handleGuestSearch(result) {

  hideLoading();


  if (!result || !result.found) {

    document.getElementById("searchError")
      .innerHTML =
      "Sorry, we could not locate your invitation.";

    return;

  }


  if (
    String(result.submitted)
      .toUpperCase()
      .trim() === "YES"
  ) {

    showPage("duplicatePage");

    return;

  }


  currentGuest = result;


  reservedSeats =
    Number(result.seats) || 1;


  const sheetRow =
    document.getElementById("sheetRow");

  if (sheetRow) {
    sheetRow.value = result.row;
  }


  document.getElementById("displayGuestName")
    .innerHTML = result.name;


  document.getElementById("seatCount")
    .innerHTML = result.seats;


  generateGuestFields();


  showPage("rsvpPage");

}


/* ==========================
   CREATE GUEST FIELDS
========================== */

function generateGuestFields() {

  const container =
    document.getElementById("guestFields");


  if (!container) return;


  container.innerHTML = "";


  for (
    let i = 1;
    i <= reservedSeats;
    i++
  ) {

    const div =
      document.createElement("div");


    div.className = "guest-field";


    if (i === 1) {

      div.innerHTML = `
        <label>Guest 1</label>

        <input
          type="text"
          id="guest1"
          value="${escapeHTML(currentGuest.name)}"
          readonly>
      `;

    } else {

      div.innerHTML = `
        <label>Guest ${i}</label>

        <input
          type="text"
          id="guest${i}"
          placeholder="Enter guest name">
      `;

    }


    container.appendChild(div);

  }

}


/* ==========================
   SUBMIT RSVP
========================== */

function submitRSVP() {

  const attendance =
    document.getElementById("attendance")
      .value;


  const email =
    document.getElementById("email")
      .value
      .trim();


  const error =
    document.getElementById("rsvpError");


  error.innerHTML = "";


  if (!attendance) {

    error.innerHTML =
      "Please select your attendance.";

    return;

  }


  if (!email) {

    error.innerHTML =
      "Please enter your email address.";

    return;

  }


  if (!validateEmail(email)) {

    error.innerHTML =
      "Please enter a valid email address.";

    return;

  }


  const formData = {

    api: "submitRSVP",

    row:
      document.getElementById("sheetRow").value,

    name:
      currentGuest.name,

    attendance:
      attendance,

    email:
      email

  };


  const guestNames = [currentGuest.name];


  for (
    let i = 2;
    i <= reservedSeats;
    i++
  ) {

    const field =
      document.getElementById("guest" + i);


    if (!field || !field.value.trim()) {

      error.innerHTML =
        "Please complete all guest names.";

      return;

    }


    formData["guest" + i] =
      field.value.trim();

    guestNames.push(field.value.trim());

  }


  lastResponse = {
    attendance: attendance,
    guests: guestNames
  };


  showLoading();


  callAPI(
    formData,
    handleSubmission
  );

}


/* ==========================
   SUBMISSION RESULT
========================== */

function handleSubmission(response) {

  hideLoading();


  if (!response || !response.success) {

    document.getElementById("rsvpError")
      .innerHTML =
      response && response.message
        ? response.message
        : "Unable to submit RSVP.";

    return;

  }


  renderSuccessSummary();


  showPage("successPage");

}


/* ==========================
   SUCCESS SUMMARY
========================== */

function renderSuccessSummary() {

  if (!lastResponse) return;


  const guests = lastResponse.guests || [];

  const attending =
    String(lastResponse.attendance)
      .toUpperCase()
      .indexOf("ACCEPT") !== -1;


  const going = attending ? guests.length : 0;


  /* Headline count */

  const countEl =
    document.getElementById("successCount");

  if (countEl) {

    countEl.innerHTML =
      attending
        ? "Your RSVP has been recorded for <strong>" +
          going +
          "</strong> guest" +
          (going === 1 ? "" : "s") +
          "."
        : "Your RSVP has been recorded.";

  }


  /* Attending tally */

  const attendanceEl =
    document.getElementById("summaryAttendance");

  if (attendanceEl) {

    attendanceEl.innerHTML =
      attending
        ? "<strong>" + going + "</strong> Attending"
        : "Regretfully Declines";

  }


  /* Show the guest list only when attending */

  const toggle = function(id, show) {

    const el = document.getElementById(id);

    if (el) {
      el.style.display = show ? "" : "none";
    }

  };

  toggle("summaryDivider", attending);
  toggle("summaryGuestsTitle", attending);
  toggle("summaryFootnote", attending);


  /* Confirmed guest list */

  const guestsEl =
    document.getElementById("summaryGuests");

  if (guestsEl) {

    if (!attending) {

      guestsEl.innerHTML =
        '<p class="summary-declined">' +
        "We will miss you on our special day. " +
        "Thank you for letting us know." +
        "</p>";

    } else {

      guestsEl.innerHTML =
        guests
          .map(function(name) {

            return (
              "<p>" +
              '<span class="tick">&#10003;</span>' +
              "<span>" + escapeHTML(name) + "</span>" +
              "</p>"
            );

          })
          .join("");

    }

  }

}


/* ==========================
   RSVP COUNTDOWN
========================== */

function updateCountdown() {

  const el =
    document.getElementById("rsvpCountdown");

  if (!el) return;


  const now = new Date();

  const deadline = new Date(RSVP_DEADLINE + "T23:59:59");


  const msPerDay = 1000 * 60 * 60 * 24;

  const days =
    Math.ceil((deadline - now) / msPerDay);


  if (days > 1) {

    el.innerHTML =
      "RSVP CLOSES IN " + days + " DAYS";

  } else if (days === 1) {

    el.innerHTML =
      "RSVP CLOSES IN 1 DAY";

  } else if (days === 0) {

    el.innerHTML =
      "RSVP CLOSES TODAY";

  } else {

    el.innerHTML =
      "RSVP IS NOW CLOSED";

  }

}


/* ==========================
   EMAIL VALIDATION
========================== */

function validateEmail(email) {

  const regex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return regex.test(email);

}


/* ==========================
   HTML SAFETY
========================== */

function escapeHTML(text) {

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* ==========================
   GENERAL ERROR
========================== */

function handleError(error) {

  hideLoading();

  console.error(error);


  const searchError =
    document.getElementById("searchError");


  if (searchError) {

    searchError.innerHTML =
      "Something went wrong while connecting to the RSVP server. Please try again.";

  }

}


/* ==========================
   ENTER KEY SEARCH
========================== */

/* ==========================
   PAGE INITIALIZATION
========================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    // Hide loading screen when the website opens
    hideLoading();

    // Make sure the search page is visible
    showPage("searchPage");

    // Show the RSVP countdown
    updateCountdown();


    // Enable Enter key for guest search
    const input =
      document.getElementById("guestName");

    if (input) {

      input.addEventListener(
        "keypress",
        function(e) {

          if (e.key === "Enter") {

            searchGuest();

          }

        }
      );

    }

  }
);
