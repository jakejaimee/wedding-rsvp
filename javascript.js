/* =====================================================
   JAKE & JAIMEE WEDDING RSVP
   GITHUB PAGES JAVASCRIPT
===================================================== */


/* =====================================================
   APPS SCRIPT BACKEND URL
===================================================== */

const API_URL =
    "https://script.google.com/macros/s/AKfycbz579mMsSMbrv6wUKuA4CC5cPTxGaePn4Ql28r0YtwD1TUY9pbh__hulA_THz2SDGHn/exec";


/* =====================================================
   GLOBAL VARIABLES
===================================================== */

let currentGuest = null;
let reservedSeats = 1;


/* =====================================================
   JSONP REQUEST
===================================================== */

function apiRequest(params, successCallback) {

    const callbackName =
        "jsonpCallback_" +
        Date.now() +
        "_" +
        Math.floor(Math.random() * 100000);


    window[callbackName] = function(data) {

        try {

            successCallback(data);

        } finally {

            delete window[callbackName];

            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }

        }

    };


    const query =
        new URLSearchParams({
            ...params,
            callback: callbackName
        });


    const script =
        document.createElement("script");


    script.src =
        API_URL + "?" + query.toString();


    script.onerror = function() {

        delete window[callbackName];

        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }

        handleError(
            new Error("Unable to connect to the RSVP server.")
        );

    };


    document.body.appendChild(script);

}


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


/* =====================================================
   RETURN HOME
===================================================== */

function goHome() {

    document.getElementById("guestName").value = "";

    document.getElementById("searchError").innerHTML = "";

    document.getElementById("rsvpError").innerHTML = "";

    document.getElementById("attendance").value = "";

    document.getElementById("email").value = "";

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
   SEARCH GUEST
===================================================== */

function searchGuest() {

    const guestName =
        document
            .getElementById("guestName")
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


    apiRequest(
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


    if (!result) {

        handleError(
            new Error("No response received.")
        );

        return;

    }


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
        Number(result.seats) || 1;


    document.getElementById("sheetRow")
        .value = result.row;


    document.getElementById("displayGuestName")
        .innerHTML =
        escapeHtml(result.name);


    document.getElementById("seatCount")
        .innerHTML =
        reservedSeats;


    generateGuestFields();


    showPage("rsvpPage");

}


/* =====================================================
   CREATE COMPANION FIELDS
===================================================== */

function generateGuestFields() {

    const container =
        document.getElementById("guestFields");


    container.innerHTML = "";


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
   SUBMIT RSVP
===================================================== */

function submitRSVP() {

    const attendance =
        document
            .getElementById("attendance")
            .value;


    const email =
        document
            .getElementById("email")
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


    if (!currentGuest) {

        document.getElementById("rsvpError")
            .innerHTML =
            "Please search for your invitation again.";

        return;

    }


    const formData = {

        api: "submitRSVP",

        row:
            document
                .getElementById("sheetRow")
                .value,

        name:
            currentGuest.name,

        attendance:
            attendance,

        email:
            email

    };


    /* ==========================
       GUEST 2
    ========================== */

    if (reservedSeats >= 2) {

        const guest2 =
            document
                .getElementById("guest2")
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


    /* ==========================
       GUEST 3
    ========================== */

    if (reservedSeats >= 3) {

        const guest3 =
            document
                .getElementById("guest3")
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


    /* ==========================
       GUEST 4
    ========================== */

    if (reservedSeats >= 4) {

        const guest4 =
            document
                .getElementById("guest4")
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


    /* ==========================
       GUEST 5
    ========================== */

    if (reservedSeats >= 5) {

        const guest5 =
            document
                .getElementById("guest5")
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


    apiRequest(
        formData,
        handleSubmission
    );

}


/* =====================================================
   SUBMISSION RESULT
===================================================== */

function handleSubmission(response) {

    hideLoading();


    if (!response) {

        handleError(
            new Error("No response received.")
        );

        return;

    }


    if (!response.success) {

        document.getElementById("rsvpError")
            .innerHTML =
            response.message ||
            "Unable to submit your RSVP.";

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
   HTML ESCAPING
===================================================== */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

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
