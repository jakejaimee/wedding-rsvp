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

  if (guestName) {
    guestName.value = "";
  }

  document.getElementById("searchError").innerHTML = "";
  document.getElementById("rsvpError").innerHTML = "";

  currentGuest = null;
  reservedSeats = 1;

  showPage("searchPage");
}


/* ==========================
   LOADING
========================== */

function showLoading() {

  document.getElementById("loadingOverlay")
    .style.display = "flex";

}


function hideLoading() {

  document.getElementById("loadingOverlay")
    .style.display = "none";

}


/* ==========================
   SEARCH GUEST
========================== */

function searchGuest() {

  const guestName =
    document.getElementById("guestName")
      .value
      .trim();

  document.getElementById("searchError")
    .innerHTML = "";

  if (!guestName) {

    document.getElementById("searchError")
      .innerHTML =
      "Please enter your full name.";

    return;
  }

  showLoading();


  const url =
    API_URL +
    "?api=findGuest" +
    "&name=" +
    encodeURIComponent(guestName) +
    "&callback=handleGuestSearch";


  const script =
    document.createElement("script");

  script.src = url;

  script.onerror = function() {

    hideLoading();

    handleError({
      message: "Unable to connect to the RSVP server."
    });

  };

  document.body.appendChild(script);

}


/* ==========================
   HANDLE GUEST SEARCH
========================== */

function handleGuestSearch(result) {

  hideLoading();


  if (!result.found) {

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
    Number(result.seats);


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
   CREATE COMPANION FIELDS
========================== */

function generateGuestFields() {

  const container =
    document.getElementById("guestFields");

  container.innerHTML = "";


  const guest1 =
    document.createElement("div");

  guest1.className = "guest-field";

  guest1.innerHTML = `
    <label>Guest 1</label>

    <input
      type="text"
      id="guest1"
      value="${escapeHtml(currentGuest.name)}"
      readonly>
  `;

  container.appendChild(guest1);


  for (
    let i = 2;
    i <= reservedSeats;
    i++
  ) {

    const div =
      document.createElement("div");

    div.className = "guest-field";

    div.innerHTML = `
      <label>Guest ${i}</label>

      <input
        type="text"
        id="guest${i}"
        placeholder="Enter guest name">
    `;

    container.appendChild(div);

  }

}


/* ==========================
   HTML ESCAPE
========================== */

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

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


  document.getElementById("rsvpError")
    .innerHTML = "";


  if (!attendance) {

    document.getElementById("rsvpError")
      .innerHTML =
      "Please select your attendance.";

    return;
  }


  if (!email) {

    document.getElementById("rsvpError")
      .innerHTML =
      "Please enter your email address.";

    return;
  }


  if (!validateEmail(email)) {

    document.getElementById("rsvpError")
      .innerHTML =
      "Please enter a valid email address.";

    return;
  }


  const formData = {

    row:
      document.getElementById("sheetRow").value,

    name:
      currentGuest.name,

    attendance:
      attendance,

    email:
      email
  };


  if (reservedSeats >= 2) {

    const guest2 =
      document.getElementById("guest2")
        ?.value
        .trim();


    if (!guest2) {

      document.getElementById("rsvpError")
        .innerHTML =
        "Please provide the reserved guest name.";

      return;
    }

    formData.guest2 = guest2;

  }


  if (reservedSeats >= 3) {

    const guest3 =
      document.getElementById("guest3")
        ?.value
        .trim();


    if (!guest3) {

      document.getElementById("rsvpError")
        .innerHTML =
        "Please complete all guest names.";

      return;
    }

    formData.guest3 = guest3;

  }


  if (reservedSeats >= 4) {

    const guest4 =
      document.getElementById("guest4")
        ?.value
        .trim();


    if (!guest4) {

      document.getElementById("rsvpError")
        .innerHTML =
        "Please complete all guest names.";

      return;
    }

    formData.guest4 = guest4;

  }


  if (reservedSeats >= 5) {

    const guest5 =
      document.getElementById("guest5")
        ?.value
        .trim();


    if (!guest5) {

      document.getElementById("rsvpError")
        .innerHTML =
        "Please complete all guest names.";

      return;
    }

    formData.guest5 = guest5;

  }


  showLoading();


  const params = new URLSearchParams();

  params.append("api", "submitRSVP");
  params.append("callback", "handleSubmission");

  params.append(
    "row",
    formData.row
  );

  params.append(
    "name",
    formData.name
  );

  params.append(
    "attendance",
    formData.attendance
  );

  params.append(
    "email",
    formData.email
  );

  params.append(
    "guest2",
    formData.guest2 || ""
  );

  params.append(
    "guest3",
    formData.guest3 || ""
  );

  params.append(
    "guest4",
    formData.guest4 || ""
  );

  params.append(
    "guest5",
    formData.guest5 || ""
  );


  const script =
    document.createElement("script");

  script.src =
    API_URL + "?" + params.toString();


  script.onerror = function() {

    hideLoading();

    handleError({
      message:
        "Unable to submit RSVP."
    });

  };


  document.body.appendChild(script);

}


/* ==========================
   SUBMISSION RESULT
========================== */

function handleSubmission(response) {

  hideLoading();


  if (!response.success) {

    document.getElementById("rsvpError")
      .innerHTML =
      response.message;

    return;
  }


  showPage("successPage");

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
   GENERAL ERROR
========================== */

function handleError(error) {

  hideLoading();

  console.error(error);

  alert(
    "Something went wrong. Please try again."
  );

}


/* ==========================
   ENTER KEY SEARCH
========================== */

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
