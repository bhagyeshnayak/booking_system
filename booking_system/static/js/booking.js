document.addEventListener("DOMContentLoaded", function () {

    const bookBtn = document.querySelector(".book-btn");

    if (!bookBtn) return;

    bookBtn.addEventListener("click", function () {

        const token = localStorage.getItem("access_token");

        if (!token) {
            alert("Please login first");
            return;
        }

        const seats = document.querySelector("#seats").value || 1;

        const movieId = window.location.pathname.split("/")[2];

        fetch("/api/bookings/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                movie: movieId,
                seats: seats
            })
        })
        .then(res => res.json())
        .then(data => {

            console.log("Booking response:", data);

            if (data.booking_id) {

                alert("Booking created. Check OTP in terminal.");

            } else {

                alert("Booking failed");

            }

        })
        .catch(err => {
            console.error(err);
            alert("Booking error");
        });

    });

});