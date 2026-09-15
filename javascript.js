/* ==========================
   GOOGLE APPS SCRIPT API
========================== */

const API_URL =
  "https://script.google.com/macros/s/AKfycbxuhshxNTc0bWdDXbVD-GjSpLuhD2PIWtXpJQKGxcLU004YX4GAI6OQL9ymkhM4qqcR/exec";


/* ==========================
   GLOBAL VARIABLES
========================== */

let currentGuest = null;
let reservedSeats = 1;
let lastResponse = null;

/* RSVP deadline used for the countdown on the search page */
const RSVP_DEADLINE = "2026-11-28";


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
   JSONP API CALL
========================== */

function callAPI(params, successCallback) {

  const callbackName =
    "jsonpCallback_" +
    Date.now() +
    "_" +
    Math.floor(Math.random() * 100000);


  window[callbackName] = function(result) {

    try {

      successCallback(result);

    } finally {

      delete window[callbackName];

      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }

    }

  };


  const query =
    Object.keys(params)
      .map(function(key) {

        return (
          encodeURIComponent(key) +
          "=" +
          encodeURIComponent(params[key])
        );

      })
      .join("&");


  const script =
    document.createElement("script");


  script.src =
    API_URL +
    "?callback=" +
    encodeURIComponent(callbackName) +
    "&" +
    query;


  script.onerror = function() {

    delete window[callbackName];

    if (script.parentNode) {
      script.parentNode.removeChild(script);
    }

    handleError({
      message: "Unable to connect to the RSVP server."
    });

  };


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
