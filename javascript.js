/* =====================================================
   GOOGLE APPS SCRIPT BACKEND
===================================================== */

const API_URL =
  "https://script.google.com/macros/s/AKfycbxuhshxNTc0bWdDXbVD-GjSpLuhD2PIWtXpJQKGxcLU004YX4GAI6OQL9ymkhM4qqcR/exec";


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let currentGuest = null;
let reservedSeats = 1;


/* =====================================================
   PAGE NAVIGATION
===================================================== */

function showPage(pageId) {

  document
    .querySelectorAll(".page")
    .forEach(page =>
      page.classList.remove("active")
    );

  const page =
    document.getElementById(pageId);

  if (page) {
    page.classList.add("active");
  }

}


function goHome() {

  const guestName =
    document.getElementById("guestName");

  const searchError =
    document.getElementById("searchError");

  const rsvpError =
    document.getElementById("rsvpError");

  if (guestName) {
    guestName.value = "";
  }

  if (searchError) {
    searchError.innerHTML = "";
  }

  if (rsvpError) {
    rsvpError.innerHTML = "";
  }

  currentGuest = null;
  reservedSeats = 1;

  showPage("searchPage");

}


/* =====================================================
   LOADING
===================================================== */

function showLoading() {

  const overlay =
    document.getElementById("loadingOverlay");

  if (overlay) {
    overlay.style.display = "flex";
  }

}


function hideLoading() {

  const overlay =
    document.getElementById("loadingOverlay");

  if (overlay) {
    overlay.style.display = "none";
  }

}


/* =====================================================
   JSONP HELPER
===================================================== */

function callAPI(params, successCallback) {

  const callbackName =
    "jsonpCallback_" +
    Date.now() +
    "_" +
    Math.floor(Math.random() * 100000);


  params.callback = callbackName;


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


  window[callbackName] =
    function(response) {

      try {

        successCallback(response);

      } finally {

        delete window[callbackName];

        script.remove();

      }

    };


  script.src =
    API_URL + "?" + query;


  script.onerror =
    function() {

      delete window[callbackName];

      script.remove();

      hideLoading();

      handleError({
        message:
          "Unable to connect to the RSVP server."
      });

    };


  document.body.appendChild(script);

}


/* =====================================================
   SEARCH GUEST
===================================================== */

function searchGuest() {

  const input =
    document.getElementById("guestName");

  const guestName =
    input
      ? input.value.trim()
      : "";


  const error =
    document.getElementById("searchError");


  if (error) {
    error.innerHTML = "";
  }


  if (!guestName) {

    if (error) {

      error.innerHTML =
        "Please enter your full name.";

    }

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


/* =====================================================
   HANDLE SEARCH RESULT
===================================================== */

function handleGuestSearch(result) {

  hideLoading();


  if (!result || !result.found) {

    const error =
      document.getElementById("searchError");

    if (error) {

      error.innerHTML =
        "Sorry, we could not locate your invitation.";

    }

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


  const displayName =
    document.getElementById("displayGuestName");

  if (displayName) {
    displayName.innerHTML = result.name;
  }


  const seatCount =
    document.getElementById("seatCount");

  if (seatCount) {
    seatCount.innerHTML = result.seats;
  }


  generateGuestFields();


  showPage("rsvpPage");

}


/* =====================================================
   CREATE GUEST FIELDS
===================================================== */

function generateGuestFields() {

  const container =
    document.getElementById("guestFields");


  if (!container) {
    return;
  }


  container.innerHTML = "";


  // ==========================================
  // GUEST 1
  // ==========================================

  const guest1 =
    document.createElement("div");


  guest1.className =
    "guest-field";


  guest1.innerHTML = `

    <label>
      Guest 1
    </label>

    <input
      type="text"
      id="guest1"
      value="${escapeHTML(currentGuest.name)}"
      readonly>

  `;


  container.appendChild(guest1);


  // ==========================================
  // ADDITIONAL GUESTS
  // ==========================================

  for (
    let i = 2;
    i <= reservedSeats;
    i++
  ) {

    const div =
      document.createElement("div");


    div.className =
      "guest-field";


    div.innerHTML = `

      <label>
        Guest ${i}
      </label>

      <input
        type="text"
        id="guest${i}"
        placeholder="Enter guest name">

    `;


    container.appendChild(div);

  }

}


/* =====================================================
   HTML ESCAPE
===================================================== */

function escapeHTML(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


/* =====================================================
   SUBMIT RSVP
===================================================== */

function submitRSVP() {

  const attendanceElement =
    document.getElementById("attendance");


  const emailElement =
    document.getElementById("email");


  const error =
    document.getElementById("rsvpError");


  const attendance =
    attendanceElement
      ? attendanceElement.value
      : "";


  const email =
    emailElement
      ? emailElement.value.trim()
      : "";


  if (error) {
    error.innerHTML = "";
  }


  // ==========================================
  // ATTENDANCE VALIDATION
  // ==========================================

  if (!attendance) {

    if (error) {

      error.innerHTML =
        "Please select your attendance.";

    }

    return;

  }


  // ==========================================
  // EMAIL VALIDATION
  // ==========================================

  if (!email) {

    if (error) {

      error.innerHTML =
        "Please enter your email address.";

    }

    return;

  }


  if (!validateEmail(email)) {

    if (error) {

      error.innerHTML =
        "Please enter a valid email address.";

    }

    return;

  }


  // ==========================================
  // FORM DATA
  // ==========================================

  const rowElement =
    document.getElementById("sheetRow");


  const formData = {

    api: "submitRSVP",

    row:
      rowElement
        ? rowElement.value
        : "",

    name:
      currentGuest
        ? currentGuest.name
        : "",

    attendance:
      attendance,

    email:
      email

  };


  // ==========================================
  // GUEST 2
  // ==========================================

  if (reservedSeats >= 2) {

    const guest2Element =
      document.getElementById("guest2");


    const guest2 =
      guest2Element
        ? guest2Element.value.trim()
        : "";


    if (!guest2) {

      if (error) {

        error.innerHTML =
          "Please provide the reserved guest name.";

      }

      return;

    }


    formData.guest2 =
      guest2;

  }


  // ==========================================
  // GUEST 3
  // ==========================================

  if (reservedSeats >= 3) {

    const guest3Element =
      document.getElementById("guest3");


    const guest3 =
      guest3Element
        ? guest3Element.value.trim()
        : "";


    if (!guest3) {

      if (error) {

        error.innerHTML =
          "Please complete all guest names.";

      }

      return;

    }


    formData.guest3 =
      guest3;

  }


  // ==========================================
  // GUEST 4
  // ==========================================

  if (reservedSeats >= 4) {

    const guest4Element =
      document.getElementById("guest4");


    const guest4 =
      guest4Element
        ? guest4Element.value.trim()
        : "";


    if (!guest4) {

      if (error) {

        error.innerHTML =
          "Please complete all guest names.";

      }

      return;

    }


    formData.guest4 =
      guest4;

  }


  // ==========================================
  // GUEST 5
  // ==========================================

  if (reservedSeats >= 5) {

    const guest5Element =
      document.getElementById("guest5");


    const guest5 =
      guest5Element
        ? guest5Element.value.trim()
        : "";


    if (!guest5) {

      if (error) {

        error.innerHTML =
          "Please complete all guest names.";

      }

      return;

    }


    formData.guest5 =
      guest5;

  }


  // ==========================================
  // SUBMIT
  // ==========================================

  showLoading();


  callAPI(

    formData,

    handleSubmission

  );

}


/* =====================================================
   SUBMISSION RESULT
===================================================== */

function handleSubmission(response) {

  hideLoading();


  if (!response || !response.success) {

    const error =
      document.getElementById("rsvpError");


    if (error) {

      error.innerHTML =
        response && response.message
          ? response.message
          : "Unable to submit your RSVP.";

    }

    return;

  }


  showPage("successPage");

}


/* =====================================================
   EMAIL VALIDATION
===================================================== */

function validateEmail(email) {

  const regex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  return regex.test(email);

}


/* =====================================================
   GENERAL ERROR
===================================================== */

function handleError(error) {

  hideLoading();


  console.error(error);


  alert(
    "Something went wrong. Please try again."
  );

}


/* =====================================================
   ENTER KEY SEARCH
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

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
