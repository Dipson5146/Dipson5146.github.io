// Animated text
const texts = ["Learner", "Coder", "Web Developer"];
let i = 0;
let j = 0;
let currentText = "";
let isDeleting = false;
const animatedText = document.getElementById("animated-text");

function typeEffect() {
  currentText = texts[i];
  if (isDeleting) {
    animatedText.textContent = currentText.substring(0, j--);
    if (j < 0) {
      isDeleting = false;
      i = (i + 1) % texts.length;
    }
  } else {
    animatedText.textContent = currentText.substring(0, j++);
    if (j > currentText.length) {
      isDeleting = true;
      setTimeout(typeEffect, 1000);
      return;
    }
  }
  setTimeout(typeEffect, 150);
}
typeEffect();

// Theme toggle with flip animation
function toggleTheme() {
  document.body.classList.toggle("dark");
  document.body.classList.toggle("light");
  document.body.style.transition = "transform 0.6s";
  document.body.style.transform = "rotateY(180deg)";
  setTimeout(() => document.body.style.transform = "rotateY(0)", 600);
}

// Reviews system
const reviewForm = document.getElementById("review-form");
const reviewList = document.getElementById("review-list");

reviewForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("review-input");
  const review = document.createElement("p");
  review.textContent = input.value;
  reviewList.appendChild(review);
  input.value = "";
});