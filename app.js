const API_BASE = "https://ib-system-consult-platform.onrender.com";

const $ = (s) => document.querySelector(s);

const toast = (message) => {
  const t = $("#toast");
  if (!t) return;

  t.textContent = message;
  t.classList.add("show");

  setTimeout(() => {
    t.classList.remove("show");
  }, 2800);
};

// Sidebar
const menuBtn = $("#menuBtn");
if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });
}

document.querySelectorAll(".nav-link").forEach((a) => {
  a.addEventListener("click", () => {
    $("#sidebar").classList.remove("open");
  });
});

// Open existing modals
document.querySelectorAll("[data-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const modal = $("#" + button.dataset.modal);
    if (modal) modal.classList.add("show");
  });
});

// Close modals
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    const modal = button.closest(".modal");
    if (modal) modal.classList.remove("show");
  });
});

document.querySelectorAll(".modal").forEach((modal) => {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("show");
    }
  });
});

// SERVICE REQUEST
document.querySelectorAll(".service-card").forEach((card) => {
  const button = card.querySelector("button");

  if (!button) return;

  button.addEventListener("click", () => {
    const service = card.dataset.service || "";

    const serviceInput = $("#contactService");
    if (serviceInput) {
      serviceInput.value = service;
    }

    const contactModal = $("#contactModal");

    if (contactModal) {
      contactModal.classList.add("show");
    } else {
      toast(`${service}: contact form is being prepared.`);
    }
  });
});

// CONTACT FORM → RENDER API → POSTGRESQL
const contactForm = $("#contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = $("#contactSubmit");

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    const data = {
      name: $("#contactName")?.value.trim(),
      phone: $("#contactPhone")?.value.trim(),
      email: $("#contactEmail")?.value.trim(),
      service: $("#contactService")?.value.trim(),
      message: $("#contactMessage")?.value.trim()
    };

    if (!data.name || !data.phone || !data.service || !data.message) {
      toast("Please complete all required fields.");

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Request";
      }

      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to submit request.");
      }

      toast("Request submitted successfully!");

      contactForm.reset();

      const modal = $("#contactModal");
      if (modal) {
        modal.classList.remove("show");
      }

    } catch (error) {
      console.error(error);
      toast("Unable to submit request. Please try again.");
    }

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Submit Request";
    }
  });
}

// FUNDING BUTTON
const fundBtn = $("#fundBtn");

if (fundBtn) {
  fundBtn.addEventListener("click", () => {
    const amount = Number($("#fundAmount")?.value);

    if (!amount || amount < 100) {
      toast("Enter an amount of at least ₦100.");
      return;
    }

    toast("Payment gateway will be connected later.");

    const fundModal = $("#fundModal");
    if (fundModal) {
      fundModal.classList.remove("show");
    }
  });
    }
