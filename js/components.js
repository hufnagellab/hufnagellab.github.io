async function loadComponent(id, path) {
  const container = document.getElementById(id);

  if (!container) return;

  try {
    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }

    container.innerHTML = await response.text();

  } catch (error) {
    console.error(error);
  }
}

async function initializeComponents() {

  await Promise.all([
    loadComponent("site-header", "components/header.html"),
    loadComponent("site-footer", "components/footer.html")
  ]);

  // Highlight the current page
  const currentPage =
    window.location.pathname.split("/").pop() || "index.html";

  document.querySelectorAll(".site-header nav a").forEach(link => {
    const linkPage = link.getAttribute("href").split("#")[0];

    if (linkPage === currentPage) {
      link.classList.add("active");
    }
  });

  // Update copyright year
  const year = document.getElementById("footer-year");

  if (year) {
    year.textContent = new Date().getFullYear();
  }
}

initializeComponents();